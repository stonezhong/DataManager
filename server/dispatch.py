#!/usr/bin/env python
# -*- coding: UTF-8 -*-

import argparse
import json
import os
import shutil
import subprocess
import sys

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'DataCatalog.settings')
django.setup()


from main.models import Application

# Global constants
PYTHON3                 = "/usr/bin/python3"
AIRFLOW_BASE_DIR        = os.path.expanduser("~/airflow")
AIRFLOW_VENV_DIR        = os.path.join(AIRFLOW_BASE_DIR, ".venv")
AIRFLOW_HOME_DIR        = os.path.join(AIRFLOW_BASE_DIR, "home")
AIRFLOW_DAGS_DIR        = os.path.join(AIRFLOW_HOME_DIR, "dags")
AIRFLOW_CFG             = os.path.join(AIRFLOW_HOME_DIR, "airflow.cfg")
OLD_AIRFLOW_CFG         = os.path.join(AIRFLOW_HOME_DIR, "airflow.cfg.old")
MYSQL_CFG_FILENAME      = os.path.expandvars("$ENV_HOME/configs/dm/db.json")
DJANGO_CFG_FILENAME     = os.path.expandvars("$ENV_HOME/configs/dm/django.json")
BASHRC                  = os.path.expanduser("~/.bashrc")
AIRFLOW_PIP             = os.path.join(AIRFLOW_VENV_DIR, 'bin', 'pip')
AIRFLOW_REQUIREMENTS    = os.path.expandvars("$ENV_HOME/apps/dm/current/airflow_requirements.txt")

# read config file from source, handle it line by line
# write output to destination
def process_config_file(source, destination, handler):
    with open(destination, "w") as dest_f:
        with open(source, "rt") as src_f:
            section = ""
            for line in src_f:
                line_fixed = line.rstrip()
                if line_fixed.startswith("["):
                    # do not pass section to handler
                    section = line_fixed
                    dest_f.write(f"{section}\n")
                    continue
                out_line = handler(section, line_fixed)
                dest_f.write(f"{out_line}\n")

def execute_sql(mysql_cfg, statement):
    import MySQLdb

    # print(f"Executing SQL: {statement}")
    conn = MySQLdb.connect(
        host    = mysql_cfg['server'],
        user    = mysql_cfg['username'],
        passwd  = mysql_cfg['password'],
    )
    cur = conn.cursor()
    cur.execute(statement)
    cur.close()
    conn.close()

def setup_airflow_venv():
    if os.path.isdir(AIRFLOW_BASE_DIR):
        shutil.rmtree(AIRFLOW_BASE_DIR)
    os.makedirs(AIRFLOW_BASE_DIR)
    os.makedirs(AIRFLOW_VENV_DIR)
    os.makedirs(AIRFLOW_HOME_DIR)
    os.makedirs(AIRFLOW_DAGS_DIR)

    # set AIRFLOW_HOME environment variable
    with open(BASHRC, "a") as f:
        f.write(
"""
# added by Data Manager Setup
export AIRFLOW_HOME=$HOME/airflow/home

""")
    os.environ['AIRFLOW_HOME'] = os.path.expandvars("$HOME/airflow/home")

    subprocess.check_call(
        [
            "ln -s $ENV_HOME/apps/dm/current/airflow/daglib $AIRFLOW_HOME/dags/daglib"
        ],
        shell=True
    )

    # airflow does not work with the latest pip
    # it need pip 20.0.4
    # see https://airflow.apache.org/docs/apache-airflow/stable/start.html
    subprocess.check_call([PYTHON3, '-m', 'venv', AIRFLOW_VENV_DIR])
    subprocess.check_call([AIRFLOW_PIP, 'install', '-Iq', 'pip==20.2.4'])
    subprocess.check_call([AIRFLOW_PIP,'install', '-q','setuptools', '--upgrade'])
    subprocess.check_call([AIRFLOW_PIP,'install', '-q', 'wheel'])

    # Install airflow
    # download the constraints file
    # if you are not using python 3.6, you need to update this part
    proxy = input("proxy? ")
    if proxy:
        subprocess.check_call(
            f"https_proxy={proxy} wget -O constraints-3.6.txt https://raw.githubusercontent.com/apache/airflow/constraints-1.10.12/constraints-3.6.txt",
            shell=True
        )
    else:
        subprocess.check_call(
            "wget -O constraints-3.6.txt https://raw.githubusercontent.com/apache/airflow/constraints-1.10.12/constraints-3.6.txt",
            shell=True
        )

    subprocess.check_call([
        AIRFLOW_PIP,
        'install', "-q",
        "apache-airflow[mysql]==1.10.12",
        "apache-airflow[password]==1.10.12",
        "--constraint", "constraints-3.6.txt"
    ])

    # install some additional packages
    subprocess.check_call([
        AIRFLOW_PIP,
        'install', "-q", "-r", AIRFLOW_REQUIREMENTS
    ])


def config_airflow_venv():
    # generate a dummy airflow.cfg
    subprocess.call([f"source {AIRFLOW_VENV_DIR}/bin/activate; airflow"], shell=True)
    os.rename(AIRFLOW_CFG, OLD_AIRFLOW_CFG)

    with open(MYSQL_CFG_FILENAME, "r") as f:
        mysql_cfg = json.load(f)
    with open(DJANGO_CFG_FILENAME, "r") as f:
        django_cfg = json.load(f)

    airflow_db_name = mysql_cfg['airflow_db_name']

    def handle_airflow_line(section, line):
        if section == "[core]":
            if line.startswith("sql_alchemy_conn = "):
                l = f"sql_alchemy_conn = mysql://{mysql_cfg['username']}:{mysql_cfg['password']}@{mysql_cfg['server']}:3306/{airflow_db_name}?charset=utf8mb4&binary_prefix=true"
                return l
            if line.startswith("executor = "):
                return "executor = LocalExecutor"
            if line.startswith("load_examples = "):
                return "load_examples = False"
            if line.startswith("dags_are_paused_at_creation = "):
                return "dags_are_paused_at_creation = False"
            return line

        if section == "[scheduler]":
            if line.startswith("min_file_process_interval = "):
                return "min_file_process_interval = 30"
            if line.startswith("dag_dir_list_interval = "):
                return "dag_dir_list_interval = 30"
            return line

        if section == "[api]":
            if line.startswith("auth_backend = "):
                return "auth_backend = airflow.api.auth.backend.default"
            return line

        if section == "[webserver]":
            if line.startswith("rbac = "):
                return "rbac = True"
            if line.startswith("base_url = "):
                return f"base_url = {django_cfg['airflow']['base_url']}"
            return line

        return line

    print("Update airflow config ...")
    process_config_file(OLD_AIRFLOW_CFG, AIRFLOW_CFG, handle_airflow_line)

    print(f"Create airflow database: {airflow_db_name}")
    execute_sql(mysql_cfg, f"CREATE SCHEMA IF NOT EXISTS `{airflow_db_name}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin")

    # initdb
    print("Initializing airflow database ...")
    subprocess.call([f"source {AIRFLOW_VENV_DIR}/bin/activate; airflow initdb"], shell=True)

    # create first airflow user
    print("Create airflow admin user ...")
    admin_name  = input("admin username: ")
    admin_email = input("admin email: ")
    admin_fn = input("admin first name: ")
    admin_ln = input("admin last name: ")
    admin_pwd = input("admin password: ")

    cmd = f"airflow create_user -r Admin -u {admin_name} -e {admin_email} -f {admin_fn} -l {admin_ln} -p {admin_pwd}"
    subprocess.call([f"source {AIRFLOW_VENV_DIR}/bin/activate; {cmd}"], shell=True)


def do_setup_airflow():
    setup_airflow_venv()
    config_airflow_venv()

def do_start_airflow():
    # start scheduler
    subprocess.call([f"source {AIRFLOW_VENV_DIR}/bin/activate; airflow scheduler -D"], shell=True)
    # start web
    subprocess.call([f"source {AIRFLOW_VENV_DIR}/bin/activate; airflow webserver -D -p 8080"], shell=True)

def do_stop_airflow():
    # stop scheduler
    cmd = f"kill $(cat {AIRFLOW_HOME_DIR}/airflow-scheduler.pid)"
    subprocess.call([cmd], shell=True)

    # stop web
    cmd = f"kill $(cat {AIRFLOW_HOME_DIR}/airflow-webserver-monitor.pid)"
    subprocess.call([cmd], shell=True)

def do_setup_dm(args):
    with open(MYSQL_CFG_FILENAME, "r") as f:
        mysql_cfg = json.load(f)

    dm_db_name = mysql_cfg['db_name']
    print(f"Create data manager database: {dm_db_name}")
    execute_sql(mysql_cfg, f"CREATE SCHEMA IF NOT EXISTS `{dm_db_name}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin")

    # Initialize db
    print("Initialize data manager database")
    migration_dir = os.path.expandvars("$ENV_HOME/apps/dm/current/main/migrations")
    if os.path.isdir(migration_dir):
        shutil.rmtree(migration_dir)
    subprocess.call(["python manage.py migrate"], shell=True)
    subprocess.call(["python manage.py makemigrations main"], shell=True)
    subprocess.call(["python manage.py migrate main"], shell=True)

    print("**********************************************")
    print("* About to create data manager admin account *")
    print("**********************************************")
    admin_name  = input("admin username: ")
    admin_email = input("admin email: ")
    subprocess.call([
        f"python manage.py createsuperuser --email {admin_email} --username {admin_name}"
    ], shell=True)

    print("**********************************************")
    print("* Create System App: Execute SQL             *")
    print("**********************************************")
    with open(os.path.expandvars("$ENV_HOME/configs/dmapps/config.json"), "r") as f:
        dmapp_config = json.load(f)

    app = Application(
        name="Execute SQL",
        description="System Application for Executing SQL statements",
        team="admins",
        retired=False,
        app_location=f"{dmapp_config['deploy_base']}/execute_sql/1.0.0.0",
        sys_app_id=Application.SysAppID.EXECUTE_SQL.value,
        author_id=1, # the first user which is admin
    )
    app.save()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-a", "--action", type=str, required=True, help="Specify action",
        choices=[
            'setup-airflow', 'start-airflow', 'stop-airflow',
            'setup-dm'
        ]
    )
    args = parser.parse_args()

    if args.action == "setup-airflow":
        do_setup_airflow()
    elif args.action == "start-airflow":
        do_start_airflow()
    elif args.action == "stop-airflow":
        do_stop_airflow()
    elif args.action == "setup-dm":
        do_setup_dm(args)
    else:
        raise Exception(f"Unknown action: {args.action}")

if __name__ == '__main__':
    main()