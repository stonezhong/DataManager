import random
from datetime import datetime
import json

from pyspark.sql import SparkSession, SQLContext, Row
from dc_client import DataCatalogClient

from dlib import load_asset, print_json

##################################################################
# input_args
# dc_config: the data catalog config
# app_args:  application args, stored in pipline context
# pipeline_group_context: the pipeline group's context
##################################################################
def main(spark, input_args):
    print("Get Dataset Schema")
    print_json("input_args", input_args)

    dc_config = input_args['dc_config']
    dcc = DataCatalogClient(
        url_base = dc_config['url_base'],
        auth = (dc_config['username'], dc_config['password'])
    )

    app_args = input_args['app_args']
    dsi_path = app_args['dsi_path']

    df = load_asset(spark, dcc, dsi_path)

    return {
        "schema": df.schema.jsonValue()
    }
