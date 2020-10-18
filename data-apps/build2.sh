#!/bin/sh

./etl.py \
    -a build \
    --app-dir ./apps/generate_trading_samples \
    --build-dir ./apps/generate_trading_samples/build

./etl.py \
    -a deploy \
    --build-dir ./apps/generate_trading_samples/build \
    --deploy-dir hdfs:///etl/apps/generate_trading_samples \
    --config-dir config.json

./etl.py -a run \
    --deploy-dir hdfs:///etl/apps/generate_trading_samples \
    --version 1.0.0.0 \
    --run-dir hdfs:///etl/runs \
    --config-dir config.json \
    --run-args ./run_args2.json

