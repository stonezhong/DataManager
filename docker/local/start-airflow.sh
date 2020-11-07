#!/usr/bin/sh

source ~/.venvs/airflow/bin/activate
cd $AIRFLOW_HOME
airflow scheduler -D
airflow webserver -D -p 8080


