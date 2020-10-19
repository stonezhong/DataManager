#!/bin/sh

./etl.py -a build --app-dir ./apps/$1 --build-dir ./apps/$1/build
./etl.py -a deploy --build-dir ./apps/$1/build --deploy-dir hdfs:///etl/apps/$1 --config-dir config.json

