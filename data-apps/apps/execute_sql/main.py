from pyspark.sql import SparkSession, SQLContext, Row
from dcs_client import decode_dataset_instance_path

from jinja2 import Template
from dc_client import DataCatalogClient
from datetime import datetime

def register_dataset_instance(dc_config, dsi_full_path, file_type, location, row_count):
    dcc = DataCatalogClient(
        url_base = dc_config['url_base'],
        auth = (dc_config['username'], dc_config['password'])
    )

    dataset_name, major_version, minor_version, dsi_path = decode_dataset_instance_path(dsi_full_path)

    dcc.create_dataset_instance(
        dataset_name, major_version, minor_version,
        dsi_path,
        [{
            'type': file_type,
            'location': location
        }],
        datetime.utcnow(),
        row_count = row_count
    )

def get_dataset_instance_path(dc_config, full_path):
    dcc = DataCatalogClient(
        url_base = dc_config['url_base'],
        auth = (dc_config['username'], dc_config['password'])
    )

    dataset_name, major_version, minor_version, dsi_path = decode_dataset_instance_path(full_path)

    dsi = dcc.get_dataset_instance(dataset_name, major_version, minor_version, dsi_path)

    if dsi is None:
        return None

    if len(dsi['locations']) == 0:
        return None

    return dsi['locations'][0]

def load_table(spark, table):
    # table is compatible with DatasetLocation
    table_type = table['type']
    table_path = table['location']

    if table_type == "json":
        df = spark.read.json(table_path)
    elif table_type == "parquet":
        df = spark.read.parquet(table_path)
    else:
        raise Exception(f"Unrecognized table type: {table_type}")
    return df

def write_table(spark, df, table, mode='overwrite'):
    # table is compatible with DatasetLocation
    table_type = table['type']
    table_path = table['location']
    # TODO: make coalesce configurable

    if table_type == "json":
        df.coalesce(1).write.mode(mode).format('json').save(table_path)
    elif table_type == "parquet":
        df.coalesce(1).write.mode(mode).format('parquet').save(table_path)
    else:
        raise Exception(f"Unrecognized table type: {table_type}")

def resolve(text, context):
    t = Template(text)
    return t.render(context)

def execute_step(spark, step, dc_config, app_args, pipeline_group_context):
    print(f"execute step: {step['name']}")

    # load imports
    print("loading imports:")
    for imp in step.get('imports', []):
        dataset_instance = resolve(imp['dsi_name'], pipeline_group_context)
        dsi_location = get_dataset_instance_path(dc_config, dataset_instance)

        df = load_table(spark, dsi_location)
        df.createOrReplaceTempView(imp['alias'])
        print(f"loading imports: {imp['alias']} ==> {dsi_location}")
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
        write_table(spark, df, table, mode=output['write_mode'])
    else:
        print(f"Won't save query result")

    # register with dcs??
    register_dsi_full_path = output.get("register_dataset_instance")
    if register_dsi_full_path:
        register_dsi_full_path = resolve(register_dsi_full_path, pipeline_group_context)
        location = resolve(output['location'], pipeline_group_context)
        print(f"register output: register_dsi_full_path = {register_dsi_full_path}")
        print(f"register output: type = {output['type']}")
        print(f"register output: location = {location}")
        register_dataset_instance(
            dc_config,
            register_dsi_full_path,
            output['type'],
            location,
            df.count(),
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
    app_args = input_args['app_args']
    pipeline_group_context = input_args['pipeline_group_context']

    for step in app_args['steps']:
        execute_step(spark, step, dc_config, app_args, pipeline_group_context)

