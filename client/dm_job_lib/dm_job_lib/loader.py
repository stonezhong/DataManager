import json
from datetime import datetime

from dc_client import DataCatalogClient

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

    def load_asset_ex(self, dsi_path):
        # same as load_asset, but it return the asset path with revision as well
        # dcc: data catalog client
        dataset_name, major_version, minor_version, path, revision = (dsi_path.split(":") + [None])[:5]
        if self.dcc:
            di = self.dcc.get_dataset_instance(
                dataset_name, major_version, int(minor_version), path, revision=revision
            )
        else:
            di = self.ask({
                "topic": "get_asset",
                "payload": {
                    "dataset_name": dataset_name,
                    "major_version": major_version,
                    "minor_version": int(minor_version),
                    "path": path,
                    "revision": revision
                }
            })

        if di is None:
            raise Exception(f"data with path {dsi_path} does not exist!")

        loader_str = di.get("loader")
        if not loader_str:
            if len(di['locations']) == 0:
                raise Exception(f"data with path {dsi_path} does not exist!")
            location = di['locations'][0]
            table_type = location['type']
            table_path = location['location']
            if table_type == "json":
                df = self.spark.read.json(table_path)
            elif table_type == "parquet":
                df = self.spark.read.parquet(table_path)
            else:
                raise Exception(f"Unrecognized table type: {table_type}")
            return df, f"{dataset_name}:{major_version}:{minor_version}:{path}:{di['revision']}"

        loader = json.loads(loader_str)
        # we can use a loader
        loader_name = loader['name']
        loader_args = loader['args']
        return self.load_view(loader_name, loader_args), f"{dataset_name}:{major_version}:{minor_version}:{path}:{di['revision']}"

    def write_asset(self, df, table, mode='overwrite'):
        # table is compatible with DatasetLocation
        table_type = table['type']
        table_path = table['location']
        # TODO: make coalesce configurable

        if table_type == "json":
            df.coalesce(1).write.mode(mode).format('json').save(table_path)
        elif table_type == "parquet":
            df.coalesce(1).write.mode(mode).format('parquet').save(table_path)
        else:
            raise Exception(f"Unrecognized table type: {table_type}")


    ##############################################################################
    # Register dataset instance
    # - it will create dataset if not exist, user need to fill in description latter
    ##############################################################################
    def register_asset(self, asset_path, team, file_type, location, row_count, schema,
                       data_time = None, src_asset_paths = [],
                       application_id = None, application_args = None):

        if data_time is None:
            effective_data_time = datetime.utcnow()
        else:
            effective_data_time = data_time

        if self.dcc is None:
            return self.ask({
                "topic": "register_asset",
                "payload": {
                    "asset_path": asset_path,
                    "team": team,
                    "file_type": file_type,
                    "location": location,
                    "row_count": row_count,
                    "schema": schema,
                    "data_time": effective_data_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "src_asset_paths": src_asset_paths,
                    "application_id": application_id,
                    "application_args": application_args,
                }
            })

        dataset_name, major_version, minor_version, path = asset_path.split(":")
        ds = self.dcc.get_dataset(dataset_name, major_version, int(minor_version))
        if ds is None:
            ds = self.dcc.create_dataset(dataset_name, major_version, int(minor_version), "-- Placeholder --", team)
        dsi = self.dcc.create_dataset_instance(
            dataset_name, major_version, int(minor_version),
            path,
            [{
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
            return self.ask({
                "topic": "register_view",
                "payload": {
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
            })

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
