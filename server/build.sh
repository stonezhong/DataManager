#!/bin/sh

source ~/.dmbuild/server/settings

DM_STAGE=beta

pysassc explorer/templates/css/main.scss                explorer/static/css/main.css
npm run build-prod
# npm run build-dev

mordor -a stage -p dm --stage $DM_STAGE --update-venv F

