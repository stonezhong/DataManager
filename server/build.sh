#!/bin/sh


if [ -z "${DM_STAGE}" ]; then
    echo "DM_STAGE not set"
    echo "Example:"
    echo "DM_STAGE=beta ./build.sh"
    exit 1
fi

if [ "${DM_STAGE}" = "beta" ]; then
    echo ${DM_STAGE}
    pysassc explorer/templates/css/main.scss                explorer/static/css/main.css
    npm run build-dev
    exit 0
fi


if [ "${DM_STAGE}" = "prod" ]; then
    echo ${DM_STAGE}
    pysassc explorer/templates/css/main.scss                explorer/static/css/main.css
    npm run build-prod
    exit 0
fi

echo "Invalid stage: ${DM_STAGE}, only beta or prod is allowed"
exit 1

