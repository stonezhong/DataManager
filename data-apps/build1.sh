#!/bin/sh

./etl.py -a build --app-dir ./apps/execute_sql --build-dir ./apps/execute_sql/build
./etl.py -a deploy --build-dir ./apps/execute_sql/build --deploy-dir hdfs:///etl/apps/execute_sql --config-dir config.json
# ./etl.py -a run \
#     --deploy-dir hdfs:///etl/apps/execute_sql --version 1.0.0.0 \
#     --run-dir hdfs:///etl/runs \
#     --config-dir config.json \
#     --run-args ./run_args.json

