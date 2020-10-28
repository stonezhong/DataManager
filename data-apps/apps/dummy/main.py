import json

from pyspark.sql import SparkSession, SQLContext, Row

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
    print("Done")
    return {"status": "ok"}
