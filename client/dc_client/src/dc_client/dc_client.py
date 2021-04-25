import requests
import json
from datetime import datetime
import os

def _update_locations(locations):
    # sort locations array and remove field 'offset'
    locations.sort(key=lambda l:l['offset'])
    for i in locations:
        i.pop('offset')


class DataCatalogClient:
    """Data Catalog Client"""

    def __init__(self, *, url_base, tenant_id, auth=None, dm_username=None, dm_token=None):
        """
        Parameters
        ----------
        url_base: str
            The endpoint of the API. For example, http://www.myserver.com:8080/api
        tenant_id: int
            The tenant id.
        auth: tuple
            Tuple of username and password. Optional.
        dm_username: str
            when auth is not provided, user can use "token" auth
            this is the username who owns the auth token
        dm_token: str
            A one-time toekn for API call
        """
        self.url_base = os.path.join(url_base, str(tenant_id))
        self.tenant_id = tenant_id
        self.session = requests.Session()
        if auth is None:
            self.use_token   = True
            self.dm_username = dm_username
            self.dm_token    = dm_token
        else:
            self.use_token   = False
            self.session.auth = auth

    def inject_token(self, params):
        if self.use_token:
            params['dm_username'] = this.dm_username
            params['dm_token']    = this.dm_token

    def get_dataset(self, *, name, major_version, minor_version=None, spark=None):
        """Get dataset.

        Parameters
        ----------
        name: str
            The name of the dataset.
        major_version: str
            The major version of the dataset.
        minor_version: integer
            Optional. If present, we will get dataset that match the minor_version,
            otherwise, we will get the dataset with the highest minor_version.
        spark: placeholder, to keep the API compatible
        """

        url = os.path.join(self.url_base, 'Datasets/')
        params = {
            'name': name,
            'major_version': major_version,
        }
        self.inject_token(params)

        if minor_version is None:
            # minor_version not specified, let's have the highest
            # minor_version at the top
            params.update({
                "ordering": "-minor_version"
            })
        else:
            # minor_version specified, no need to sort
            params.update({
                "minor_version": minor_version
            })

        r = self.session.get(url=url, params = params)
        r.raise_for_status()

        d = r.json()
        if d['count'] > 0:
            return d['results'][0]

        return None

    def create_dataset(self, *, name, major_version, minor_version, description, team, spark=None):
        """Create a dataset.

        Parameters
        ----------
        name: str
            The name of the dataset.
        major_version: str
            The major version of the dataset.
        minor_version: integer
            The minor version of the dataset.
        description: str
            The description of the dataset. HTML code is allow.
        team: str
            The team who own the dataset.
        spark: placeholder, to keep the API compatible
        """
        url = os.path.join(self.url_base, 'Datasets/')
        params = { }
        self.inject_token(params)

        data = {
            'name': name,
            'major_version': major_version,
            'minor_version': minor_version,
            'description': description,
            'team': team
        }

        r = self.session.post(url=url, params=params, json=data)
        r.raise_for_status()
        return r.json()

    def set_dataset_schema_and_sample_data(self, *, id, schema, sample_data="", spark=None):
        """set dataset schema.

        If dataset already have schema, and new schema is different it raise exception
        If dataset does not have schema, it sets the schema

        Parameters
        ----------
        id: str
            The dataset ID.
        schema: str
            The schema of the dataset
        spark: placeholder, to keep the API compatible
        """
        url = os.path.join(
            self.url_base, 'Datasets', id,
            "set_schema_and_sample_data/"
        )
        params = { }
        self.inject_token(params)

        data = {
            'schema': schema,
            'sample_data': sample_data,
        }
        r = self.session.post(url=url, params=params, json=data)
        r.raise_for_status()
        return r.json()


    def delete_dataset(self, *, id, spark=None):
        """Data a dataset by id.

        Parameters
        ----------
        id: str
            The dataset ID.
        spark: placeholder, to keep the API compatible
        """
        url = os.path.join(self.url_base, "Datasets", f"{id}/")
        params = {}
        self.inject_token(params)
        r = self.session.delete(url=url, params=params)
        r.raise_for_status()

    def get_asset(self, *, dataset_name, major_version, minor_version, name, revision=None, spark=None):
        """Get a dataset instance.

        Parameters
        ----------
        dataset_name: str
            The name of the dataset.
        major_version: str
            The major version of the dataset.
        minor_version: integer
            The minor version of the dataset.
        name: str
            The name of the asset.
        revision: integer
            Optional. If specified, only dataset matching the revision will be returned.
            Otherwise, the latest revision will be returned.
        spark: placeholder, to keep the API compatible
        """
        dataset = self.get_dataset(
            name=dataset_name,
            major_version=major_version,
            minor_version=minor_version
        )
        if dataset is None:
            return None

        url = os.path.join(self.url_base, 'Assets/')
        params = {
            'name': name,
            'dataset': dataset['id'],
        }
        if revision is None:
            # get the latest revision
            params.update({
                "ordering": "-revision",
                "limit": 1,
            })
        else:
            params.update({
                "revision": revision
            })
        self.inject_token(params)

        r = self.session.get(url=url, params=params)
        r.raise_for_status()

        d = r.json()
        if d['count'] > 0:
            asset = d['results'][0]
            if asset['deleted_time'] is not None:
                # dataset instance is already deleted
                return None
            return asset

        return None


    def create_asset(self, *, dataset_name, major_version, minor_version, name, locations, data_time,
                     row_count=None, loader=None, src_asset_paths=[],
                     application_id = None, application_args = None, spark=None

        ):
        """Create a dataset instance.

        Parameters
        ----------
        dataset_name: str
            The name of the dataset.
        major_version: str
            The major version of the dataset.
        minor_version: integer
            The minor version of the dataset.
        name: str
            The asset name
        locations: [Location]
            An array of location. A location is a dict object that has following fields:
            type: str
                The data type stored in this location, for example, csv, parquet, etc...
            location: str
                The location of the data, for example, s3://mybicket/foo.parquet
            size: integer
                Optional. The storage size of the data in this location.
            repo_name: string
                Optional. The name of the data repo
        row_count: integer
            The number of rows for this dataset instance.
        src_asset_paths: [string]
            list of dataset instances path that this asset depend on. the path MUST contain revision.
        application_id: string, optional
            if present, it is the application id which produces this asset
        application_args: string, optional
            if present, it is the args passed to this application.
        spark: placeholder, to keep the API compatible
        """
        dataset = self.get_dataset(
            name=dataset_name,
            major_version=major_version,
            minor_version=minor_version
        )
        if dataset is None:
            raise Exception("dataset not found")

        url = os.path.join(self.url_base, 'Datasets', dataset['id'], "create_asset/")
        data = {
            'name': name,
            'data_time': data_time.strftime('%Y-%m-%d %H:%M:%S'),
            'row_count': row_count,
            'loader': loader,
            'locations': locations,
            'src_asset_paths': src_asset_paths,
            'application_id': application_id,
            'application_args': application_args,
        }
        if row_count is None:
            data.pop("row_count")
        params = { }
        self.inject_token(params)

        r = self.session.post(url=url, params=params, json=data)
        r.raise_for_status()

        ret = r.json()
        _update_locations(ret['locations'])
        return ret

    def delete_asset(self, *, id, spark=None):
        """Delete a dataset instance by id.

        Parameters
        ----------
        id: str
            The dataset ID.
        spark: placeholder, to keep the API compatible
        """
        url = os.path.join(self.url_base, "Assets", f"{id}/")
        params = {}
        self.inject_token(params)
        r = self.session.delete(url=url, params=params)
        r.raise_for_status()

    def get_data_repo(self, *, name, spark=None):
        """Get a data repo by name.
        Data repo's name is unique

        Parameters
        ----------
        name: str
            The data repo name.
        spark: placeholder, to keep the API compatible
        """
        url = os.path.join(self.url_base, 'DataRepos/')
        params = {
            'name': name,
        }
        self.inject_token(params)
        r = self.session.get(url=url, params=params)
        r.raise_for_status()

        d = r.json()
        if d['count'] > 0:
            return d['results'][0]

        return None

class DataCatalogClientProxy:
    def __init__(self, channel, timeout=600, check_interval=5):
        self.channel = channel
        self.timeout = timeout
        self.check_interval = check_interval

    def _ask(self, spark, content):
        from spark_etl.utils import server_ask_client
        if spark is None:
            raise Exception("spark is not set")
        return server_ask_client(spark, self.channel, content, timeout=self.timeout, check_interval=self.check_interval)

    def get_dataset(self, *, name, major_version, minor_version=None, spark=None):
        return self._ask(spark, {
            "topic": "dc_client.get_dataset",
            "payload": {
                "name": name,
                "major_version": major_version,
                "minor_version": minor_version
            }
        })

    def create_dataset(self, *, name, major_version, minor_version, description, team, spark=None):
        return self._ask(spark, {
            "topic": "dc_client.create_dataset",
            "payload": {
                "name": name,
                "major_version": major_version,
                "minor_version": minor_version,
                "description": description,
                "team": team
            }
        })

    def set_dataset_schema_and_sample_data(self, *, id, schema, sample_data="", spark=None):
        return self._ask(spark, {
            "topic": "dc_client.set_dataset_schema_and_sample_data",
            "payload": {
                "id": id,
                "schema": schema,
                "sample_data": sample_data
            }
        })

    def delete_dataset(self, id, spark=None):
        return self._ask(spark, {
            "topic": "dc_client.delete_dataset",
            "payload": {
                "id": id,
            }
        })

    def get_asset(self, *, dataset_name, major_version, minor_version, name, revision=None, spark=None):
        return self._ask(spark, {
            "topic": "dc_client.get_dataset_instance",
            "payload": {
                "dataset_name": dataset_name,
                "major_version": major_version,
                "minor_version": minor_version,
                "name": name,
                "revision": revision,
            }
        })

    def create_dataset_instance(self, *, dataset_name, major_version, minor_version, name, locations, data_time,
                                row_count=None, loader=None, src_asset_paths=[],
                                application_id = None, application_args = None, spark=None):
        return self._ask(spark, {
            "topic": "dc_client.create_dataset_instance",
            "payload": {
                "dataset_name": dataset_name,
                "major_version": major_version,
                "minor_version": minor_version,
                "name": name,
                "locations": locations,
                "data_time": data_time.strftime('%Y-%m-%d %H:%M:%S'),
                "row_count": row_count,
                "loader": loader,
                "src_asset_paths": src_asset_paths,
                "application_id": application_id,
                "application_args": application_args,
            }
        })

    def delete_dataset_instance(self, *, id, spark=None):
        return self._ask(spark, {
            "topic": "dc_client.delete_dataset_instance",
            "payload": {
                "id": id,
            }
        })

    def get_data_repo(self, *, name, spark=None):
        return self._ask(spark, {
            "topic": "dc_client.get_data_repo",
            "payload": {
                "name": name,
            }
        })

def json_2_str(obj):
    return json.dumps(obj, indent=4, separators=(',', ': '))


def dc_job_handler(content, dcc):
    topic = content['topic']
    payload = content['payload']

    print("dc_job_handler: ask >>>")
    print(json_2_str(content))
    print("<<<")

    resp = (False, None, )
    if topic == "dc_client.get_dataset":
        resp = (True, dcc.get_dataset(**payload), )
    elif topic == "dc_client.create_dataset":
        resp = (True, dcc.create_dataset(**payload), )
    elif topic == "dc_client.set_dataset_schema_and_sample_data":
        resp = (True, dcc.set_dataset_schema_and_sample_data(**payload), )
    elif topic == "dc_client.delete_dataset":
        resp = (True, dcc.delete_dataset(**payload), )
    elif topic == "dc_client.get_dataset_instance":
        resp = (True, dcc.get_dataset_instance(**payload), )
    elif topic == "dc_client.create_dataset_instance":
        argv = dict(**payload)
        argv['data_time'] = datetime.strptime(payload["data_time"], "%Y-%m-%d %H:%M:%S")
        resp = (True, dcc.create_dataset_instance(**argv), )
    elif topic == "dc_client.delete_dataset_instance":
        resp = (True, dcc.delete_dataset_instance(**payload), )
    elif topic == "dc_client.get_data_repo":
        resp = (True, dcc.get_data_repo(**payload), )


    print("dc_job_handler: answer >>>")
    if resp[0]:
        print(json_2_str(resp[1]))
    else:
        print("skipped")
    print("<<<")

    return resp
