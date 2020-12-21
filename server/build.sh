#!/bin/sh

. ~/.dmbuild/server/settings

echo "*********************************"
echo "*                               *"
echo "* build for stage: ${DM_STAGE}         *"
echo "*                               *"
echo "*********************************"

pysassc explorer/templates/css/main.scss                explorer/static/css/main.css
npm run build-prod
# npm run build-dev

mordor -a stage -p dm --stage ${DM_STAGE} --update-venv F
