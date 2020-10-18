#!/bin/sh

./build.sh
npm run build
mordor -a stage -p dcs --stage beta  --update-venv F

