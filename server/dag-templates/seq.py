#!/usr/bin/env python
# -*- coding: UTF-8 -*-

#######################################################
# DAG template for sequential tasks DAG
# Each task is launching a spark job
#######################################################

import os
import json
from datetime import datetime
import subprocess
from airflow import DAG
from airflow.operators.python_operator import PythonOperator
from spark_etl.job_submitters.livy_job_submitter import LivyJobSubmitter
import MySQLdb
import time

# Templated variables
pipeline_id = "{{pipeline_id}}"
dag_id = "{{dag_id}}"

# load config for etl
AIRFLOW_HOME = os.environ["AIRFLOW_HOME"]

def load_config(name):
    with open(os.path.join(AIRFLOW_HOME, "configs", name), "r") as f:
        return json.load(f)

def get_application_location(application_id):
    app_id = application_id.replace("-", "")
    app_location = None

    mysql_cfg = load_config("mysql.json")
    conn = MySQLdb.connect(
        host    = mysql_cfg['hostname'],
        user    = mysql_cfg['username'],
        passwd  = mysql_cfg['password'],
        db      = mysql_cfg['db'],
        charset = mysql_cfg['charset'],
    )
    cur = conn.cursor()
    cur.execute("SELECT app_location FROM main_application WHERE id='%s'" % (app_id))
    for row in cur:
        app_location = row[0]
        break
    cur.close()
    conn.close()
    return app_location


def get_pipeline_details(pipeline_id):
    pipeline_context = {}

    mysql_cfg = load_config("mysql.json")
    conn = MySQLdb.connect(
        host    = mysql_cfg['hostname'],
        user    = mysql_cfg['username'],
        passwd  = mysql_cfg['password'],
        db      = mysql_cfg['db'],
        charset = mysql_cfg['charset'],
    )
    cur = conn.cursor()
    cur.execute("SELECT context, version, dag_version FROM main_pipeline WHERE id='%s'" % (pipeline_id))
    for row in cur:
        pipeline_context = json.loads(row[0])
        pipeline_version = row[1]
        dag_version = row[2]
        break
    cur.close()
    conn.close()
    return pipeline_context, pipeline_version, dag_version

def update_pipeline_version(pipeline_id, version):
    pipeline_context = {}

    mysql_cfg = load_config("mysql.json")
    conn = MySQLdb.connect(
        host    = mysql_cfg['hostname'],
        user    = mysql_cfg['username'],
        passwd  = mysql_cfg['password'],
        db      = mysql_cfg['db'],
        charset = mysql_cfg['charset'],
    )
    cur = conn.cursor()
    cur.execute("UPDATE main_pipeline SET dag_version=%s WHERE id='%s'" % (version, pipeline_id))
    conn.commit()
    cur.close()
    conn.close()
    return

def get_pipeline_group_context(pipeline_instance_id):
    pipeline_group_context = {}

    mysql_cfg = load_config("mysql.json")
    conn = MySQLdb.connect(
        host    = mysql_cfg['hostname'],
        user    = mysql_cfg['username'],
        passwd  = mysql_cfg['password'],
        db      = mysql_cfg['db'],
        charset = mysql_cfg['charset'],
    )
    cur = conn.cursor()
    sql = """
SELECT
    main_pipelinegroup.context
FROM main_pipelineinstance
LEFT JOIN main_pipelinegroup
	ON main_pipelineinstance.group_id = main_pipelinegroup.id
WHERE
    main_pipelineinstance.id = '%s'
""" % (pipeline_instance_id)
    cur.execute(sql)
    for row in cur:
        pipeline_group_context = json.loads(row[0])
        break
    cur.close()
    conn.close()
    return pipeline_group_context



def get_task_from_context(pipeline_contetx, task_name):
    for task in pipeline_context['tasks']:
        if task['name'] == task_name:
            return task
    return None

def print_json(title, payload):
    print(title)
    print("------------------------------------------")
    print(f"\n{json.dumps(payload, indent=4, separators=(',', ': '))}")
    print("------------------------------------------")


pipeline_context, pipeline_version, dag_version = get_pipeline_details(pipeline_id)
print_json("Pipeline context:", pipeline_context)
print_json("Pipeline version:", pipeline_version)
print_json("DAG version     :", dag_version)

args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'wait_for_downstream': False,
    'start_date': datetime(2019, 8, 14),
    'retries': 0,
}

dag = DAG(
    dag_id,
    default_args      = args,
    schedule_interval = None
)


def execute_task(ds, task_ctx, **kwargs):
    # task_ctx is json stored in context field in pipeline model

    # for each dag run, user will pass in a pipeline group
    config = kwargs['dag_run'].conf
    print_json("Runtime config", config)
    print_json("task context", task_ctx)

    pipeline_instance_id = config['pipeline_instance_id']
    pipeline_group_context = get_pipeline_group_context(pipeline_instance_id)
    print_json("pipeline group context context", pipeline_group_context)

    dc_config = load_config("dc_config.json")
    spark_env = load_config("spark_env.json")

    if task_ctx['type'] == 'other':
        args = {
            "pipeline_group_context": pipeline_group_context,
            "app_args": task_ctx['args'],
            "dc_config": dc_config,
        }
        appLocation = get_application_location(task_ctx['application_id'])
    else:
        execute_sql_app = spark_env['apps']['execute_sql']
        args = {
            "pipeline_group_context": pipeline_group_context,
            "app_args": {
                "steps": task_ctx['steps'],
            },
            "dc_config": dc_config,
        }
        appLocation = execute_sql_app['appLocation']


    livy_cfg = load_config("livy.json")
    job_submitter = LivyJobSubmitter({
        "service_url": livy_cfg['livy']['service_url'],
        "username"   : livy_cfg['livy']['username'],
        "password"   : livy_cfg['livy']['password'],
        "bridge"     : livy_cfg['bridge']['hostname'],
        "stage_dir"  : livy_cfg['bridge']['stage_dir'],
        "run_dir"    : spark_env['run_dir'],
    })

    # we always uses python3
    job_submitter.run(appLocation, options={
        "conf": {
            'spark.yarn.appMasterEnv.PYSPARK_PYTHON': 'python3',
            'spark.executorEnv.PYSPARK_PYTHON': 'python3'
        }
    }, args=args)
    print("Done")


last_task = None
for task_ctx in pipeline_context['tasks']:
    job_task = PythonOperator(
        task_id = task_ctx['name'],
        provide_context = True,
        python_callable = lambda ds, **kwargs: execute_task(ds, task_ctx, **kwargs),
        dag=dag,
    )
    if last_task is not None:
        last_task >> job_task
    last_task = job_task

if dag_version < pipeline_version:
    update_pipeline_version(pipeline_id, pipeline_version)
dag

