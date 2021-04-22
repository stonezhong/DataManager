#!/usr/bin/env python
# -*- coding: UTF-8 -*-

import logging, logging.config
from config import get_mordor_config_json_template, get_log_path
import DataCatalog.logging_helper as logging_helper

# initializing the logging MUST come before import any other modules
config = get_mordor_config_json_template(
    "scheduler.json",
    context={
        "log_dir": get_log_path(),
    }
)
if not logging_helper.logging_initialized:
    logging_helper.logging_initialized = True
    logging.config.dictConfig(config['log_config'])
logger = logging.getLogger(__name__)

import json
import jinja2
import time
from datetime import datetime, timedelta
import pytz
from jinja2 import Template

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'DataCatalog.settings')
django.setup()

# from django.db.models import Q
from django.db import transaction
from main.models import PipelineInstance, Dataset, Asset, \
    Pipeline, PipelineInstance, PipelineGroup, Timer
import explorer.airflow_lib as airflow_lib

################################################################################
# (1) Scans dag runs and update their status periodically
# (2) Create time based pipeline group creation
# (3) trigger
################################################################################

def is_dataset_instance_ready(tenant, di_path):
    # di_path is in format: name:major_version:minor_version/path
    # example: trading_version:1.0:1:/2020-09-23
    di_path_segs = di_path.split(":")
    if len(di_path_segs) != 4: # not a valid format
        logger.error(f"is_dataset_instance_ready('{di_path}'): No, asset path {di_path} is invalid")
        return False

    dataset_name, major_version, minor_version, path = di_path_segs
    try:
        minor_version = int(minor_version)
    except ValueError:
        logger.error(f"is_dataset_instance_ready('{di_path}'), No, asset path {di_path} is invalid, minor version MUST be integer")
        return False

    dss = Dataset.objects.filter(
        name=dataset_name,
        major_version=major_version, minor_version=minor_version,
        tenant=tenant
    )
    if len(dss) == 0:
        logger.info(f"is_dataset_instance_ready('{di_path}'): No, dataset {dataset_name}:{major_version}:{minor_version} does not exist")
        return False
    elif len(dss) > 1:
        raise Exception("Possible data corruption: got more than 1 dataset: name={dataset_name}, major_version={major_version}, minor_version={minor_version}, ids=({dss[0].id}, {dss[1].id})")

    ds = dss[0]

    # ignore the deleted instance
    diss = Asset.objects.filter(
        path=path, dataset=ds, deleted_time=None,
        tenant=tenant
    )

    if len(diss) == 0:
        logger.info(f"is_dataset_instance_ready('{di_path}'): No")
        return False
    elif len(diss) == 1:
        logger.info(f"is_dataset_instance_ready('{di_path}'): Yes, asset id = {diss[0].id}")
        return True
    else:
        raise Exception("Possible data corruption: got more than 1 asset: name={dataset_name}, major_version={major_version}, minor_version={minor_version}, path={path}, ids=({diss[0].id}, {diss[1].id})")


# We will trigger a pipeline instance when
# (1) The pipeline it belongs to is not paused
# (2) The pipeline group it associated is not finished
# (3) The required dataset instance it depend on are all present
# This function should not fail, it can log error instead
@transaction.atomic
def handle_pipeline_instance_created(pi):
    logger.info(f"handle_pipeline_instance_created: enter, pi={pi.id}")

    group_ctx = json.loads(pi.group.context)
    pipeline_ctx = json.loads(pi.pipeline.context)
    start_offset = pipeline_ctx.get("startOffset", 0)

    pi_prior = pi.get_prior_instance()
    if pi_prior and pi_prior.status != PipelineInstance.FINISHED_STATUS:
        logger.info("skip: prior instance is not finished")
        logger.info(f"handle_pipeline_instance_created: exit")
        return

    now = datetime.utcnow().replace(tzinfo=pytz.UTC)
    earliest_start_time = pi.group.due + timedelta(minutes=start_offset)
    if earliest_start_time > now:
        logger.info(f"skip: too early to run the pipeline, due={pi.group.due}, start_offset={start_offset} minute, earliest start: {earliest_start_time}, now: {now}")
        logger.info(f"handle_pipeline_instance_created: exit")
        return


    ready = True
    for rdit in pipeline_ctx.get('requiredDSIs', []):
        tmp = jinja2.Template(rdit)
        di_path = tmp.render(**group_ctx)
        if not is_dataset_instance_ready(pi.tenant, di_path):
            logger.info(f"skip: asset {di_path} is not ready!")
            ready = False
            break
        else:
            logger.info(f"asset {di_path} is ready!")

    if not ready:
        logger.info(f"handle_pipeline_instance_created: exit")
        return

    # we need to generate a DM access token
    token = AccessToken(
        pi.pipeline.author,
        timedelta(days=1),
        AccessToken.Purpose.API_TOKEN,
        tenant=pi.tenant
    )

    logger.info("ALL required assets are ready!!")
    logger.info(f"triggering DAG {pi.pipeline.name}")
    pipeline_instance_id = str(pi.id).replace("-", "")
    pipeline_id = str(pi.pipeline.id).replace("-", "")
    tenant_id = pi.tenant.id
    r = airflow_lib.trigger_dag(
        f"{pi.pipeline.name}.{pipeline_id}",
        {
            "pipeline_instance_id": pipeline_instance_id,
            "tenant_id": tenant_id,
            "dm_username": pi.pipeline.author.username,
            "dm_token": token
        }
    )

    ctx = json.loads(pi.context)
    pi.status = PipelineInstance.STARTED_STATUS
    ctx['dag_run'] = r
    pi.context = json.dumps(ctx)
    pi.save()
    logger.info(f"handle_pipeline_instance_created: exit")


def event_handler(scheduled_event):
    logger.info(f"event_handler: enter, scheduled_event = (id:{scheduled_event.id}, due:{scheduled_event.due}, topic:{scheduled_event.topic}, category:{scheduled_event.category}, context:{scheduled_event.context})")

    # Update scheduled_event context
    # when scheduled_event is created, it's timer's context has been copied to the
    # context field
    template = Template(scheduled_event.context)
    rendered_content = template.render({
        "due": scheduled_event.due
    })
    scheduled_event.context = rendered_content
    scheduled_event.acked = True
    scheduled_event.save()

    now = datetime.utcnow().replace(tzinfo=pytz.UTC)
    # create pipeline group
    pg = PipelineGroup(
        tenant=scheduled_event.tenant,
        name=f'{scheduled_event.timer.name}/{scheduled_event.due.strftime("%Y-%m-%d %H:%M:%S")}',
        created_time = now,
        category=scheduled_event.category,
        context=scheduled_event.context,
        finished=False,
        due = scheduled_event.due,
    )
    pg.save()
    logger.info(f"PipelineGroup (id={pg.id}) is created")

    # Attach pipeline to it
    for pipeline in Pipeline.objects.filter(
        category=scheduled_event.category,
        retired=False,
        tenant=scheduled_event.tenant
    ):
        # yes, we will attach paused pipeline, but they won't trigger
        # until the pipeline is unpaused
        pipeline_instance = PipelineInstance(
            tenant=scheduled_event.tenant,
            pipeline=pipeline,
            group = pg,
            context = "{}", # placeholder
            status = PipelineInstance.CREATED_STATUS,
            created_time = now
        )
        pipeline_instance.save()
        logger.info(f"attaching pipeline(id={pipeline.id}, name={pipeline.name}), pipeline_instance is {pipeline_instance.id}")
    logger.info(f"event_handler: exit")


########################################################################################
# Purpose
#   Scan all timers and create new scheduled event if needed
########################################################################################
@transaction.atomic
def create_pipeline_group_from_timers():
    Timer.produce_next_due('pipeline', event_handler)

########################################################################################
# Purpose
#   Scan all pipeline instances
#   for pi in "created" status, check if we can launch it
########################################################################################
def handle_pipeline_instances_created():
    for pi in PipelineInstance.objects.select_related("pipeline").filter(
        pipeline__paused=False,
        status=PipelineInstance.CREATED_STATUS
    ):
        handle_pipeline_instance_created(pi)

########################################################################################
# Purpose
#   If an pending pipeline has a new pipeline instance, attach it
#   If an pending pipeline's all pipeline instance are finished, mark it as finished
########################################################################################
@transaction.atomic
def update_pending_pipeline_group(pg):
    logger.info(f"update_pending_pipeline_group: enter, pg={pg.id}")
    # pg is an unfinished pipeline group
    pipeline_ids = set()
    for pi in PipelineInstance.objects.filter(group=pg):
        pipeline_ids.add(pi.pipeline.id)

    # Let's attach those pipeline created after we created pipeline group
    # which match the category
    now = datetime.utcnow().replace(tzinfo=pytz.UTC)
    for pipeline in Pipeline.objects.filter(
        category=pg.category
    ).filter(retired=False, tenant=pg.tenant):
        if pipeline.id in pipeline_ids:
            # skip since the pg already has this pipeline
            continue
        pipeline_instance = PipelineInstance(
            tenant_id = pg.tenant_id,
            pipeline = pipeline,
            group = pg,
            context = "{}", # placeholder
            status = PipelineInstance.CREATED_STATUS,
            created_time = now
        )
        pipeline_instance.save()
        logger.info(f"attaching pipeline(id={pipeline.id}, name={pipeline.name}), pipeline_instance is {pipeline_instance.id}")

    for pi in PipelineInstance.objects.filter(group=pg):
        if pi.status in (
            PipelineInstance.CREATED_STATUS,
            PipelineInstance.STARTED_STATUS,
            PipelineInstance.FAILED_STATUS,
        ):
            logger.info(f"Found pipeline instance({pi.id}) is not finished")
            logger.info(f"update_pending_pipeline_group: exit")
            return

    pg.finished = True
    pg.save()
    logger.info(f"All pipeline instance in this group is finished, set the pipeline group to finished")
    logger.info(f"update_pending_pipeline_group: exit")

def update_pending_pipeline_groups():
    for pg in PipelineGroup.objects.filter(finished=False):
        update_pending_pipeline_group(pg)

########################################################################################
# Purpose
#   (1) For pending Airflow DAG run, sync it's status to db
#   (2) Trigger a pipeline instance when needed
#   (3) Create pipeline group when needed
########################################################################################
def main():
    logger.info(f"scheduler started")
    try:
        while True:
            create_pipeline_group_from_timers()
            handle_pipeline_instances_created()
            update_pending_pipeline_groups()
            time.sleep(5)
    except KeyboardInterrupt:
        logger.info(f"scheduler stopped gracefully")



if __name__ == '__main__':
    main()
