#!/usr/bin/env python
# -*- coding: UTF-8 -*-

# the file need to have line contains DAG, otherwise, airflow will ignore it
from airflow import DAG

#######################################################
# DAG template for simple-flow tasks DAG
# Each task is launching a spark job
#######################################################
import logging
logger = logging.getLogger(__name__)

from daglib import create_simple_flow_dag

# Templated variables
try:
    dag = create_simple_flow_dag("{{pipeline_id}}", "{{dag_id}}.{{pipeline_id}}")
    dag
except:
    logger.exception("Failed to create dag")
    raise
