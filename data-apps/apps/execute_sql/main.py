import json
from pyspark.sql import SparkSession, SQLContext, Row

from jinja2 import Template
from dc_client import DataCatalogClient
from datetime import datetime

from dm_job_lib import Loader
from dc_client import DataCatalogClientProxy



def resolve(text, context):
    t = Template(text)
    return t.render(context)

def execute_step(spark, step, application_id, loader, team, app_args, pipeline_group_context, src_dict):
    print(f"execute step: {step['name']}")

    src_list = []   # upstream asset path list

    # load imports
    print("loading imports:")
    for imp in step.get('imports', []):
        imp_alias = imp['alias']
        if imp['dsi_name']:
            if imp_alias in src_dict:
                raise Exception(f"View {imp_alias} is already defined")
            dataset_instance = resolve(imp['dsi_name'], pipeline_group_context)
            df, dsi_path = loader.load_asset_ex(spark, dataset_instance)
            df.createOrReplaceTempView(imp_alias)
            src_list.append(dsi_path)
            print(f"loading imports: {imp_alias} ==> {dsi_path}")
        else:
            # we are using an alias already defined
            if imp_alias not in src_dict:
                # this is an alias not yet defined, blow up
                raise Exception(f"View {imp_alias} is not yet defined")
            src_list += src_dict[imp_alias]
    print("loading imports: done")

    # now run the query
    print("execute query")
    print(step['sql'])
    df = spark.sql(step['sql'])
    alias = step.get('alias')
    if alias:
        print(f"query result known as: {alias}")
        if alias in src_dict:
            raise Exception(f"View {alias} is already defined")
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
        loader.write_asset(spark, df, table, mode=output['write_mode'])
        # TODO: if we have alias for output, maybe we should reload it from storage
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
        print(f"register output: data_time = {data_time}")
        dsi = loader.register_asset(
            spark,
            register_dsi_full_path, team,
            output['type'],
            location,
            df.count(), df.schema.jsonValue(),
            data_time = data_time,
            src_asset_paths = sorted(list(set(src_list))),
            application_id = application_id,
            application_args = json.dumps(app_args),
        )
        if alias:
            dataset_name, major_version, minor_version, path = register_dsi_full_path.split(":")
            src_dict[alias] = [f"{dataset_name}:{major_version}:{minor_version}:{path}:{dsi['revision']}"]
    else:
        # query result is not registered
        if alias:
            dataset_name, major_version, minor_version, path = register_dsi_full_path.split(":")
            src_dict[alias] = sorted(list(set(src_list)))
        print(f"register output: won't")


    print("Done")


##################################################################
# input_args
# dc_config: the data catalog config
# app_args:  application args, stored in pipline context
# pipeline_group_context: the pipeline group's context
##################################################################
def main(spark, input_args, sysops={}):
    print("running App: execute_sql")

    server_channel = sysops['channel']

    team = input_args['team']
    if input_args.get('dm_offline'):
        dcc = DataCatalogClientProxy(server_channel)
        loader = Loader(dcc=dcc)
    else:
        dc_config = input_args['dc_config']
        dcc = DataCatalogClient(
            url_base = dc_config['url_base'],
            auth = (dc_config['username'], dc_config['password'])
        )
        loader = Loader(dcc=dcc)

    app_args = input_args['app_args']
    application_id = input_args['application_id']
    pipeline_group_context = input_args['pipeline_group_context']

    src_dict = {}
    # key: table alias
    # value: list of dsi_path (include revision)
    for step in app_args['steps']:
        execute_step(spark, step, application_id, loader, team, app_args, pipeline_group_context, src_dict)

