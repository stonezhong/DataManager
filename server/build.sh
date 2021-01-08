#!/bin/sh


if [ -z "${DM_STAGE}" ]; then
    echo "DM_STAGE not set"
    echo "Example:"
    echo "DM_STAGE=beta ./build.sh"
    exit 1
fi

echo "*********************************"
echo "*                               *"
echo "* build for stage: ${DM_STAGE}         *"
echo "*                               *"
echo "*********************************"

pysassc explorer/templates/css/main.scss                explorer/static/css/main.css
npm run build-prod
# npm run build-dev

mordor -a stage -p dm --stage ${DM_STAGE}
