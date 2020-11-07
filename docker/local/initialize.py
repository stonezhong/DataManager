#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
import os
import shutil
import subprocess
import sys

SRC_HOME        = "/root/DataManager"
MORDOR_HOME     = "/root/mordor"
APP_NAME        = "dm"
DJANGO_DB       = "dm"
AIRFLOW_DB      = "dm-airflow"
AIRFLOW_HOME    = "/root/airflow/home"
JUPYTER_PORT    = 8787

def add_section_to_bashrc(comment, lines):
    with open("/root/.bashrc", "a") as f:
        f.write("\n")
        f.write(f"# {comment}\n")
        for line in lines:
            f.write(f"{line}\n")
        f.write("\n")

def setup_venv(location, packages=[], requirements=None):
    if os.path.isdir(location):
        shutil.rmtree(location)
    os.makedirs(location)
    subprocess.check_call([
        'python3', '-m', 'venv', location
    ])
    subprocess.check_call([
        os.path.join(location, 'bin', 'pip'),
        'install', '-q',
        'pip', 'setuptools', '--upgrade'
    ])
    subprocess.check_call([
        os.path.join(location, 'bin', 'pip'),
        'install', '-q', 'wheel'
    ])
    if requirements:
        subprocess.check_call([
            os.path.join(location, 'bin', 'pip'),
            'install', "-q", "-r", requirements
        ])

    for package in packages:
        subprocess.check_call([
            os.path.join(location, 'bin', 'pip'),
            'install', '-q', package
        ])


# read config file from source, handle it line by line
# write output to destination
def process_config_file(source, destination, handler):
    with open(destination, "w") as dest_f:
        with open(source, "rt") as src_f:
            for line in src_f:
                out_line = handler(line.rstrip())
                dest_f.write(f"{out_line}\n")


def execute_sql(mysql_cfg, statement):
    import MySQLdb

    # print(f"Executing SQL: {statement}")
    conn = MySQLdb.connect(
        host    = mysql_cfg['hostname'],
        user    = mysql_cfg['username'],
        passwd  = mysql_cfg['password'],
    )
    cur = conn.cursor()
    cur.execute(statement)
    cur.close()
    conn.close()

def setup_airflow(config):
    import MySQLdb

    print("**********************************************")
    print("*              Setup airflow                 *")
    print("**********************************************")

    if os.path.isdir(AIRFLOW_HOME):
        shutil.rmtree(AIRFLOW_HOME)
    os.makedirs(AIRFLOW_HOME)
    os.makedirs(os.path.join(AIRFLOW_HOME, "configs"))
    os.makedirs(os.path.join(AIRFLOW_HOME, "dags"))

    print("Setup virtual environment:")
    add_section_to_bashrc("AIRFLOW CONFIG", [
        f"export AIRFLOW_HOME={AIRFLOW_HOME}",
    ])
    setup_venv("/root/.venvs/airflow", [
        "apache-airflow[mysql]==1.10.12", "apache-airflow[password]==1.10.12",
        "Jinja2==2.11.2",
        "pyspark==3.0.1",
        "spark-etl==0.0.8"
    ])

    print("Create airflow database:")
    mysql_cfg = config["mysql"]
    execute_sql(mysql_cfg, f"CREATE SCHEMA IF NOT EXISTS `{AIRFLOW_DB}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin")

    def handle_airflow_line(line):
        if line.startswith("sql_alchemy_conn = "):
            l = f"sql_alchemy_conn = mysql://{mysql_cfg['username']}:{mysql_cfg['password']}@{mysql_cfg['hostname']}:3306/{AIRFLOW_DB}?charset=utf8mb4&binary_prefix=true"
            return l
        if line.startswith("executor = "):
            return "executor = LocalExecutor"
        if line.startswith("load_examples = "):
            return "load_examples = False"
        if line.startswith("dags_are_paused_at_creation = "):
            return "dags_are_paused_at_creation = False"
        if line.startswith("dag_dir_list_interval = "):
            return "dag_dir_list_interval = 10"
        if line.startswith("auth_backend = "):
            return "auth_backend = airflow.api.auth.backend.default"
        return line

    process_config_file("airflow.cfg", f"{AIRFLOW_HOME}/airflow.cfg", handle_airflow_line)

    os.environ['AIRFLOW_HOME'] = AIRFLOW_HOME
    # initdb
    print("Initializing airflow database ...")
    subprocess.call([
        "source /root/.venvs/airflow/bin/activate; airflow initdb"
    ], shell=True)

    config_dir_base = os.path.join(AIRFLOW_HOME, "configs")

    db_cfg = {
        "url_base": "http://localhost:8888/api",
        "username": config['django']['admin']['username'],
        "password": config['django']['admin']['password'],
    }
    with open(os.path.join(config_dir_base, "dc_config.json"), "w") as f:
        json.dump(db_cfg, f)

    mysql_cfg = {
        "hostname": config['mysql']['hostname'],
        "username": config['mysql']['username'],
        "password": config['mysql']['password'],
        "db"      : DJANGO_DB,
        "charset" : "utf8",
    }
    with open(os.path.join(config_dir_base, "mysql.json"), "w") as f:
        json.dump(mysql_cfg, f)

    spark_env_cfg = {
        "apps": {
            "execute_sql": {
                "appLocation": os.path.join(config['etl']['app_dir'], "execute_sql", "1.0.0.0")
            }
        }
    }
    with open(os.path.join(config_dir_base, "spark_env.json"), "w") as f:
        json.dump(spark_env_cfg, f)

    spark_etl_cfg = get_spark_etl_config(config)
    with open(os.path.join(config_dir_base, "spark_etl.json"), "w") as f:
        json.dump(spark_etl_cfg, f)


def setup_mordor(config):
    print("**********************************************")
    print("*              Setup mordor                  *")
    print("**********************************************")

    add_section_to_bashrc(
        "For Mordor",
        [
            f"export ENV_HOME={MORDOR_HOME}",
            """\
function eae() {
    APP_ID=$1
    cd $ENV_HOME/apps/$1/current
    . $ENV_HOME/venvs/$1/bin/activate
}"""
        ]
    )

    os.environ['ENV_HOME'] = MORDOR_HOME

    for dir in [
        "apps/dm",
        "bin",
        "configs/dm",
        "data/dm",
        "logs/dm",
        "pids",
        "temp",
        "venvs/dm"
    ]:
        os.makedirs(os.path.join(MORDOR_HOME, dir), exist_ok=True)
    print("")
    print("")


def setup_dm_server(config):
    print("**********************************************")
    print("*              Setup DataManager Server      *")
    print("**********************************************")

    dst = os.path.join(MORDOR_HOME, "apps", APP_NAME, "current")
    if os.path.isdir(dst):
        shutil.rmtree(dst)

    shutil.copytree(os.path.join(SRC_HOME, "server"), dst)

    print("Setup virtual environment")
    venv_dir = os.path.join(MORDOR_HOME, "venvs", APP_NAME)
    setup_venv(venv_dir, requirements=os.path.join(dst, "requirements.txt"))

    config_dir = os.path.join(MORDOR_HOME, "configs", APP_NAME)

    print("Setup mordor configs")
    db_cfg = {
        "server"    : config['mysql']['hostname'],
        "username"  : config['mysql']['username'],
        "password"  : config['mysql']['password'],
        "db_name"   : DJANGO_DB,
    }
    with open(os.path.join(config_dir, "db.json"), "wt") as f:
        json.dump(db_cfg, f)

    django_cfg = {
        "SECRET_KEY": config['django']['SECRET_KEY'],
        "ALLOW_ANONYMOUS_READ": True
    }
    with open(os.path.join(config_dir, "django.json"), "wt") as f:
        json.dump(django_cfg, f)

    shutil.copyfile(
        "scheduler.json", os.path.join(config_dir, "scheduler.json")
    )

    print("Create database for django")
    mysql_cfg = config["mysql"]
    execute_sql(mysql_cfg, f"CREATE SCHEMA IF NOT EXISTS `{DJANGO_DB}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin")

    # Initialize db
    print("Initialize database for django")
    app_home = dst = os.path.join(MORDOR_HOME, "apps", APP_NAME, "current")
    migration_dir = os.path.join(app_home, "main", "migrations")
    if os.path.isdir(migration_dir):
        shutil.rmtree(migration_dir)

    admin_username = config['django']['admin']['username']
    admin_email    = config['django']['admin']['email']
    subprocess.call([
        f"source {venv_dir}/bin/activate; cd {app_home}; python manage.py migrate"
    ], shell=True)
    subprocess.call([
        f"source {venv_dir}/bin/activate; cd {app_home}; python manage.py makemigrations main"
    ], shell=True)
    subprocess.call([
        f"source {venv_dir}/bin/activate; cd {app_home}; python manage.py migrate main"
    ], shell=True)
    print("")
    print("")
    print("**********************************************")
    print("* Please enter web admin password            *")
    print("**********************************************")
    subprocess.call([
        f"source {venv_dir}/bin/activate; cd {app_home}; python manage.py createsuperuser --email {admin_email} --username {admin_username}"
    ], shell=True)

def get_spark_etl_config(config):
    etl = config['etl']
    return {
        "deployer": {
            "class": "spark_etl.vendors.local.LocalDeployer",
            "args": [{}]
        },
        "job_submitter": {
            "class": "spark_etl.vendors.local.PySparkJobSubmitter",
            "args": [
                {
                    "run_dir": etl['runs_dir']
                }
            ]
        },
        "job_run_options": {
        },
        "deploy_base": etl['app_dir']
    }

def setup_data_app(config):
    print("**********************************************")
    print("*              Setup Data Applications       *")
    print("**********************************************")
    print("Setup virtual environment:")
    setup_venv("/root/.venvs/data-apps", [
        "pyspark==3.0.1",
        "spark-etl==0.0.8"
    ])

    etl = config['etl']
    for key in ['app_dir', 'data_dir', 'runs_dir']:
        if os.path.isdir(etl[key]):
            if key in ('app_dir', 'runs_dir', ):
                shutil.rmtree(etl[key])
            # do not delete data, in case user might need it
        os.makedirs(etl[key], exist_ok=True)

    # create a config file
    local_config = get_spark_etl_config(config)
    config_name = os.path.join(etl['app_dir'], "config.json")
    with open(config_name, "w") as f:
        json.dump(local_config, f)

    # now let's build and deploy some apps
    venv_dir = "/root/.venvs/data-apps"
    app_dir = os.path.join(SRC_HOME, "data-apps")
    for app_name in ('generate_trading_samples', 'execute_sql', ):
        subprocess.call([
            f"source {venv_dir}/bin/activate; cd {app_dir}; ./etl.py -a build  -c {config_name} --app-name {app_name}"
        ], shell=True)
        subprocess.call([
            f"source {venv_dir}/bin/activate; cd {app_dir}; ./etl.py -a deploy -c {config_name} --app-name {app_name}"
        ], shell=True)


def setup_jupyter(config):
    print("**********************************************")
    print("*              Setup jupyterlab              *")
    print("**********************************************")
    setup_venv("/root/.venvs/jupyterlab", [
        "jupyterlab==2.2.9", "pyspark==3.0.1", "spark-etl==0.0.8"

    ])

    notebook_cfg = config['notebook']
    notebook_home = notebook_cfg['home']
    if not os.path.isdir(notebook_home):
        os.makedirs(notebook_home, exist_ok=True)

    venv_dir = "/root/.venvs/jupyterlab"
    for f in [
        "/root/.jupyter/jupyter_notebook_config.py.save",
        "/root/.jupyter/jupyter_notebook_config.py"
    ]:
        if os.path.isfile(f):
            os.remove(f)

    subprocess.call([
        f"source {venv_dir}/bin/activate; jupyter notebook --generate-config"
    ], shell=True)

    # move to backup
    os.rename("/root/.jupyter/jupyter_notebook_config.py", "/root/.jupyter/jupyter_notebook_config.py.save")

    def handler(line):
        if line.startswith("#c.NotebookApp.port = "):
            return f"c.NotebookApp.port = {JUPYTER_PORT}"
        if line.startswith("#c.NotebookApp.ip = "):
            return f"c.NotebookApp.ip = '0.0.0.0'"
        if line.startswith("#c.NotebookApp.open_browser = "):
            return f"c.NotebookApp.open_browser = False"
        if line.startswith("#c.NotebookApp.allow_root = "):
            return f"c.NotebookApp.allow_root = True"
        if line.startswith("#c.NotebookApp.notebook_dir = "):
            return f"c.NotebookApp.notebook_dir = '{notebook_home}'"
        return line

    process_config_file(
        "/root/.jupyter/jupyter_notebook_config.py.save",
        "/root/.jupyter/jupyter_notebook_config.py",
        handler
    )



def main():
    with open("config.json", "r") as f:
        config = json.load(f)

    setup_airflow(config)
    setup_mordor(config)
    setup_dm_server(config)
    setup_data_app(config)
    setup_jupyter(config)

    print("")
    print("Please logff and then login")
    print("")

    print("To start airflow, do:")
    print("./start-airflow.sh")
    print("")

    print("To start DataManager, do:")
    print("./start-django.sh")
    print("")

    print("To start jupyterlab, do:")
    print("./start-jupyter.sh")
    print("")


def loader():
    # we need to be launched form virtual environment
    venv = os.environ.get("VIRTUAL_ENV")
    if venv:
        main()
        return

    if not venv:
        if not os.path.isdir("/root/.venvs/setup"):
            setup_venv("/root/.venvs/setup", [
                "mysqlclient==2.0.1"
            ])
        subprocess.call([
            "source /root/.venvs/setup/bin/activate; ./initialize.py;"
        ], shell=True)


if __name__ == '__main__':
    loader()
