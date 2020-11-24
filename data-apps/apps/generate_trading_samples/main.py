import random
from datetime import datetime
import json

from pyspark.sql import SparkSession, SQLContext, Row
from dc_client import DataCatalogClient

from dm_job_lib import load_asset, print_json, write_asset, register_dataset_instance, \
    register_dataset_instance_for_view


STOCK_LIST = {
    'MSFT': 200.0,
    'INTC': 51.0,
    'AMD' : 84.0,
    'GE'  : 6.17,
    'BAC' : 24.0,
    'JPM' : 98.0
}



##################################################################
# input_args
# dc_config: the data catalog config
# app_args:  application args, stored in pipline context
# pipeline_group_context: the pipeline group's context
##################################################################
def main(spark, input_args):
    print("Generate sample trading data")

    dc_config = input_args['dc_config']
    dcc = DataCatalogClient(
        url_base = dc_config['url_base'],
        auth = (dc_config['username'], dc_config['password'])
    )

    print_json("input_args", input_args)

    pipeline_group_context = input_args['pipeline_group_context']
    dt = pipeline_group_context['dt']
    print(f"dt = {dt}")

    app_args = input_args['app_args']
    action = app_args['action']
    market = app_args.get('market')
    data_root = app_args.get("data_root")

    if action == 'import-data':
        random.seed()
        Trade = Row("market", "type", "symbol", "amount", "price", "commission")
        trades = []
        for i in range(0, 1000):
            type = ["BUY", "SELL"][random.randint(0, 1)]
            symbol = list(STOCK_LIST.keys())[random.randint(0, len(STOCK_LIST)-1)]
            amount = random.randint(1, 500)
            rate = 1 + (random.random() - 0.5)/5.0
            price = round(STOCK_LIST[symbol]*rate, 2)
            commission = round(amount / 100.0 + 9.0, 2)

            trade = Trade(market, type, symbol, amount, price, commission)
            trades.append(trade)

        df = spark.createDataFrame(trades)
        file_to_write = f"{data_root}/tradings/{dt}/{market}.parquet"
        df.write.mode("overwrite").parquet(file_to_write)

        print(f"Writing to {file_to_write}")

        register_dataset_instance(
            dcc, f'tradings:1.0:1:/{dt}_{market}',
            'parquet',
            file_to_write,
            df)
    elif action == 'create-view':
        loader = app_args['loader']
        loader_name = loader['name']
        loader_args = loader['args']
        # register the view after all the market are uploaded
        dc_config = input_args['dc_config']
        pipeline_group_context = input_args['pipeline_group_context']
        dt = pipeline_group_context['dt']

        dcc = DataCatalogClient(
            url_base = dc_config['url_base'],
            auth = (dc_config['username'], dc_config['password'])
        )


        data_time = datetime.strptime(dt, "%Y-%m-%d")

        register_dataset_instance_for_view(
            spark, dcc, f'tradings:1.0:1:/{dt}',
            loader_name,
            loader_args
        )

    print("Done")
