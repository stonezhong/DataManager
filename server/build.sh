#!/bin/sh

. ~/.venvs/dcs_build/bin/activate
pysassc explorer/templates/css/main.scss explorer/static/css/main.css
