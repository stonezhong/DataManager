# What is a Data Application?

A data application is a spark application that moves data and transforms data. It has the following characteristics: (we are only talking about PySpark here)
- The code can run on any Apache Spark platform without modification. Including:
    - You setup your own Apache Spark cluster
    - Apache Spark Cluster in Databricks
    - Apache Spark Cluster in AWS EMR
    - Apache Spark Cluster in OCI DataFlow
- It has a `main` function in the `main` module, with following arguments
    - spark, the spark session
    - input_args: a dict, for the runtime arguments
- The `main` function can return a JSON object, and the job summitter's run method will return that value
- You can specify the python dependency in requirements.txt, those packages will be installed in Apache Spark.
- It has a standard way of build, deploy and run using the etl.py tool

# Directory structure
- All data applications live in apps directory


# setup build environment
## Create a python virtualenv

```
mkdir .venv
python3 -m venv .venv
source .venv/bin/activate
pip install pip setuptools --upgrade
pip install wheel
pip install -r requirements.txt
```

- You need to enter this virtual environment when you run etl.py latter.

## update your `config.json`
Here is an example:
- livy section is about your livy endpoint, we need it to submit spark job
- bridge: we will scp files to bridge and run hdfs command to copy files to HDFS for deployment
- deploy_base: the location built artifacts will be deployed
- run_dir: the place to store runtime information for the spark job
- You should be able to ssh to the bridge machine without password, you may need to config you `~/.ssh/config` file
```
{
    "livy": {
        "service_url": "http://10.0.0.18:60008/",
        "username": "root",
        "password": "changeme"
    },
    "bridge": {
        "hostname": "spnode1",
        "stage_dir": "/root/.stage"
    },
    "deploy_base": "hdfs:///etl/apps",
    "run_dir": "hdfs:///etl/runs"
}
```
</details>

# build
`./etl.py -a build --app-name <application_name>`
- Here, the application_name is the directory name under `apps` directory.

# deploy
`./etl.py -a deploy --app-name <application_name>`

# run
`./etl.py -a run --app-name <application_name> --run_args <json_filename>`
- runs the application
- the content of the json_filename will be passwd to application as runtime arguments
