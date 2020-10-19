#!/bin/sh

./etl.py -a run \
    --deploy-dir hdfs:///etl/apps/execute_sql --version 1.0.0.0 \
    --run-dir hdfs:///etl/runs \
    --config-dir config.json \
    --run-args ./tests/execute_sql.json

