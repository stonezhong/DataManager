import json

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
    loader_f = LOADERS[loader_name]
    return loader_f(spark, dcc, loader_args)
