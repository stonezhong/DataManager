#!/bin/sh

./etl.py -a run \
    --deploy-dir hdfs:///etl/apps/generate_trading_samples --version 1.0.0.0 \
    --run-dir hdfs:///etl/runs \
    --config-dir config.json \
    --run-args ./tests/generate_trading_samples.json

