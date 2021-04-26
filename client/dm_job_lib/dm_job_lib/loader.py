import json
from datetime import datetime
import os

ASK_TOPIC_REGISTER_ASSET  = "register_asset"
ASK_TOPIC_REGISTER_VIEW   = "register_view"
ASK_TOPIC_GET_ASSET       = "get_asset"
ASK_TOPIC_GET_DATA_REPO   = "get_data_repo"

class Loader:
    # dcc is either DataCatalogClient or DataCatalogClientProxy
    def __init__(self, dcc):
        self.dcc = dcc

    #####################################################################
    # Load bunch of tables with same structure
    #####################################################################
    def _union_loader(self, spark,  args):
        df = None
        for asset_path in args['asset_paths']:
            if df is None:
                df = self.load_asset(spark=spark, asset_path=asset_path)
            else:
                df = df.union(self.load_asset(spark=spark, asset_path=asset_path))
        return df

    def _get_loader(self, name):
        if name == "union":
            return self._union_loader
        raise Exception(f"Loader {name} does not exist!")

    #####################################################################
    # Load a view
    #####################################################################
    def load_view(self, *, spark, loader_name, loader_args):
        loader = self._get_loader(loader_name)
        return loader(spark, loader_args)

    def load_asset(self, *, spark, asset_path):
        df, _ = self.load_asset_ex(spark=spark,  asset_path=asset_path)
        return df

    def load_asset_ex(self, *, spark, asset_path):
        # same as load_asset, but it return the asset path with revision as well
        # dcc: data catalog client
        segs = asset_path.split(":")
        if len(segs) == 4:
            dataset_name, major_version, minor_version, asset_name = segs
            revision = None
        elif len(segs) == 5:
            dataset_name, major_version, minor_version, asset_name, revision = segs
        else:
            raise Exception(f"Asset with path {asset_path} is malformed!")

        asset = self.dcc.get_asset(
            dataset_name=dataset_name,
            major_version=major_version,
            minor_version=int(minor_version),
            name=asset_name,
            revision=revision,
            spark=spark
        )
        if asset is None:
            raise Exception(f"Asset with path {asset_path} does not exist!")

        loader_str = asset.get("loader")
        if not loader_str:
            # we only load from 1st location
            if len(asset['locations']) == 0:
                raise Exception(f"Asset with path {dsi_path} does not have data!")
            location = asset['locations'][0]
            repo = location.get("repo")

            if repo is None or (repo['type'] == 1 or repo['type'] == 2):
                table_type = location['type']
                if repo is None:
                    table_path = location['location']
                else:
                    repo_context = json.loads(repo['context'])
                    base_url = repo_context['base_url']
                    if base_url.endswith('/'):
                        base_url = base_url[:-1]
                    table_path = os.path.join(base_url, location['location'])

                if table_type == "json":
                    df = spark.read.json(table_path)
                elif table_type == "parquet":
                    df = spark.read.parquet(table_path)
                else:
                    raise Exception(f"Unrecognized table type: {table_type}")
                return df, f"{dataset_name}:{major_version}:{minor_version}:{asset_name}:{asset['revision']}"

            # JDBC case
            if repo['type'] == 3:
                repo_context = json.loads(repo['context'])
                url = repo_context['url']
                user = repo_context['user']
                password = repo_context['password']
                query = repo_context.get('query')
                dbtable = repo_context.get('dbtable')
                if dbtable is not None:
                    df = spark.read \
                        .format("jdbc") \
                        .option("url", url) \
                        .option("dbtable", dbtable) \
                        .option("user", user) \
                        .option("password", password) \
                        .load()
                    return df, f"{dataset_name}:{major_version}:{minor_version}:{path}:{di['revision']}"
                if query is not None:
                    df = spark.read \
                        .format("jdbc") \
                        .option("url", url) \
                        .option("query", query) \
                        .option("user", user) \
                        .option("password", password) \
                        .load()
                    return df, f"{dataset_name}:{major_version}:{minor_version}:{path}:{di['revision']}"
                raise Exception("Neither query nor dbtable is provided")

            raise Exception(f"Unrecognized repo type: {repo['type']}")

        loader = json.loads(loader_str)
        # we can use a loader
        loader_name = loader['name']
        loader_args = loader['args']
        return self.load_view(spark=spark, loader_name=loader_name, loader_args=loader_args), f"{dataset_name}:{major_version}:{minor_version}:{asset_name}:{asset['revision']}"

    def _write_to_fs(self, df, table_type, table_path, mode, coalesce):
        if coalesce is not None:
            df = df.coalesce(coalesce)

        if table_type == "json":
            df.write.mode(mode).format('json').save(table_path)
        elif table_type == "parquet":
            df.write.mode(mode).format('parquet').save(table_path)
        else:
            raise Exception(f"Unrecognized table type: {table_type}")

    def write_asset(self, *, spark, df, location, mode='error', coalesce=1):
        # possible mode
        #   append
        #   overwrite
        #   ignore
        #   error
        # table is compatible with DatasetLocation
        table_path = location['location']
        table_type = location.get('type')
        repo_name = location.get('repo_name')

        if repo_name is None:
            self._write_to_fs(df, table_type, table_path, mode, coalesce)
            return

        repo = self.dcc.get_data_repo(name=repo_name, spark=spark)
        if repo['type'] == 1 or repo['type'] == 2:
            repo_context = json.loads(repo['context'])
            base_url = repo_context['base_url']
            if base_url.endswith('/'):
                base_url = base_url[:-1]
            table_path = os.path.join(base_url, location['location'])

            self._write_to_fs(df, table_type, table_path, mode, coalesce)
            return

        if repo['type'] == 3:
            repo_context = json.loads(repo['context'])
            url = repo_context['url']
            user = repo_context['user']
            password = repo_context['password']
            dbtable = table_path
            df.write \
                .format("jdbc") \
                .mode(mode) \
                .option("url", url) \
                .option("dbtable", dbtable) \
                .option("user", user) \
                .option("password", password) \
                .save()
            return

        raise Exception("Unrecognized repo type")

    ##############################################################################
    # Register dataset instance
    # - it will create dataset if not exist, user need to fill in description latter
    ##############################################################################
    def register_asset(self, *, spark, asset_path, team, file_type, location, row_count,
                       schema, sample_data=[],
                       data_time = None, src_asset_paths = [],
                       application_id = None, application_args = None, repo_name = None):

        if data_time is None:
            effective_data_time = datetime.utcnow()
        else:
            effective_data_time = data_time

        dataset_name, major_version, minor_version, asset_name = asset_path.split(":")
        dataset = self.dcc.get_dataset(
            name=dataset_name,
            major_version=major_version,
            minor_version=int(minor_version),
            spark=spark)
        if dataset is None:
            dataset = self.dcc.create_dataset(
                name=dataset_name,
                major_version=major_version,
                minor_version=int(minor_version),
                description="-- Placeholder --",
                team=team,
                spark=spark)

        asset = self.dcc.create_asset(
            dataset_name=dataset_name,
            major_version=major_version,
            minor_version=int(minor_version),
            name=asset_name,
            locations = [{
                'repo_name': repo_name,
                'type': file_type,
                'location': location
            }],
            data_time=effective_data_time,
            row_count = row_count,
            src_asset_paths = src_asset_paths,
            application_id = application_id,
            application_args = application_args,
            spark=spark
        )
        self.dcc.set_dataset_schema_and_sample_data(
            id=dataset['id'],
            schema=json.dumps(schema),
            sample_data=json.dumps(sample_data),
            spark=spark
        )
        return asset


    def register_view(self, *, spark, asset_path, team, loader_name, loader_args, row_count,
                      schema, sample_data=[],
                      data_time = None, src_asset_paths = [],
                      application_id = None, application_args = None):
        if data_time is None:
            effective_data_time = datetime.utcnow()
        else:
            effective_data_time = data_time

        dataset_name, major_version, minor_version, asset_name = asset_path.split(":")

        dataset = self.dcc.get_dataset(
            name=dataset_name,
            major_version=major_version,
            minor_version=int(minor_version),
            spark=spark)
        if dataset is None:
            dataset = self.dcc.create_dataset(
                name=dataset_name,
                major_version=major_version,
                minor_version=int(minor_version),
                description="-- Placeholder --",
                team=team,
                spark=spark)

        asset = self.dcc.create_asset(
            dataset_name=dataset_name,
            major_version=major_version,
            minor_version=int(minor_version),
            name=asset_name,
            locations=[],
            data_time=effective_data_time,
            row_count = row_count,
            loader = json.dumps({
                "name": loader_name,
                "args": loader_args,
            }),
            src_asset_paths = src_asset_paths,
            application_id = application_id,
            application_args = application_args,
            spark=spark
        )
        self.dcc.set_dataset_schema_and_sample_data(
            id=dataset['id'],
            schema=json.dumps(schema),
            sample_data=json.dumps(sample_data),
            spark=spark
        )
        return asset
