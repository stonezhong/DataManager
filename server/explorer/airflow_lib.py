import os
import subprocess
import json
import requests
import time
from DataCatalog.settings import AIRFLOW_VENV, AIRFLOW_API_BASE_URL

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




# Create a DAG
# the python code is stored in content
# when run the code, the dag created should have name dag_name
# the python code should be saved as filename
def create_dag(filename, dag_id, content):
    airflow_home = os.environ['AIRFLOW_HOME']
    dag_dir = os.path.join(airflow_home, 'dags')
    dag_filename = os.path.join(dag_dir, filename)

    # step 1: create the dag file
    print(f"create dag file: {dag_filename}")
    with open(dag_filename, "wt") as dag_f:
        dag_f.write(content)

    # Do not run the day file, let airflow to run it so we know when airflow picked up the new version
    # # step 2: run the dag (make sure it does not fail)
    # print("Invoke the dag")
    # p = subprocess.run(
    #     [f"{AIRFLOW_VENV}/bin/python", f"{dag_filename}"],
    #     check=True
    # )



def unpause_dag(dag_id):
    return subprocess.run(
        [f"{AIRFLOW_VENV}/bin/airflow", "unpause", dag_id],
    )


def trigger_dag(dag_id, config):
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

    r.raise_for_status()

    # sample response
    # {
    #   "execution_date": "2020-09-28T15:31:40+00:00",
    #   "message": "Created <DagRun stock-min-max @ 2020-09-28 15:31:40+00:00: manual__2020-09-28T15:31:40+00:00, externally triggered: True>",
    #   "run_id": "manual__2020-09-28T15:31:40+00:00"
    # }
    return r.json()


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
