from pyspark.sql import SparkSession, SQLContext, Row

from jinja2 import Template
from dc_client import DataCatalogClient
from datetime import datetime

from dm_job_lib import load_asset, print_json, write_asset, register_dataset_instance



def resolve(text, context):
    t = Template(text)
    return t.render(context)

def execute_step(spark, step, dcc, app_args, pipeline_group_context):
    print(f"execute step: {step['name']}")

    # load imports
    print("loading imports:")
    for imp in step.get('imports', []):
        dataset_instance = resolve(imp['dsi_name'], pipeline_group_context)
        df = load_asset(spark, dcc, dataset_instance)
        df.createOrReplaceTempView(imp['alias'])
        print(f"loading imports: {imp['alias']} ==> {dataset_instance}")
    print("loading imports: done")

    # now run the query
    print("execute query")
    print(step['sql'])
    df = spark.sql(step['sql'])
    alias = step.get('alias')
    if alias:
        print(f"query result known as: {alias}")
        df.createOrReplaceTempView(alias)
    else:
        print(f"query result is anonymous")

    output = step.get("output", {})
    if output:
        location = resolve(output['location'], pipeline_group_context)
        print(f"save query result: {location}")
        table = {
            'type': output['type'],
            'location': location
        }
        write_asset(spark, df, table, mode=output['write_mode'])
    else:
        print(f"Won't save query result")

    # register with dcs??
    register_dsi_full_path = output.get("register_dataset_instance")
    if register_dsi_full_path:
        register_dsi_full_path = resolve(register_dsi_full_path, pipeline_group_context)
        location = resolve(output['location'], pipeline_group_context)

        data_time_raw = output.get("data_time")
        if data_time_raw:
            data_time_str = resolve(data_time_raw, pipeline_group_context)
            data_time = datetime.strptime(data_time_str, "%Y-%m-%d %H:%M:%S")
        else:
            data_time = None

        print(f"register output: register_dsi_full_path = {register_dsi_full_path}")
        print(f"register output: type = {output['type']}")
        print(f"register output: location = {location}")
        print(f"register output: data_timme = {data_timme}")
        register_dataset_instance(
            dcc,
            register_dsi_full_path,
            output['type'],
            location,
            df,
            data_time = data_time
        )
    else:
        print(f"register output: won't")


    print("Done")


##################################################################
# input_args
# dc_config: the data catalog config
# app_args:  application args, stored in pipline context
# pipeline_group_context: the pipeline group's context
##################################################################
def main(spark, input_args):
    print("running App: execute_sql")

    dc_config = input_args['dc_config']
    dcc = DataCatalogClient(
        url_base = dc_config['url_base'],
        auth = (dc_config['username'], dc_config['password'])
    )

    app_args = input_args['app_args']
    pipeline_group_context = input_args['pipeline_group_context']

    for step in app_args['steps']:
        execute_step(spark, step, dcc, app_args, pipeline_group_context)

