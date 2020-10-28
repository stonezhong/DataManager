#!/usr/bin/env python
# -*- coding: UTF-8 -*-

import argparse
import json
import glob
import os

from spark_etl import Application
from spark_etl.deployers import HDFSDeployer
from spark_etl.job_submitters.livy_job_submitter import LivyJobSubmitter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_current_version(app_name):
    with open(os.path.join(BASE_DIR, ".builds", app_name, "manifest.json"), "r") as f:
        return json.load(f)['version']

# Example
#
# Please make sure config.json has the right config before run etl.py
#
# Build
# ./etl.py -a build --app-name dummy
#
# Deploy to HDFS
# ./etl.py -a deploy --app-name dummy
#
# Run the application
# ./etl.py -a run --app-name dummy
# You can use "--version 1.0.0.0" to override the current version
# You can use "--run-args ./run_args.json" to specify the arguments
# To see the yarn log, do "yarn logs -applicationId <Application ID>" on the bridge
#
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-a", "--action", required=True, choices=['build', 'deploy', 'run']
    )
    parser.add_argument(
        "--app-name", help="Application name"
    )
    parser.add_argument(
        "--version", help="Application version"
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
    print(f"Building application: {args.app_name}")
    app_dir     = os.path.join(BASE_DIR, "apps", args.app_name)
    build_dir   = os.path.join(BASE_DIR, ".builds", args.app_name)

    # some necessary cleanup
    os.makedirs(build_dir, exist_ok=True)
    for f in glob.glob(f'{build_dir}/*'):
        os.remove(f)

    app = Application(app_dir)
    app.build(build_dir)
    print("Build application: done!")


def do_deploy(args):
    print(f"Deploy application: {args.app_name}")
    with open(os.path.join(BASE_DIR, "config.json"), "r") as f:
        config = json.load(f)

    app_dir     = os.path.join(BASE_DIR, "apps", args.app_name)
    build_dir   = os.path.join(BASE_DIR, ".builds", args.app_name)
    deploy_dir  = f"{config['deploy_base']}/{args.app_name}"
    print(f"deploy to {deploy_dir}")

    deployer = HDFSDeployer({
        "bridge"   : config['bridge']['hostname'],
        "stage_dir": config['bridge']['stage_dir'],
    })
    deployer.deploy(build_dir, deploy_dir)
    print("Deploy application: done")


def do_run(args):
    print(f"Run application: {args.app_name}")
    if args.version:
        version = args.version
    else:
        version = get_current_version(args.app_name)

    print(f"version = {version}")

    with open(os.path.join(BASE_DIR, "config.json"), "r") as f:
        config = json.load(f)

    job_submitter = LivyJobSubmitter({
        "service_url"   : config['livy']['service_url'],
        "username"      : config['livy']['username'],
        "password"      : config['livy']['password'],
        "bridge"        : config['bridge']['hostname'],
        "stage_dir"     : config['bridge']['stage_dir'],
        "run_dir"       : config['run_dir']
    })

    run_args = args.run_args
    if run_args is None:
        run_args_value = {}
    else:
        with open(run_args, "r") as f:
            run_args_value = json.load(f)

    deploy_dir  = f"{config['deploy_base']}/{args.app_name}"
    ret = job_submitter.run(f"{deploy_dir}/{version}", options={
        "conf": {
            'spark.yarn.appMasterEnv.PYSPARK_PYTHON': 'python3',
            'spark.executorEnv.PYSPARK_PYTHON': 'python3'
        }
    }, args=run_args_value)
    print("Run application: done!")
    print(f"return = {ret}")


if __name__ == '__main__':
    main()
