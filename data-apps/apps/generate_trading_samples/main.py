import random
from datetime import datetime
import json

from pyspark.sql import SparkSession, SQLContext, Row
from dc_client import DataCatalogClient

STOCK_LIST = {
    'MSFT': 200.0,
    'INTC': 51.0,
    'AMD' : 84.0,
    'GE'  : 6.17,
    'BAC' : 24.0,
    'JPM' : 98.0
}


def print_json(title, payload):
    print(title)
    print("------------------------------------------")
    print(f"\n{json.dumps(payload, indent=4, separators=(',', ': '))}")
    print("------------------------------------------")

def register_dataset_instance(input_args, market, df):
    dc_config = input_args['dc_config']
    pipeline_group_context = input_args['pipeline_group_context']
    dt = pipeline_group_context['dt']

    dcc = DataCatalogClient(
        url_base = dc_config['url_base'],
        auth = (dc_config['username'], dc_config['password'])
    )


    data_time = datetime.strptime(dt, "%Y-%m-%d")
    dcc.create_dataset_instance(
        'tradings', '1.0', 1,
        f"/{dt}_{market}", [{
            'type': 'parquet',
            'location': f'hdfs:///data/tradings/{dt}/{market}.parquet'
        }],
        data_time,
        row_count = df.count()
    )

##################################################################
# input_args
# dc_config: the data catalog config
# app_args:  application args, stored in pipline context
# pipeline_group_context: the pipeline group's context
##################################################################
def main(spark, input_args):
    print("Generate sample trading data")
    print_json("input_args", input_args)

    pipeline_group_context = input_args['pipeline_group_context']
    dt = pipeline_group_context['dt']
    print(f"dt = {dt}")

    app_args = input_args['app_args']
    market = app_args.get('market')

    if market:
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
        df.write.mode("overwrite").parquet(f"/data/tradings/{dt}/{market}.parquet")

        print(f"Writing to /data/tradings/{dt}/{market}.parquet")

        register_dataset_instance(input_args, market, df)
    else:
        # register the view after all the market are uploaded
        dc_config = input_args['dc_config']
        pipeline_group_context = input_args['pipeline_group_context']
        dt = pipeline_group_context['dt']

        dcc = DataCatalogClient(
            url_base = dc_config['url_base'],
            auth = (dc_config['username'], dc_config['password'])
        )


        data_time = datetime.strptime(dt, "%Y-%m-%d")
        dcc.create_dataset_instance(
            'tradings', '1.0', 1,
            f"/{dt}", [],
            data_time,
            loader = json.dumps({
                "name": "union",
                "args": {
                    "dsi_paths": [
                        "tradings:1.0:1:{dt}_NASDAQ",
                        "tradings:1.0:1:{dt}_NYSE",
                    ]
                }
            })
        )

    print("Done")
