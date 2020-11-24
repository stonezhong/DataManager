import json
from datetime import datetime

from dc_client import DataCatalogClient

#####################################################################
# Load bunch of tables with same structure
#####################################################################
def union_loader(spark, dcc, args):
    df = None
    for dsi_path in args['dsi_paths']:
        if df is None:
            df = load_asset(spark, dcc, dsi_path)
        else:
            df = df.union(load_asset(spark, dcc, dsi_path))
    return df

LOADERS = {
    "union": union_loader
}

#####################################################################
# Load a view
#####################################################################
def load_view(spark, dcc, loader_name, loader_args):
    loader_f = LOADERS[loader_name]
    return loader_f(spark, dcc, loader_args)

def load_asset(spark, dcc, dsi_path):
    # dcc: data catalog client

    dataset_name, major_version, minor_version, path = dsi_path.split(":")
    di = dcc.get_dataset_instance(
        dataset_name, major_version, int(minor_version), path
    )
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
            df = spark.read.json(table_path)
        elif table_type == "parquet":
            df = spark.read.parquet(table_path)
        else:
            raise Exception(f"Unrecognized table type: {table_type}")
        return df

    loader = json.loads(loader_str)
    # we can use a loader
    loader_name = loader['name']
    loader_args = loader['args']
    return load_view(spark, dcc, loader_name, loader_args)

def write_asset(spark, df, table, mode='overwrite'):
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
def register_dataset_instance(dcc, dsi_path, file_type, location, df):
    dataset_name, major_version, minor_version, path = dsi_path.split(":")
    ds = dcc.get_dataset(dataset_name, major_version, int(minor_version))
    if ds is None:
        ds = dcc.create_dataset(dataset_name, major_version, int(minor_version), "-- Placeholder --", "trading")
    dcc.create_dataset_instance(
        dataset_name, major_version, int(minor_version),
        path,
        [{
            'type': file_type,
            'location': location
        }],
        datetime.utcnow(),
        row_count = df.count()
    )
    dcc.set_dataset_schema_and_sample_data(
        ds['id'],
        json.dumps(df.schema.jsonValue()),
        ""  # no sample data for now
    )

def register_dataset_instance_for_view(spark, dcc, dsi_path, loader_name, loader_args):
    dataset_name, major_version, minor_version, path = dsi_path.split(":")
    ds = dcc.get_dataset(dataset_name, major_version, int(minor_version))
    if ds is None:
        ds = dcc.create_dataset(dataset_name, major_version, int(minor_version), "-- Placeholder --", "trading")

    df = load_view(spark, dcc, loader_name, loader_args)
    dcc.create_dataset_instance(
        dataset_name, major_version, int(minor_version),
        path, [],
        datetime.utcnow(),
        loader = json.dumps({
            "name": loader_name,
            "args": loader_args,
        }),
        row_count = df.count()
    )
    dcc.set_dataset_schema_and_sample_data(
        ds['id'],
        json.dumps(df.schema.jsonValue()),
        ""  # no sample data for now
    )
