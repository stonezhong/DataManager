#!/usr/bin/env python
# -*- coding: UTF-8 -*-

########################################################################################
# Run Integratoin Test for dc-client, dm-job-lib
########################################################################################

import logging, logging.config
from config import get_log_path
import DataCatalog.logging_helper as logging_helper

log_config = {
    "version": 1,
    "disable_existing_loggers": True,
    "formatters": {
        "standard": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        }
    },
    "handlers": {
        "consoleHandler": {
            "class": "logging.StreamHandler",
            "level": "DEBUG",
            "formatter": "standard",
            "stream": "ext://sys.stdout"
        },
        "fileHandler": {
            "class": "logging.handlers.TimedRotatingFileHandler",
            "level": "DEBUG",
            "formatter": "standard",
            "filename": f"{ get_log_path() }/run_test.log",
            "interval": 1,
            "when": "midnight"
        }
    },
    "loggers": {
        "": {
            "handlers": ["fileHandler", "consoleHandler"],
            "level":    "DEBUG",
            "propagate": True
        },
        "urllib3": {
            "propagate": False
        },
        "asyncio": {
            "propagate": False
        },
        "py4j.java_gateway":{
            "propagate": False
        },
    }
}

if not logging_helper.logging_initialized:
    logging_helper.logging_initialized = True
    logging.config.dictConfig(log_config)
logger = logging.getLogger(__name__)

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'DataCatalog.settings')
django.setup()

import argparse
import json

########################################################################
#
# Here is an example for the config:
# {
#     "api_url_base": "http://dev.dmbricks.com:8000/api",
#     "username": "stonezhong",
#     "password": "***",
#     "tenant_id": 1,
#     "tempdir": "/home/stonezhong/DATA_DISK/temp/dmtest"
# }
#
########################################################################

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-c", "--config", type=str, required=True, help="config filename",
    )
    parser.add_argument(
        "-s", "--suite", type=str, required=True, help="suite",
        choices=['dc-client', 'dm-job-lib']
    )

    args = parser.parse_args()

    with open(args.config, "r") as config_f:
        config = json.load(config_f)

    if args.suite == "dc-client":
        from integration_tests.dc_client    import run_tests
        run_tests(config)
        return

    if args.suite == "dm-job-lib":
        from integration_tests.dm_job_lib   import run_tests
        run_tests(config)
        return


if __name__ == '__main__':
    main()
