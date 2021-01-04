#!/usr/bin/env python
# -*- coding: UTF-8 -*-

import logging, logging.config
from config import get_mordor_config_json_template, get_log_path

# initializing the logging MUST come before import any other modules
config = get_mordor_config_json_template(
    "scheduler.json",
    context={
        "log_dir": get_log_path(),
    }
)
# TODO: how to avoid 2nd initializing of logging in settings.py?
logging.config.dictConfig(config['log_config'])
logger = logging.getLogger(__name__)

import json
import jinja2
import time
from datetime import datetime
import pytz
from jinja2 import Template

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'DataCatalog.settings')
django.setup()

# from django.db.models import Q
from django.db import transaction
from main.models import PipelineInstance, Dataset, DatasetInstance, \
    Pipeline, PipelineInstance, PipelineGroup, Timer
import explorer.airflow_lib as airflow_lib

################################################################################
# (1) Scans dag runs and update their status periodically
# (2) Create time based pipeline group creation
# (3) trigger
################################################################################

def is_dataset_instance_ready(di_path):
    # di_path is in format: name:major_version:minor_version/path
    # example: trading_version:1.0:1:/2020-09-23
    dataset_name, major_version, minor_version, path = di_path.split(":")

    try:
        minor_version = int(minor_version)
    except ValueError:
        raise Exception(f"{di_path} is not a valid dataset instance path")

    dss = Dataset.objects.filter(name=dataset_name, major_version=major_version, minor_version=minor_version)
    if len(dss) == 0:
        return False
    elif len(dss) > 1:
        raise Exception("Something went wrong")

    ds = dss[0]

    # ignore the deleted instance
    diss = DatasetInstance.objects.filter(path=path, deleted_time=None)

    if len(diss) == 0:
        return False
    elif len(diss) == 1:
        return True
    else:
        raise Exception("Something went wrong")


# We will trigger a pipeline instance when
# (1) The pipeline it belongs to is not paused
# (2) The pipeline group it associated is not finished
# (3) The required dataset instance it depend on are all present
# This function should not fail, it can log error instead
@transaction.atomic
def handle_pipeline_instance_created(pi):
    print(f"handle pipeline {pi.id} in created status")
    group_ctx = json.loads(pi.group.context)
    pipeline_ctx = json.loads(pi.pipeline.context)

    if pi.pipeline.paused:
        print("Pipeline is paused, so skip for now")
        print("")
        return

    pi_prior = pi.get_prior_instance()
    if pi_prior and pi_prior.status != PipelineInstance.FINISHED_STATUS:
        print("Pipeline's prior instance is not finished, so skip for now")
        print("")
        return

    ready = True
    for rdit in pipeline_ctx.get('requiredDSIs', []):
        tmp = jinja2.Template(rdit)
        di_path = tmp.render(**group_ctx)
        if not is_dataset_instance_ready(di_path):
            print(f"dataset {di_path} is not ready!")
            ready = False
            break
        else:
            print(f"dataset {di_path} is ready!")

    if not ready:
        print("Not ready, skip pipeline instance!!")
        print("")
        return

    print("ALL required assets are ready!!")
    print(f"triggering DAG {pi.pipeline.name}")
    pipeline_instance_id = str(pi.id).replace("-", "")
    pipeline_id = str(pi.pipeline.id).replace("-", "")
    r = airflow_lib.trigger_dag(
        f"{pi.pipeline.name}.{pipeline_id}",
        {
            "pipeline_instance_id": pipeline_instance_id
        }
    )

    ctx = json.loads(pi.context)
    pi.status = PipelineInstance.STARTED_STATUS
    ctx['dag_run'] = r
    pi.context = json.dumps(ctx)
    pi.save()
    print("")


def event_handler(scheduled_event):
    logger.info("A ScheduledEvent is created!")

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
        name=f'{scheduled_event.timer.name}/{scheduled_event.due.strftime("%Y-%m-%d %H:%M:%S")}',
        created_time = now,
        category=scheduled_event.category,
        context=scheduled_event.context,
        finished=False,
        manual=False,
        due = scheduled_event.due,
    )
    pg.save()

    # Attach pipeline to it
    for pipeline in Pipeline.objects.filter(
        category=scheduled_event.category
    ).filter(retired=False):
        # yes, we will attach paused pipeline, but they won't trigger
        # until the pipeline is unpaused
        pipeline_instance = PipelineInstance(
            pipeline = pipeline,
            group = pg,
            context = "{}", # placeholder
            status = PipelineInstance.CREATED_STATUS,
            created_time = now,
        )
        pipeline_instance.save()




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
#   (1) for pi in "created" status, check if we can launch it
#   (2) for po in "started" status, check if we can move it to "finished" or "failed" status
########################################################################################
def update_pipeline_instances():
    for pi in PipelineInstance.objects.filter(status=PipelineInstance.CREATED_STATUS):
        handle_pipeline_instance_created(pi)

########################################################################################
# Purpose
#   Set a pipeline group into finished status if all pipeline instances are finished
########################################################################################
@transaction.atomic
def finish_pipeline_group(pg):
    for pi in PipelineInstance.objects.filter(group=pg):
        if pi.status in (
            PipelineInstance.CREATED_STATUS,
            PipelineInstance.STARTED_STATUS,
            PipelineInstance.FAILED_STATUS,
        ):
            return
        pg.finished = True
        pg.save()

def finish_pipeline_groups():
    for pg in PipelineGroup.objects.filter(finished=False).filter(manual=False):
        finish_pipeline_group(pg)

########################################################################################
# Purpose
#   (1) For pending Airflow DAG run, sync it's status to db
#   (2) Trigger a pipeline instance when needed
#   (3) Create pipeline group when needed
########################################################################################
def main():
    try:
        while True:
            create_pipeline_group_from_timers()
            update_pipeline_instances()
            finish_pipeline_groups()
            time.sleep(5)
    except KeyboardInterrupt:
        print("Bye!")



if __name__ == '__main__':
    main()
