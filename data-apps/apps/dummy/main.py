import json

from pyspark.sql import SparkSession, SQLContext, Row
from dc_client import DataCatalogClient

from dm_spark_lib import load_asset

def print_json(title, payload):
    print(title)
    print("------------------------------------------")
    print(f"\n{json.dumps(payload, indent=4, separators=(',', ': '))}")
    print("------------------------------------------")


##################################################################
# input_args
# dc_config : dict, the data catalog config
# app_args  : dict, application specific args
# pipeline_group_context: the pipeline group's context
##################################################################
def main(spark, input_args):
    print_json("input_args", input_args)

    dc_config = input_args['dc_config']
    dcc = DataCatalogClient(
        url_base = dc_config['url_base'],
        auth = (dc_config['username'], dc_config['password'])
    )

    # df = load_asset(spark, dcc, "tradings:1.0:1:/2020-10-06_NASDAQ")
    df = load_asset(spark, dcc, "tradings:1.0:1:/2020-10-06")
    df.show()

    print("Done")
    return {"status": "ok"}
