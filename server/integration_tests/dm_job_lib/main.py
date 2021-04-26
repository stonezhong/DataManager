import os
import shutil
import logging
import json
from datetime import datetime

from pyspark.sql import SparkSession
from dc_client import DataCatalogClient
from dm_job_lib import Loader, get_dataframe_sample_data
from main.models import Dataset, Asset, DataRepo, DataLocation, AssetDep


logger = logging.getLogger("test-dm-job-lib")

def delete_model(model_class, pk):
    try:
        model = model_class.objects.get(pk=pk)
        model.delete()
    except model_class.DoesNotExist:
        pass

def delete_many(query):
    for i in query:
        i.delete()


def create_json_data(filename):
    if os.path.isfile(filename):
        os.remove(filename)
    with open(filename, "wt") as data_f:
        for i in range(0, 100):
            d = {
                "name": "IBM",
                "price": i * 20,
            }
            print(json.dumps(d), file=data_f)


def test1(spark, loader, config):
    # Purpose:
    # Test load_asset_ex, for json and parquet
    dataset_id = None
    asset_id1 = None
    asset_id2 = None
    asset_id3 = None
    data_repo = None

    try:
        df1 = spark.read.json(os.path.join(config['tempdir'], 'data.json'))
        df2 = spark.read.parquet(os.path.join(config['tempdir'], 'data.parquet'))
        df3 = df1.union(df2)

        # create dataset
        r = loader.dcc.create_dataset(
            name="test_dataset",
            major_version="1.0",
            minor_version=1,
            description="Blah...",
            team="admins"
        )
        dataset_id = r['id']

        # creare data repo
        context={
            "type": 2,
            "base_url": config['tempdir']
        }
        tmp_data_repo = DataRepo(
            tenant_id=1,
            name="test_main",
            description="blah...",
            type=DataRepo.RepoType.HDFS.value,
            context=json.dumps(context)
        )
        tmp_data_repo.save()
        data_repo = tmp_data_repo

        r = loader.register_asset(
            spark=spark,
            asset_path="test_dataset:1.0:1:2021-04-25a",
            team="admins",
            file_type="json",
            location="data.json",
            row_count=df1.count(),
            schema=df1.schema.json(),
            sample_data=get_dataframe_sample_data(df1),
            data_time = datetime(2021, 4, 25, 0, 0, 0),
            repo_name="test_main"
        )
        asset_id1 = r['id']

        r = loader.register_asset(
            spark=spark,
            asset_path="test_dataset:1.0:1:2021-04-25b",
            team="admins",
            file_type="parquet",
            location="data.parquet",
            row_count=df1.count(),
            schema=df1.schema.json(),
            sample_data=get_dataframe_sample_data(df1),
            data_time = datetime(2021, 4, 25, 0, 0, 0),
            repo_name="test_main"
        )
        asset_id2 = r['id']

        r = loader.register_view(
            spark=spark,
            asset_path="test_dataset:1.0:1:2021-04-25",
            team="admins",
            loader_name="union",
            loader_args={
                "asset_paths": [
                    "test_dataset:1.0:1:2021-04-25a:0",
                    "test_dataset:1.0:1:2021-04-25b:0",
                ]
            },
            row_count=df3.count(),
            schema=df3.schema.json(),
            sample_data=get_dataframe_sample_data(df3),
            src_asset_paths=[
                "test_dataset:1.0:1:2021-04-25a:0",
                "test_dataset:1.0:1:2021-04-25b:0"
            ],
        )
        asset_id3 = r['id']

        df1, full_asset_path = loader.load_asset_ex(spark=spark, asset_path="test_dataset:1.0:1:2021-04-25a")
        df1.show()
        print(f"count={df1.count()}")
        print(f"full_asset_path={full_asset_path}")

        df2, full_asset_path = loader.load_asset_ex(spark=spark, asset_path="test_dataset:1.0:1:2021-04-25b")
        df2.show()
        print(f"count={df2.count()}")
        print(f"full_asset_path={full_asset_path}")

        df3, full_asset_path = loader.load_asset_ex(spark=spark, asset_path="test_dataset:1.0:1:2021-04-25")
        df3.show()
        print(f"count={df3.count()}")
        print(f"full_asset_path={full_asset_path}")

        loader.write_asset(spark=spark, df=df1, location={
            "type": "json",
            "location": "data1.json",
            "repo_name": "test_main",
        }, mode="overwrite")
        loader.write_asset(spark=spark, df=df2, location={
            "type": "parquet",
            "location": "data1.parquet",
            "repo_name": "test_main",
        }, mode="overwrite")

    finally:
        if asset_id3 is not None:
            delete_many(
                AssetDep.objects.filter(dst_asset_id=asset_id3)
            )
        if asset_id1 is not None:
            delete_many(
                DataLocation.objects.filter(asset_id=asset_id1)
            )
        if asset_id2 is not None:
            delete_many(
                DataLocation.objects.filter(asset_id=asset_id2)
            )
        if asset_id3 is not None:
            delete_many(
                DataLocation.objects.filter(asset_id=asset_id3)
            )
        if dataset_id is not None:
            delete_many(
                Asset.objects.filter(dataset_id=dataset_id)
            )
            delete_model(Dataset, dataset_id)
        if data_repo is not None:
            data_repo.delete()

def run_tests(config):
    spark = SparkSession.builder.appName("test-dm-job-lib").getOrCreate()

    # generate a json file, a parquet file
    json_filename   = os.path.join(config['tempdir'], "data.json")
    parquet_dirname = os.path.join(config['tempdir'], "data.parquet")
    create_json_data(json_filename)
    if os.path.isdir(parquet_dirname):
        shutil.rmtree(parquet_dirname)
        df = spark.read.json(json_filename)
        df.write.parquet(parquet_dirname)

    dcc = DataCatalogClient(
        url_base = config['api_url_base'],
        tenant_id = config['tenant_id'],
        auth = (config['username'], config['password'])
    )
    loader = Loader(dcc)
    try:
        test1(spark, loader, config)
        logger.info("********************************************")
        logger.info("*                                          *")
        logger.info("*      Test completed successfully!        *")
        logger.info("*                                          *")
        logger.info("********************************************")
    finally:
        spark.stop()
