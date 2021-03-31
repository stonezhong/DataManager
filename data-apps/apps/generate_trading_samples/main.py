import random
from datetime import datetime
import json
import os

from pyspark.sql import SparkSession, SQLContext, Row
from dc_client import DataCatalogClient, DataCatalogClientProxy

from dm_job_lib import Loader, print_json, get_dataframe_sample_data


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
def main(spark, input_args, sysops={}):
    print("Generate sample trading data")

    print_json("input_args", input_args)
    application_id = input_args['application_id']
    tenant_id = input_args['tenant_id']

    app_args = input_args['app_args']
    dt = app_args['dt']
    print(f"dt = {dt}")

    action = app_args['action']

    if input_args.get('dm_offline'):
        dcc = DataCatalogClientProxy(sysops['channel'])
    else:
        dc_config = input_args['dc_config']
        dcc = DataCatalogClient(
            url_base = dc_config['url_base'],
            auth = (dc_config['username'], dc_config['password'])
        )

    loader = Loader(dcc=dcc)

    if action == 'import-data':
        market = app_args['market']
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
        location_to_write = os.path.join(app_args['base_location'], "tradings", dt, f"{market}.parquet")
        loader.write_asset(
            spark,
            tenant_id,
            df,
            {
                "repo_name": app_args["repo"],
                "location": location_to_write,
                "type": "parquet"
            },
            mode="overwrite",
            coalesce=1,
        )

        data_time = datetime.strptime(dt, "%Y-%m-%d")
        sample_data = get_dataframe_sample_data(df)
        dsi = loader.register_asset(
            spark,
            tenant_id,
            f'tradings:1.0:1:/{dt}_{market}', 'trading',
            'parquet', location_to_write,
            df.count(), df.schema.jsonValue(),
            sample_data = sample_data,
            data_time = data_time,
            application_id = application_id,
            application_args = json.dumps(app_args),
            repo_name = app_args['repo'],
        )
        return {
            'dsi_path': f'tradings:1.0:1:/{dt}_{market}:{dsi["revision"]}'
        }
    elif action == 'create-view':
        view_loader = app_args['loader']
        view_loader_name = view_loader['name']
        view_loader_args = view_loader['args']

        data_time = datetime.strptime(dt, "%Y-%m-%d")
        df = loader.load_view(spark, tenant_id, view_loader_name, view_loader_args)
        sample_data = get_dataframe_sample_data(df)
        loader.register_view(
            spark,
            tenant_id,
            f'tradings:1.0:1:/{dt}',
            'trading',
            view_loader_name, view_loader_args,
            df.count(), df.schema.jsonValue(),
            sample_data = sample_data,
            data_time = data_time,
            src_asset_paths = view_loader_args['dsi_paths'],
            application_id = application_id,
            application_args = json.dumps(app_args),
        )

    print("Done")
