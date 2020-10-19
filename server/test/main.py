#!/usr/bin/env python
# -*- coding: UTF-8 -*-

import requests

class TestClient(object):
    def __init__(self, url_base, auth=None):
        self.url_base = url_base
        self.session = requests.Session()
        if auth is not None:
            self.session.auth = auth

    def create(self, name, payload):
        url = f"{self.url_base}/{name}s/"
        r = self.session.post(url=url, json = payload)
        r.raise_for_status()
        return r.json()

    def delete(self, name, id):
        url = f"{self.url_base}/{name}s/{id}"
        r = self.session.delete(url=url)
        r.raise_for_status()
    
    def get(self, name, id, verb, params = {}):
        url = f"{self.url_base}/{name}s/{id}/{verb}"
        r = self.session.get(url=url, params=params)
        r.raise_for_status()
        return r.json()

def test1():
    # Create a dataset, do not specify create time, and then delete it
    tc = TestClient('http://seavh2.deepspace.local:60010/api', ('stonezhong', 'iamrich', ))
    r = tc.create(
        'Dataset', {
            'name': 'foo',
            'major_version': '1.0',
            'minor_version': 1,
            'description': 'blah...',
            'team': 'HWD'
        }
    )
    assert r['author'] == 'stonezhong'
    r = tc.delete('Dataset', r['id'])

def test2():
    # Create a dataset, do not specify create time, and then delete it
    tc = TestClient('http://seavh2.deepspace.local:60010/api', ('stonezhong', 'iamrich', ))
    r = tc.create(
        'Dataset', {
            'name': 'foo',
            'major_version': '1.0',
            'minor_version': 1,
            'description': 'blah...',
            'team': 'HWD',
            'publish_time': '2020-04-01 00:00:00'
        }
    )
    assert r['author'] == 'stonezhong'
    assert r['publish_time'] == '2020-04-01 00:00:00'
    r = tc.delete('Dataset', r['id'])

def test3():
    # Create a dataset, then create a instance, th
    tc = TestClient('http://seavh2.deepspace.local:60010/api', ('stonezhong', 'iamrich', ))

    r = tc.create(
        'Dataset', {
            'name': 'foo',
            'major_version': '1.0',
            'minor_version': 1,
            'description': 'blah...',
            'team': 'HWD',
            'publish_time': '2020-04-01 00:00:00'
        }
    )
    assert r['author'] == 'stonezhong'
    assert r['publish_time'] == '2020-04-01 00:00:00'

    ds_id = r['id']

    r = tc.create(
        'DatasetInstance', {
            "dataset_id": ds_id,
            "parent_instance_id": None,
            "name": "2018-11-01",
            "locations": [
                {"type": "parquet", "location": "hdfs://osap/hwd/foo/2018-11-01/*"}
            ]
        }
    )
    dsi_id1 = r['id']
    
    r = tc.create(
        'DatasetInstance', {
            "dataset_id": ds_id,
            "parent_instance_id": None,
            "name": "2018-11-02",
            "locations": [
                {"type": "parquet", "location": "hdfs://osap/hwd/foo/2018-11-02/*"}
            ]
        }
    )
    dsi_id2 = r['id']

    r = tc.create(
        'DatasetInstance', {
            "dataset_id": ds_id,
            "parent_instance_id": dsi_id1,
            "name": "US",
            "locations": [
                {"type": "parquet", "location": "hdfs://osap/hwd/foo/2018-11-01/US.parquet"}
            ]
        }
    )
    dsi_ida = r['id']
    
    r = tc.create(
        'DatasetInstance', {
            "dataset_id": ds_id,
            "parent_instance_id": dsi_id1,
            "name": "UK",
            "locations": [
                {"type": "parquet", "location": "hdfs://osap/hwd/foo/2018-11-01/UK.parquet"}
            ]
        }
    )
    dsi_idb = r['id']

    # make sure children API works for dataset
    r = tc.get("Dataset", ds_id, "children")
    ids = set([x['id'] for x in r])
    assert ids == set([dsi_id1, dsi_id2])

    # make sure child API works for dataset
    r = tc.get("Dataset", ds_id, "child", params={'name': '2018-11-01'})
    assert r['id'] == dsi_id1


    # make sure children API works for dataset instance
    r = tc.get("DatasetInstance", dsi_id1, "children")
    ids = set([x['id'] for x in r])
    assert ids == set([dsi_ida, dsi_idb])

    # make sure child API works for dataset instance
    r = tc.get("DatasetInstance", dsi_id1, "child", params={'name': 'US'})
    assert r['id'] == dsi_ida

    tc.delete('DatasetInstance', dsi_ida)
    tc.delete('DatasetInstance', dsi_idb)
    tc.delete('DatasetInstance', dsi_id1)
    tc.delete('DatasetInstance', dsi_id2)
    tc.delete('Dataset', ds_id)


def test4():
    tc = TestClient('http://seavh2.deepspace.local:60010/api', ('stonezhong', 'iamrich', ))

    r = tc.create(
        'Dataset', {
            'name': 'foo',
            'major_version': '1.0',
            'minor_version': 1,
            'description': 'blah...',
            'team': 'HWD',
            'publish_time': '2020-04-01 00:00:00'
        }
    )
    ds_id = r['id']

    r = tc.create(
        'DatasetInstance', {
            "dataset_id": ds_id,
            "parent_instance_id": None,
            "name": "2018-11-01",
            "row_count": 100,
            "locations": [
                {"type": "parquet", "location": "hdfs://osap/hwd/foo/2018-11-01/*"}
            ]
        }
    )

    r = tc.create(
        'DatasetInstance', {
            "dataset_id": ds_id,
            "parent_instance_id": None,
            "name": "2018-11-02",
            "row_count": 102,
            "locations": [
                {"type": "parquet", "location": "hdfs://osap/hwd/foo/2018-11-01/*"}
            ]
        }
    )

def main():
    # test1()
    # test2()
    # test3()
    test4()


if __name__ == '__main__':
    main()
