#!/usr/bin/env python
# -*- coding: UTF-8 -*-

import json
import jinja2
import time
from datetime import datetime
import pytz

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'DataCatalog.settings')
django.setup()

# from django.db.models import Q
from main.models import PipelineInstance, Dataset, DatasetInstance, Pipeline, PipelineGroup
import explorer.airflow_lib as airflow_lib

################################################################################
# (1) Scans dag runs and update their status periodically
# (2) Create time based pipeline group creation
# (3) trigger
################################################################################

def is_dataset_instance_ready(di_path):
    # di_path is in format: name:major_version:minor_version/path
    # example: trading_version:1.0:1/2020-09-23
    p = di_path.find('/')
    if p < 0:
        raise Exception(f"{di_path} is not a valid dataset instance path")

    p1 = di_path[:p]
    p2 = di_path[p:]

    segs = p1.split(':')
    if len(segs)!=3:
        raise Exception(f"{di_path} is not a valid dataset instance path")

    dataset_name, major_version, minor_version = segs

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
    diss = DatasetInstance.objects.filter(path=p2, deleted_time=None)

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
def handle_pipeline_instance_active(pi):
    print(f"handle pipeline {pi.id} in created status")
    group_ctx = json.loads(pi.group.context)
    pipeline_ctx = json.loads(pi.pipeline.context)

    if pi.pipeline.paused:
        print("Pipeline is paused, so skip for now")
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

    print("ALL required asserts are ready!!")
    print(f"triggering DAG {pi.pipeline.name}")
    r = airflow_lib.trigger_dag(
        pi.pipeline.name,
        {
            "pipeline_instance_id": str(pi.id).replace("-", "")
        }
    )

    ctx = json.loads(pi.context)
    pi.status = PipelineInstance.STARTED_STATUS
    ctx['dag_run'] = r
    pi.context = json.dumps(ctx)
    pi.save()
    print("")

# For pipeline instance in "started" status, let's pull it's
# airflow status so it will switch to finished or failed
def handle_pipeline_instance_started(pi):
    print(f"handle pipeline {pi.id} in started status")
    ctx = json.loads(pi.context)

    run_id = ctx['dag_run']['execution_date']

    r = airflow_lib.get_dag_run_status(
        pi.pipeline.name,
        run_id
    )
    if r['state'] == "success":
        pi.status = PipelineInstance.FINISHED_STATUS
        pi.save()
        print(f"succeeded")
        return

    if r['state'] == 'failed':
        pi.status = PipelineInstance.FAILED_STATUS
        pi.save()
        print(f"failed")
        return

    if r['state'] == 'running':
        print(f"running, skip")
        return

    raise Exception(f"Unrecognized status: {r}")

def main():
    while True:
        print("")
        print("")
        for pi in PipelineInstance.objects.filter(status=PipelineInstance.CREATED_STATUS):
            handle_pipeline_instance_active(pi)

        for pi in PipelineInstance.objects.filter(status=PipelineInstance.STARTED_STATUS):
            handle_pipeline_instance_started(pi)

        time.sleep(5)


if __name__ == '__main__':
    main()
