#!/usr/bin/env python
# -*- coding: UTF-8 -*-

from datetime import datetime
from airflow import DAG
from airflow.operators.python_operator import PythonOperator

pipeline_id = "{{pipeline_id}}"

args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'wait_for_downstream': False,
    'start_date': datetime(2019, 8, 14),
    'retries': 0,
}

dag = DAG(
    'test',
    default_args      = args,
    schedule_interval = None
)


def do_t1_task(ds, **kwargs):
    foo = kwargs['dag_run'].conf.get('foo')
    print(f"from do_t1_task:, foo is {foo}")

t1_task = PythonOperator(
    task_id='begin',
    provide_context=True,
    python_callable=do_t1_task,
    dag=dag,
)


dag

