#!/usr/bin/env python
# -*- coding: UTF-8 -*-

#######################################################
# DAG template for simple-flow tasks DAG
# Each task is launching a spark job
#######################################################

import logging, logging.config
import os
import json
AIRFLOW_HOME = os.environ["AIRFLOW_HOME"]
from jinja2 import Template

def config_log():
    # also see https://www.astronomer.io/guides/logging/ for logging
    with open(os.path.join(AIRFLOW_HOME, "configs", "log.json"), "rt") as f:
        template = Template(f.read())
        log_config = json.loads(template.render(AIRFLOW_HOME=AIRFLOW_HOME))
        logging.config.dictConfig(log_config)

config_log()
logger = logging.getLogger(__name__)

from datetime import datetime
import importlib
import subprocess
from airflow import DAG
from airflow.operators.python_operator import PythonOperator
from spark_etl.job_submitters.livy_job_submitter import LivyJobSubmitter
import MySQLdb
import time
import pytz

# Templated variables
pipeline_id = "{{pipeline_id}}"
dag_id = "{{dag_id}}"

# load config for etl

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

def update_pipeline_instance_status(pipeline_instance_id, status):
    mysql_cfg = load_config("mysql.json")
    conn = MySQLdb.connect(
        host    = mysql_cfg['hostname'],
        user    = mysql_cfg['username'],
        passwd  = mysql_cfg['password'],
        db      = mysql_cfg['db'],
        charset = mysql_cfg['charset'],
    )
    cur = conn.cursor()
    now = datetime.utcnow().replace(tzinfo=pytz.UTC)
    if status == "failed":
        cur.execute("UPDATE main_pipelineinstance SET status='%s', failed_time='%s'   WHERE id='%s'" % (status, now, pipeline_instance_id))
    elif status == "finished":
        cur.execute("UPDATE main_pipelineinstance SET status='%s', finished_time='%s' WHERE id='%s'" % (status, now, pipeline_instance_id))
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

def pretty_json(payload):
    return json.dumps(payload, indent=4, separators=(',', ': '))

def print_json(title, payload):
    print(title)
    print("------------------------------------------")
    print(f"\n{json.dumps(payload, indent=4, separators=(',', ': '))}")
    print("------------------------------------------")


def on_dag_run_success(context):
    try:
        logger.info("on_dag_run_success: enter")
        config = context['dag_run'].conf
        pipeline_instance_id = config['pipeline_instance_id']
        logger.info(f"pipeline_instance_id = {pipeline_instance_id}")
        update_pipeline_instance_status(pipeline_instance_id, 'finished')
        logger.info("on_dag_run_success: exit")
    except:
        logger.exception("on_dag_run_success")
        raise


def on_dag_run_failure(context):
    try:
        logger.info("on_dag_run_failure: enter")
        config = context['dag_run'].conf
        pipeline_instance_id = config['pipeline_instance_id']
        logger.info(f"pipeline_instance_id = {pipeline_instance_id}")
        update_pipeline_instance_status(pipeline_instance_id, 'failed')
        logger.info("on_dag_run_failure: exit")
    except:
        logger.exception("on_dag_run_failure")
        raise


def get_job_submitter(job_submitter_config):
    class_name  = job_submitter_config['class']
    module      = importlib.import_module('.'.join(class_name.split(".")[:-1]))
    klass       = getattr(module, class_name.split('.')[-1])

    args    = job_submitter_config.get("args", [])
    kwargs  = job_submitter_config.get("kwargs", {})
    return klass(*args, **kwargs)


class ExecuteTask:
    def __init__(self, task_ctx):
        self.task_ctx = task_ctx

    def __call__(self, ds, **kwargs):
        # task_ctx is json stored in context field in pipeline model
        task = kwargs['task']
        dag = task.dag
        ti = kwargs['ti']

        # for each dag run, user will pass in a pipeline group
        config = kwargs['dag_run'].conf
        print_json("Runtime config", config)
        print_json("task context", self.task_ctx)

        pipeline_instance_id = config['pipeline_instance_id']
        pipeline_group_context = get_pipeline_group_context(pipeline_instance_id)
        print_json("pipeline group context context", pipeline_group_context)

        # inject XCOM into pipeline group context
        pipeline_group_context['xcom'] = {}
        for task in dag.tasks:
            pipeline_group_context['xcom'][task.task_id] = ti.xcom_pull(task_ids=task.task_id)
        print_json("pipeline group context context after xcom", pipeline_group_context)

        dc_config = load_config("dc_config.json")
        spark_env = load_config("spark_env.json")

        if self.task_ctx['type'] == 'other':
            task_args_str = Template(self.task_ctx['args']).render(pipeline_group_context)
            args = {
                "pipeline_group_context": pipeline_group_context,
                "app_args": json.loads(task_args_str),
                "dc_config": dc_config,
            }
            appLocation = get_application_location(self.task_ctx['application_id'])
            print_json("app_args", args['app_args'])
        elif self.task_ctx['type'] == 'dummy':
            print("Dummy task")
            print("Done")
            return
        else:
            execute_sql_app = spark_env['apps']['execute_sql']
            args = {
                "pipeline_group_context": pipeline_group_context,
                "app_args": {
                    "steps": self.task_ctx['steps'],
                },
                "dc_config": dc_config,
            }
            appLocation = execute_sql_app['appLocation']
            print_json("app_args", args['app_args'])


        spark_etl_cfg = load_config("spark_etl.json")
        job_submitter = get_job_submitter(spark_etl_cfg['job_submitter'])
        ret = job_submitter.run(
            appLocation,
            options=spark_etl_cfg.get("job_run_options", {}),
            args=args)
        print("Done")
        return ret

try:
    logger.info(f"Creating dag, pipeline_id={pipeline_id}, dag_id={pipeline_id}")
    pipeline_context, pipeline_version, dag_version = get_pipeline_details(pipeline_id)
    logger.info(f"Pipeline context:\n{pretty_json(pipeline_context)}\n")
    logger.info(f"Pipeline version: {pipeline_version}")
    logger.info(f"DAG version     : {dag_version}")

    task_dict = {}

    args = {
        'owner': 'airflow',
        'depends_on_past': False,
        'wait_for_downstream': False,
         # We do not rely on airflow to schedule job anyway
         # We always trigger job manually
        'start_date': datetime(2000, 1, 1),
        'retries': 0,
    }

    dag = DAG(
        dag_id,
        default_args      = args,
        schedule_interval = None,
        on_success_callback = on_dag_run_success,
        on_failure_callback = on_dag_run_failure,
        catchup=False
    )
    for task_ctx in pipeline_context['tasks']:
        job_task = PythonOperator(
            task_id = task_ctx['name'],
            provide_context = True,
            python_callable = ExecuteTask(task_ctx),
            dag=dag,
        )
        task_dict[task_ctx['name']] = job_task

    # wire dependencies
    for dependency in pipeline_context['dependencies']:
        src_task = task_dict[dependency['src']]
        dst_task = task_dict[dependency['dst']]
        src_task << dst_task


    if dag_version < pipeline_version:
        update_pipeline_version(pipeline_id, pipeline_version)
    logger.info(f"DAG is created")
    dag

except:
    logger.exception("Failed to create dag")
    raise
