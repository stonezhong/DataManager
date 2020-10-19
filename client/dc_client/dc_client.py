import requests
import json

def _update_locations(locations):
    # sort locations array and remove field 'offset'
    locations.sort(key=lambda l:l['offset'])
    for i in locations:
        i.pop('offset')


class DataCatalogClient(object):
    """Data Catalog Client"""

    def __init__(self, url_base, auth=None):
        """
        Parameters
        ----------
        url_base: str
            The endpoint of the API. For example, http://www.myserver.com:8080/api
        auth: tuple
            Tuple of username and password. Optional.
        """
        self.url_base = url_base
        self.session = requests.Session()
        if auth is not None:
            self.session.auth = auth
    
    def get_dataset(self, name, major_version, minor_version=None):
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
        """
        
        url = "{}/Datasets/".format(self.url_base)
        params = { 
            'name': name,
            'major_version': major_version,
        }
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
        if d:
            return d[0]
        
        return None

    def create_dataset(self, name, major_version, minor_version, description, team):
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
        """
        url = "{}/Datasets/".format(self.url_base)
        data = { 
            'name': name,
            'major_version': major_version,
            'minor_version': minor_version,
            'description': description,
            'team': team
        }
        
        r = self.session.post(url=url, json = data)
        r.raise_for_status()
        return r.json()


    def delete_dataset(self, id):
        """Data a dataset by id.

        Parameters
        ----------
        id: str
            The dataset ID.
        """
        url = "{}/Datasets/{}".format(self.url_base, id)
        r = self.session.delete(url=url)
        r.raise_for_status()


    def get_dataset_instance(self, name, major_version, minor_version, path):
        """Get a dataset instance.

        Parameters
        ----------
        name: str
            The name of the dataset.
        major_version: str
            The major version of the dataset.
        minor_version: integer
            The minor version of the dataset.
        path: str
            The path of the dataset instance.
        """
        dataset = self.get_dataset(name, major_version, minor_version)
        if dataset is None:
            raise Exception("dataset not found")

        if not path.startswith('/'):
            raise Exception("path must be absolute")
        if path.endswith('/'):
            raise Exception("path must not end with /")
        names = path[1:].split('/')

        parent_instance_id = None
        ret = None
        for name in names:
            if parent_instance_id is None:
                url = "{}/Datasets/{}/child".format(self.url_base, dataset['id'])
            else:
                url = "{}/DatasetInstances/{}/child".format(self.url_base, parent_instance_id)
            params={
                'name': name
            }
            r = self.session.get(url=url, params = params)
            r.raise_for_status()
            ret = r.json()
            parent_instance_id = ret['id']
        
        _update_locations(ret['locations'])
        return ret


    def create_dataset_instance(self, name, major_version, minor_version, path, locations, data_time, row_count=None):
        """Create a dataset instance.

        Parameters
        ----------
        name: str
            The name of the dataset.
        major_version: str
            The major version of the dataset.
        minor_version: integer
            The minor version of the dataset.
        row_count: integer
            The number of rows for this dataset instance.
        path: str
            The path of the dataset instance.
        locations: [Location]
            An array of location. A location is a dict object that has following fields:
            type: str
                The data type stored in this location, for example, csv, parquet, etc...
            location: str
                The location of the data, for example, s3://mybicket/foo.parquet
            size: integer
                Optional. The storage size of the data in this location.
        """
        dataset = self.get_dataset(name, major_version, minor_version)
        if dataset is None:
            raise Exception("dataset not found")
        
        if not path.startswith('/'):
            raise Exception("path must be absolute")
        if path.endswith('/'):
            raise Exception("path must not end with /")
        di_names = path[1:].split('/')

        for di_name in di_names:
            if len(di_name) == 0:
                raise Exception('Invalid path: name cannot be empty')

        if len(di_names) == 0:
            raise Exception('Invalid path: name not specified')

        if len(di_names) == 1:
            parent_instance = None
        else:
            new_path = '/' + '/'.join(di_names[:-1])
            parent_instance = self.get_dataset_instance(name, major_version, minor_version, new_path)
        
        url = "{}/DatasetInstances/".format(self.url_base)
        data = {
            'dataset_id': dataset['id'],
            'parent_instance_id': None if parent_instance is None else  parent_instance['id'],
            'name': di_names[-1],
            'data_time': data_time.strftime('%Y-%m-%d %H:%M:%S'),
            'row_count': row_count,
            'locations': locations
        }
        if row_count is None:
            data.pop(row_count)

        r = self.session.post(url=url, json = data)
        r.raise_for_status()

        ret = r.json()
        _update_locations(ret['locations'])
        return ret

    def delete_dataset_instance(self, id):
        """Data a dataset instance by id.

        Parameters
        ----------
        id: str
            The dataset ID.
        """
        url = "{}/DatasetInstances/{id}".format(self.url_base)
        r = self.session.delete(url=url)
        r.raise_for_status()
