import os
import subprocess
import json
import requests
import time
from DataCatalog.settings import AIRFLOW_VENV, AIRFLOW_API_BASE_URL

AIRFLOW_HOME = os.environ['AIRFLOW_HOME']

######################################
# This lib has functions to interact with airflow
# Assumptions:
# (1) Airflow is installed on local machine
# (2) dags are at $AIRFLOW_HOME/dags directory
######################################

def is_dag_exist(dag_id):
    p = subprocess.run(
        [f"{AIRFLOW_VENV}/bin/airflow", "list_dags"],
        check=True,
        stdout=subprocess.PIPE
    )
    lines = p.stdout.decode("utf-8").split("\n")
    # look for DAGS
    has_dags = False
    for i, line in enumerate(lines):
        line = line.rstrip()
        if not has_dags:
            if line == "DAGS":
                has_dags = True
        else:
            if line == dag_id:
                return True

    return False

def get_dag_tenant_dir(tenant_id):
    return os.path.join(AIRFLOW_HOME, 'dags', str(tenant_id))


def get_dag_py_filename(tenant_id, pipeline_id):
    return os.path.join(AIRFLOW_HOME, 'dags', str(tenant_id), f"{pipeline_id}.py")

def has_dag_py_file(tenant_id, pipeline_id):
    return os.path.exists(
        get_dag_py_filename(tenant_id, pipeline_id)
    )

def get_dag_info_filename(tenant_id, pipeline_id):
    return os.path.join(AIRFLOW_HOME, 'dags', str(tenant_id), f"{pipeline_id}.json")

# Create a DAG
# the python code is stored in content
# when run the code, the dag created should have name dag_name
# the python code should be saved as filename
def create_dag_py(tenant_id, pipeline_id, content):
    os.makedirs(get_dag_tenant_dir(tenant_id), exist_ok=True)
    dag_py_filename = get_dag_py_filename(tenant_id, pipeline_id)
    # step 1: create the dag file
    print(f"create dag file: {dag_py_filename}")
    with open(dag_py_filename, "wt") as dag_f:
        dag_f.write(content)


def delete_dag_info(tenant_id, pipeline_id):
    dag_info_filename = get_dag_info_filename(tenant_id, pipeline_id)
    if os.path.exists(dag_info_filename):
        os.remove(dag_info_filename)


def unpause_dag(dag_id):
    return subprocess.run(
        [f"{AIRFLOW_VENV}/bin/airflow", "unpause", dag_id],
    )


def trigger_dag(dag_id, config):
    for retry in range(0, 12):
        url = f"{AIRFLOW_API_BASE_URL}/dags/{dag_id}/dag_runs"
        config_str = json.dumps({
            "conf": config
        })
        r = requests.post(
            url,
            headers={
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/json',
            },
            data = config_str,
        )
        # when the DAG is just created, sometime airflow return HTTP 400
        # let's sleep for 5 seconds and and retry
        if r.status_code == 400:
            time.sleep(5)
            continue

        # we still surface unknown exceptions
        r.raise_for_status()

        # sample response
        # {
        #   "execution_date": "2020-09-28T15:31:40+00:00",
        #   "message": "Created <DagRun stock-min-max @ 2020-09-28 15:31:40+00:00: manual__2020-09-28T15:31:40+00:00, externally triggered: True>",
        #   "run_id": "manual__2020-09-28T15:31:40+00:00"
        # }
        return r.json()

    raise Exception(f"Unable to trigger dag {dag_id} after too many retries")


def get_dag_run_status(dag_id, run_id):
    # run_id is the execute_date returned from the trigger_dag
    url = f"{AIRFLOW_API_BASE_URL}/dags/{dag_id}/dag_runs/{run_id}"
    r = requests.get(
        url,
        headers={
            'Cache-Control': 'no-cache',
        },
    )

    r.raise_for_status()

    # sample response
    # {
    #   "state": "success"
    # }
    return r.json()
