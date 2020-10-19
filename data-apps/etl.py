#!/usr/bin/env python
# -*- coding: UTF-8 -*-

import argparse
import json

from spark_etl import Application
from spark_etl.deployers import HDFSDeployer
from spark_etl.job_submitters.livy_job_submitter import LivyJobSubmitter

# Example
#
# Build
# ./etl.py -a build --app-dir ./apps/execute_sql --build-dir ./apps/execute_sql/build
#
# Deploy to HDFS
# ./etl.py -a deploy --build-dir ./apps/execute_sql/build --deploy-dir hdfs:///etl/apps/execute_sql --config-dir config.json
#
# Run the application
# ./etl.py -a run --deploy-dir hdfs:///etl/apps/execute_sql --version 1.0.0.0 --run-dir hdfs:///etl/runs --config-dir config.json --run-args ./run_args.json
#
# To see the yarn log, do "yarn logs -applicationId <Application ID>" on the bridge
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-a", "--action", required=True, choices=['build', 'deploy', 'run']
    )
    parser.add_argument(
         "--config-dir", help="Configuration directory"
    )
    parser.add_argument(
        "--app-dir", help="Application directory"
    )
    parser.add_argument(
        "--build-dir", help="Build directory"
    )
    parser.add_argument(
        "--deploy-dir", help="Deployment directory"
    )
    parser.add_argument(
        "--version", help="Application version"
    )
    parser.add_argument(
        "--run-dir", help="Run directory"
    )
    parser.add_argument(
        "--run-args", help="Arguments for run, a filename to a json"
    )
    args = parser.parse_args()
    if args.action == "build":
        do_build(args)
    elif args.action == "deploy":
        do_deploy(args)
    elif args.action == "run":
        do_run(args)

    return

def get_config(args):
    with open(args.config_dir, "r") as f:
        return json.load(f)


# build an application
def do_build(args):
    app = Application(args.app_dir)
    app.build(args.build_dir)


def do_deploy(args):
    config = get_config(args)
    deployer = HDFSDeployer({
        "bridge"   : config['bridge']['hostname'],
        "stage_dir": config['bridge']['stage_dir'],
    })
    deployer.deploy(args.build_dir, args.deploy_dir)


def do_run(args):
    config = get_config(args)
    job_submitter = LivyJobSubmitter({
        "service_url": config['livy']['service_url'],
        "username": config['livy']['username'],
        "password": config['livy']['password'],
        "bridge": config['bridge']['hostname'],
        "stage_dir": config['bridge']['stage_dir'],
        "run_dir": args.run_dir,
    })
    run_args = args.run_args
    if run_args is None:
        run_args_value = {}
    else:
        with open(run_args, "r") as f:
            run_args_value = json.load(f)
    job_submitter.run(f"{args.deploy_dir}/{args.version}", options={
        "conf": {
            'spark.yarn.appMasterEnv.PYSPARK_PYTHON': 'python3',
            'spark.executorEnv.PYSPARK_PYTHON': 'python3'
        }
    }, args=run_args_value)

if __name__ == '__main__':
    main()
