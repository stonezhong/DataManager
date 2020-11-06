#!/usr/bin/env python
# -*- coding: UTF-8 -*-

import argparse
import json
import glob
import os
import importlib

from spark_etl import Application

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_current_version(app_name):
    with open(os.path.join(BASE_DIR, ".builds", app_name, "manifest.json"), "r") as f:
        return json.load(f)['version']

def get_deployer(deployer_config):
    class_name  = deployer_config['class']
    module      = importlib.import_module('.'.join(class_name.split(".")[:-1]))
    klass       = getattr(module, class_name.split('.')[-1])

    args    = deployer_config.get("args", [])
    kwargs  = deployer_config.get("kwargs", {})
    return klass(*args, **kwargs)

def get_job_submitter(job_submitter_config):
    class_name  = job_submitter_config['class']
    module      = importlib.import_module('.'.join(class_name.split(".")[:-1]))
    klass       = getattr(module, class_name.split('.')[-1])

    args    = job_submitter_config.get("args", [])
    kwargs  = job_submitter_config.get("kwargs", {})
    return klass(*args, **kwargs)


# Example
#
# Please make sure config.json has the right config before run etl.py
#
# Build
# ./etl.py -a build --app-name dummy
#
# Deploy
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
        "-p", "--app-name", help="Application name"
    )
    parser.add_argument(
        "-c", "--config_filename", help="Config filename"
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
    config_filename = args.config_filename or os.path.join(BASE_DIR, "config.json")
    with open(config_filename, "r") as f:
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

    config = get_config(args)
    deployer = get_deployer(config['deployer'])

    build_dir   = os.path.join(BASE_DIR, ".builds", args.app_name)
    deploy_dir  = f"{config['deploy_base']}/{args.app_name}"
    deployer.deploy(build_dir, deploy_dir)
    print("Deploy application: done")


def do_run(args):
    print(f"Run application: {args.app_name}")
    if args.version:
        version = args.version
    else:
        version = get_current_version(args.app_name)

    print(f"version = {version}")

    config = get_config(args)
    job_submitter = get_job_submitter(config['job_submitter'])

    run_args = args.run_args
    if run_args is None:
        run_args_value = {}
    else:
        with open(run_args, "r") as f:
            run_args_value = json.load(f)

    deploy_dir  = f"{config['deploy_base']}/{args.app_name}"
    ret = job_submitter.run(
        f"{deploy_dir}/{version}",
        options=config.get("job_run_options", {}),
        args=run_args_value
    )
    print("Run application: done!")
    print(f"return = {ret}")


if __name__ == '__main__':
    main()
