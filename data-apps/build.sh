#!/bin/sh

# build and deploy
./etl.py -a build  --app-name $1
./etl.py -a deploy --app-name $1

