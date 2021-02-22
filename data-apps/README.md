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

## you need to have config at ~/.dmbuild/data-apps/configs.json
- I have the same configs at configs directory
</details>

# build
`./etl.py -a build --app-name <application_name>`
- Here, the application_name is the directory name under `apps` directory.

# deploy
`./etl.py -a deploy --app-name <application_name>`

# run
`./etl.py -a run --app-name <application_name> --run_args <json_filename>`
- runs the application
- the content of the json_filename will be passed to application as runtime arguments

# Test app: generate_trading_samples
```
# generate nasdaq sample data

# Generate sample stock for NASDAQ
./etl.py -a run -p generate_trading_samples --run-args tests/generate_trading_samples_nasdaq.json

# Generate sample stock for NYSE
./etl.py -a run -p generate_trading_samples --run-args tests/generate_trading_samples_nyse.json

# Generate a view that unions two exchange
./etl.py -a run -p generate_trading_samples --run-args tests/generate_trading_samples.json

```

# Test app: execute_sql
```
# generate top 3 stocks by trading volumn, write to dataset top_picks
./etl.py -a run -p execute_sql --run-args tests/execute_sql.json
```

# spark_cli
```
This application allows you to interact with spark job interactively.
./etl.py -a run -p spark_cli --cli-mode
```