from spark_etl.utils import cli_main

##################################################################
# CLI Application
##################################################################
def main(spark, input_args, sysops={}):
    return cli_main(spark, input_args, sysops)
