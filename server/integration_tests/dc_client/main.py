import json
from uuid import UUID
import logging
from datetime import datetime

from dc_client import DataCatalogClient
from main.models import Dataset, Asset, DataRepo, DataLocation

logger = logging.getLogger("test-dc-client")

def log_json(title, obj):
    logger.info(f"{title}\n{json.dumps(obj, indent=4)}\n")

def delete_model(model_class, pk):
    try:
        model = model_class.objects.get(pk=pk)
        model.delete()
    except model_class.DoesNotExist:
        pass

def delete_many(query):
    for i in query:
        i.delete()

def test_create_dataset(dcc):
    dataset_id = None
    try:
        r = dcc.create_dataset(
            name="test_dataset",
            major_version="1.0",
            minor_version=1,
            description="Blah...",
            team="admins"
        )
        log_json("return from create_dataset", r)
        dataset_id = r['id']

        r = dcc.set_dataset_schema_and_sample_data(
            id=dataset_id,
            schema='{"x": 1}',
            sample_data='{"x": 1}'
        )
        log_json("return from set_dataset_schema_and_sample_data", r)

        r = dcc.get_dataset(
            name="test_dataset",
            major_version="1.0",
            minor_version=1,
        )
        log_json("return from get_dataset", r)

    finally:
        delete_model(Dataset, dataset_id)

def test_create_asset(dcc):
    dataset_id = None
    asset_id = None
    data_repo = None
    try:
        r = dcc.create_dataset(
            name="test_dataset",
            major_version="1.0",
            minor_version=1,
            description="Blah...",
            team="admins"
        )
        log_json("return from create_dataset", r)
        dataset_id = r['id']

        tmp_data_repo = DataRepo(
            tenant_id=1,
            name="test_main",
            description="blah...",
            type=DataRepo.RepoType.HDFS.value,
            context="{}"
        )
        tmp_data_repo.save()
        data_repo = tmp_data_repo

        r = dcc.get_data_repo(name="test_main")
        log_json("return from get_data_repo", r)

        r = dcc.create_asset(
            dataset_name="test_dataset",
            major_version="1.0",
            minor_version=1,
            name="2021-04-25",
            locations=[
                {
                    "type": "parquet",
                    "location": "s3://foo/bar.parquet",
                    "size": 100,
                    "repo_name": "test_main"
                }
            ],
            data_time=datetime(2021, 4, 25, 0, 0, 0),
            row_count=500
        )
        asset_id = r['id']
        log_json("return from create_asset", r)

        r = dcc.delete_asset(id=asset_id)
        log_json("return from delete_asset", r)

    finally:
        if asset_id is not None:
            delete_many(
                DataLocation.objects.filter(asset_id=asset_id)
            )
        if dataset_id is not None:
            delete_many(
                Asset.objects.filter(dataset_id=dataset_id)
            )
            delete_model(Dataset, dataset_id)

        if data_repo is not None:
            data_repo.delete()



def run_tests(config):
    # Make it config driven
    dcc = DataCatalogClient(
        url_base = config['api_url_base'],
        tenant_id = config['tenant_id'],
        auth = (config['username'], config['password'])
    )

    logger.info("Test: create dataset")
    test_create_dataset(dcc)

    logger.info("Test: create asset")
    test_create_asset(dcc)

    logger.info("********************************************")
    logger.info("*                                          *")
    logger.info("*      Test completed successfully!        *")
    logger.info("*                                          *")
    logger.info("********************************************")
