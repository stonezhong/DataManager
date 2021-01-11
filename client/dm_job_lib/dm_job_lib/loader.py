import json
from datetime import datetime

from dc_client import DataCatalogClient

ASK_TOPIC_REGISTER_ASSET  = "register_asset"
ASK_TOPIC_REGISTER_VIEW   = "register_view"
ASK_TOPIC_GET_ASSET       = "get_asset"
ASK_TOPIC_GET_DATA_REPO   = "get_data_repo"

class Loader:
    # You need to either provide dcc, so we will talk to DM REST API
    # Or if DM is not reachable, you can pass the ask function
    def __init__(self, spark, dcc=None, ask=None):
        self.spark = spark
        self.dcc = dcc
        self.ask = ask

    #####################################################################
    # Load bunch of tables with same structure
    #####################################################################
    def union_loader(self, args):
        df = None
        for dsi_path in args['dsi_paths']:
            if df is None:
                df = self.load_asset(dsi_path)
            else:
                df = df.union(self.load_asset(dsi_path))
        return df

    def get_loader(self, name):
        if name == "union":
            return self.union_loader
        return None

    #####################################################################
    # Load a view
    #####################################################################
    def load_view(self, loader_name, loader_args):
        loader = self.get_loader(loader_name)
        return loader(loader_args)

    def load_asset(self, dsi_path):
        # dcc: data catalog client
        df, _ = self.load_asset_ex(dsi_path)
        return df
    
    def ask_question(self, topic, payload):
        answer = self.ask({
            "topic": topic,
            "payload": payload
        })
        status = answer.get("status")
        if status != "ok":
            exception_name = answer.get("exception_name")
            exception_msg = answer.get("exception_msg")
            raise Exception("Ask is not answered, status: {status}, exception_name: {exception_name}, exception_msg: {exception_msg}")
        return answer['reply']
    
    def load_asset_ex(self, dsi_path):
        # same as load_asset, but it return the asset path with revision as well
        # dcc: data catalog client
        dataset_name, major_version, minor_version, path, revision = (dsi_path.split(":") + [None])[:5]
        if self.dcc:
            di = self.dcc.get_dataset_instance(
                dataset_name, major_version, int(minor_version), path, revision=revision
            )
        else:
            di = self.ask_question(
                ASK_TOPIC_GET_ASSET,
                {
                    "dataset_name": dataset_name,
                    "major_version": major_version,
                    "minor_version": int(minor_version),
                    "path": path,
                    "revision": revision
                }
            )

        if di is None:
            raise Exception(f"data with path {dsi_path} does not exist!")

        loader_str = di.get("loader")
        if not loader_str:
            # we only load from 1st location
            if len(di['locations']) == 0:
                raise Exception(f"data with path {dsi_path} does not exist!")
            location = di['locations'][0]
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
                    table_path = base_url + location['location']

                if table_type == "json":
                    df = self.spark.read.json(table_path)
                elif table_type == "parquet":
                    df = self.spark.read.parquet(table_path)
                else:
                    raise Exception(f"Unrecognized table type: {table_type}")
                return df, f"{dataset_name}:{major_version}:{minor_version}:{path}:{di['revision']}"

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
        return self.load_view(loader_name, loader_args), f"{dataset_name}:{major_version}:{minor_version}:{path}:{di['revision']}"

    def _write_to_fs(self, df, table_type, table_path, mode, coalesce):
        if coalesce is not None:
            df = df.coalesce(coalesce)

        if table_type == "json":
            df.write.mode(mode).format('json').save(table_path)
        elif table_type == "parquet":
            df.write.mode(mode).format('parquet').save(table_path)
        else:
            raise Exception(f"Unrecognized table type: {table_type}")

    def write_asset_ex(self, df, location, mode='error', coalesce=1):
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

        if self.dcc:
            repo = self.dcc.get_data_repo(repo_name)
        else:
            repo = self.ask_question(
                ASK_TOPIC_GET_DATA_REPO,
                {
                    "repo_name": repo_name,
                }
            )

        if repo['type'] == 1 or repo['type'] == 2:
            repo_context = json.loads(repo['context'])
            base_url = repo_context['base_url']
            if base_url.endswith('/'):
                base_url = base_url[:-1]
            table_path = base_url + location['location']

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


    def write_asset(self, df, location, mode='error'):
        write_asset_ex(df, location, mode=mode, coalesce=1)


    ##############################################################################
    # Register dataset instance
    # - it will create dataset if not exist, user need to fill in description latter
    ##############################################################################
    def register_asset(self, asset_path, team, file_type, location, row_count, schema,
                       data_time = None, src_asset_paths = [],
                       application_id = None, application_args = None, repo_name = None):

        if data_time is None:
            effective_data_time = datetime.utcnow()
        else:
            effective_data_time = data_time

        if self.dcc is None:
            return self.ask_question(
                ASK_TOPIC_REGISTER_ASSET,
                {
                    "asset_path": asset_path,
                    "team": team,
                    "file_type": file_type,
                    "repo_name": repo_name,
                    "location": location,
                    "row_count": row_count,
                    "schema": schema,
                    "data_time": effective_data_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "src_asset_paths": src_asset_paths,
                    "application_id": application_id,
                    "application_args": application_args,
                }
            )

        dataset_name, major_version, minor_version, path = asset_path.split(":")
        ds = self.dcc.get_dataset(dataset_name, major_version, int(minor_version))
        if ds is None:
            ds = self.dcc.create_dataset(dataset_name, major_version, int(minor_version), "-- Placeholder --", team)
        dsi = self.dcc.create_dataset_instance(
            dataset_name, major_version, int(minor_version),
            path,
            [{
                'repo_name': repo_name,
                'type': file_type,
                'location': location
            }],
            effective_data_time,
            row_count = row_count,
            src_dsi_paths = src_asset_paths,
            application_id = application_id,
            application_args = application_args
        )
        self.dcc.set_dataset_schema_and_sample_data(
            ds['id'],
            json.dumps(schema),
            ""  # no sample data for now
        )
        return dsi


    def register_view(self, asset_path, team, loader_name, loader_args, row_count, schema,
                      data_time = None, src_asset_paths = [],
                      application_id = None, application_args = None):
        if data_time is None:
            effective_data_time = datetime.utcnow()
        else:
            effective_data_time = data_time

        if self.dcc is None:
            return self.ask_question(
                ASK_TOPIC_REGISTER_VIEW,
                {
                    "asset_path": asset_path,
                    "team": team,
                    "loader_name": loader_name,
                    "loader_args": loader_args,
                    "row_count": row_count,
                    "schema": schema,
                    "data_time": effective_data_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "src_asset_paths": loader_args['dsi_paths'],
                    "application_id": application_id,
                    "application_args": application_args,
                }
            )

        dataset_name, major_version, minor_version, path = asset_path.split(":")
        ds = self.dcc.get_dataset(dataset_name, major_version, int(minor_version))
        if ds is None:
            ds = self.dcc.create_dataset(dataset_name, major_version, int(minor_version), "-- Placeholder --", team)

        dsi = self.dcc.create_dataset_instance(
            dataset_name, major_version, int(minor_version),
            path, [],
            effective_data_time,
            loader = json.dumps({
                "name": loader_name,
                "args": loader_args,
            }),
            row_count = row_count,
            src_dsi_paths = src_asset_paths,
            application_id = application_id,
            application_args = application_args
        )
        self.dcc.set_dataset_schema_and_sample_data(
            ds['id'],
            json.dumps(schema),
            ""  # no sample data for now
        )
        return dsi
    
    def get_answer_handler(self):
        return AskHandler(self)
    

class AskHandler:
    def __init__(self, loader):
        self.loader = loader

    def handle_register_asset(self, asset_to_register):
        repo_name           = asset_to_register["repo_name"]
        asset_path          = asset_to_register["asset_path"]
        team                = asset_to_register["team"]
        file_type           = asset_to_register["file_type"]
        location            = asset_to_register["location"]
        row_count           = asset_to_register["row_count"]
        schema              = asset_to_register["schema"]
        data_time           = asset_to_register.get("data_time")
        data_time           = datetime.strptime(data_time, "%Y-%m-%d %H:%M:%S")
        src_asset_paths     = asset_to_register.get("src_asset_paths", [])
        application_id      = asset_to_register.get("application_id")
        application_args    = asset_to_register.get("application_args")

        return self.loader.register_asset(
            asset_path, team, file_type, location, row_count, schema, 
            data_time = data_time,
            src_asset_paths = src_asset_paths,
            application_id = application_id,
            application_args = application_args,
            repo_name = repo_name
        )

    def handle_register_view(self, view_to_register):
        asset_path          = view_to_register["asset_path"]
        team                = view_to_register["team"]
        loader_name         = view_to_register["loader_name"]
        loader_args         = view_to_register["loader_args"]
        row_count           = view_to_register["row_count"]
        schema              = view_to_register["schema"]
        data_time           = view_to_register.get("data_time")
        data_time           = datetime.strptime(data_time, "%Y-%m-%d %H:%M:%S")
        src_asset_paths     = view_to_register["src_asset_paths"]
        application_id      = view_to_register["application_id"]
        application_args    = view_to_register["application_args"]

        return self.loader.register_view(
            asset_path, team, loader_name, loader_args, row_count, schema, 
            data_time = data_time,
            src_asset_paths = src_asset_paths,
            application_id = application_id,
            application_args = application_args
        )

    def handle_get_asset(self, asset_to_get):
        dataset_name    = asset_to_get['dataset_name']
        major_version   = asset_to_get['major_version']
        minor_version   = asset_to_get['minor_version']
        path            = asset_to_get['path']
        revision        = asset_to_get.get('revision')

        di = self.loader.dcc.get_dataset_instance(
            dataset_name, major_version, int(minor_version), path, revision=revision
        )
        return di


    def handle_get_repo(self, get_repo):
        repo_name           = get_repo["repo_name"]
        return self.loader.dcc.get_data_repo(repo_name)


    def __call__(self, ask):
        if ask.get("topic") == ASK_TOPIC_REGISTER_ASSET:
            return True, self.handle_register_asset(ask['payload'])
        if ask.get("topic") == ASK_TOPIC_REGISTER_VIEW:
            return True, self.handle_register_view(ask['payload'])
        if ask.get("topic") == ASK_TOPIC_GET_ASSET:
            return True, self.handle_get_asset(ask['payload'])
        if ask.get("topic") == ASK_TOPIC_GET_DATA_REPO:
            return True, self.handle_get_repo(ask['payload'])
        return False, None
