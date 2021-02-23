#!/usr/bin/env python
# -*- coding: UTF-8 -*-

import argparse
import json
import glob
import os
import importlib

from spark_etl import Application
from dc_client import DataCatalogClient, dc_job_handler


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_NAME = BASE_DIR.split("/")[-2]
ENV_HOME = os.environ.get('ENV_HOME')

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
        "--version", help="Application version"
    )
    parser.add_argument(
        "--run-args", help="Arguments for run, a filename to a json"
    )
    parser.add_argument(
        "--cli-mode",
        action="store_true",
        help="Using cli mode?"
    )
    parser.add_argument(
        "--dcc-proxy",
        action="store_true",
        help="Proxy DataCatalogClient?"
    )
    args = parser.parse_args()
    if args.action == "build":
        do_build(args)
    elif args.action == "deploy":
        do_deploy(args)
    elif args.action == "run":
        do_run(args)

    return

def get_config():
    config_filename = os.path.join(ENV_HOME, "configs", "dmapps", "config.json")
    with open(config_filename, "r") as f:
        return json.load(f)

def get_dm_config(name):
    config_filename = os.path.join(ENV_HOME, "configs", "dm", name)
    with open(config_filename, "r") as f:
        return json.load(f)

def get_common_requirements():
    common_req_filename = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "apps",
        "common_requirements.txt"
    )
    if not os.path.isfile(common_req_filename):
        return []

    packages = []
    with open(common_req_filename, "rt") as f:
        for line in f:
            if line.startswith("#"):
                continue
            l = line.strip()
            if len(l) > 0:
                packages.append(l)
    return packages

# build an application
def do_build(args):
    print(f"Building application: {args.app_name}")

    config = get_config()

    app_dir     = os.path.join(BASE_DIR, "apps", args.app_name)
    build_dir   = os.path.join(BASE_DIR, ".builds", args.app_name)

    # some necessary cleanup
    os.makedirs(build_dir, exist_ok=True)
    for f in glob.glob(f'{build_dir}/*'):
        os.remove(f)

    app = Application(app_dir)
    app.build(build_dir, default_libs=get_common_requirements())
    print("Build application: done!")


def do_deploy(args):
    print(f"Deploy application: {args.app_name}")

    config = get_config()
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

    config = get_config()
    job_submitter = get_job_submitter(config['job_submitter'])

    run_args = args.run_args
    if run_args is None:
        run_args_value = {}
    else:
        with open(run_args, "r") as f:
            run_args_value = json.load(f)

    if args.dcc_proxy:
        dc_config = get_dm_config("dc_config.json")
        dcc = DataCatalogClient(
            url_base = dc_config['url_base'],
            auth = (dc_config['username'], dc_config['password'])
        )
        handlers = [lambda content: dc_job_handler(content, dcc)]
    else:
        handlers = None

    deploy_dir  = f"{config['deploy_base']}/{args.app_name}"
    ret = job_submitter.run(
        f"{deploy_dir}/{version}",
        options=config.get("job_run_options", {}),
        args=run_args_value,
        cli_mode=args.cli_mode,
        handlers=handlers
    )
    print("Run application: done!")
    print(f"return = {ret}")


if __name__ == '__main__':
    main()
