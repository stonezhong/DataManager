#!/usr/bin/env python
# -*- coding: UTF-8 -*-

import json
from requests.auth import HTTPBasicAuth
from dc_client import DataCatalogClient
from requests.exceptions import HTTPError
from datetime import datetime

def expect_raise(action, exception_validator):
    try:
        action()
    except Exception as e:
        exception_validator(e)

class TestClient(object):
    def __init__(self):
        with open("config.json", "r") as f:
            self.config = json.load(f)
        if self.config['url_base'].endswith('/'):
            # remove the tailing backslash
            self.config['url_base'] = self.config['url_base'][:-1]
    
    def get_dc_client(self, login=False):
        url_base = self.config['url_base']
        if login:
            return DataCatalogClient(
                url_base = url_base, 
                auth=(
                    self.config['username'], 
                    self.config['password'],
                )
            )
        else:
            return DataCatalogClient(url_base = url_base)

def test_create_dataset_simple():
    # Make sure authorized user can create dataset
    tc = TestClient()
    dc_client = tc.get_dc_client(login=True)
    r = dc_client.create_dataset('pulse.power', '1.0', 1, 'Blah', 'HWD')
    dsid = r['id']
    assert 'id' in r
    assert r['name'] == 'pulse.power'
    assert r['major_version'] == '1.0'
    assert r['minor_version'] == 1
    assert 'publish_time' in r
    assert r['expiration_time'] is None
    assert r['description'] == 'Blah'
    assert r['author'] == tc.config['username']
    assert r['team'] == 'HWD'

    # dc_client.delete_dataset(dsid)

def test_create_dataset_by_anonymous():
    # Make sure anonymous user cannot create dataset
    tc = TestClient()
    dc_client = tc.get_dc_client(login=False)

    def check_exception(e):
        if not isinstance(e, HTTPError):
            raise Exception("Wrong exception type")

        assert e.response.status_code == 403

    expect_raise(
        lambda : dc_client.create_dataset('pulse.power', '1.0', 1, 'Blah', 'HWD'),
        check_exception
    )

def test_create_dataset_instance_simple():
    # Make sure authorized user can create dataset instance
    tc = TestClient()
    dc_client = tc.get_dc_client(login=True)
    r = dc_client.create_dataset('pulse.power', '1.0', 1, 'Blah', 'HWD')
    dsid = r['id']

    r = dc_client.create_dataset_instance(
        'pulse.power', '1.0', 1, '/foo', [
            {
                'type': 'csv',
                'location': 'hdfs://osap/foo.csv',
                'size': 500
            },
            {
                'type': 'csv',
                'location': 'oci://mybucket@osap/foo.csv',
            },
        ],
        datetime(2018, 11, 1),
        row_count=100
    )
    assert r['dataset']==dsid
    assert r['parent_instance'] is None
    assert r['name']=='foo'
    assert r['path']=='/foo'
    assert 'publish_time' in r
    assert r['deleted_time'] is None
    assert r['revision']==0
    assert r['row_count']==100
    locations = r['locations']
    assert len(locations)==2
    assert locations[0]['location']=='hdfs://osap/foo.csv'
    assert locations[0]['type']=='csv'
    assert locations[0]['size']==500
    assert locations[1]['location']=='oci://mybucket@osap/foo.csv'
    assert locations[1]['type']=='csv'
    assert locations[1]['size'] is None

    dsiid = r['id']

    return
    dc_client.delete_dataset_instance(dsiid)
    dc_client.delete_dataset(dsid)

def test_get_dataset_simple():
    # Make sure we can find the dataset by major and minor version
    # Make sure we can find the dataset with minor version is not specified -- dataset
    #     with latest minor version is returned
    # Make sure unmatch find return None

    tc = TestClient()
    dc_client = tc.get_dc_client(login=True)
    r = dc_client.create_dataset('pulse.power', '1.0', 1, 'Blah', 'HWD')
    dsid1 = r['id']

    r = dc_client.create_dataset('pulse.power', '1.0', 2, 'Blah', 'HWD')
    dsid2 = r['id']

    r = dc_client.get_dataset('pulse.power1', '1.0', minor_version=1)
    assert r is None

    r = dc_client.get_dataset('pulse.power1', '1.0')
    assert r is None

    r = dc_client.get_dataset('pulse.power', '1.0', minor_version=1)
    assert r['id']==dsid1

    r = dc_client.get_dataset('pulse.power', '1.0', minor_version=2)
    assert r['id']==dsid2

    # when minor_version is omitted, return the ds with the largest minor_version
    r = dc_client.get_dataset('pulse.power', '1.0')
    assert r['id']==dsid2

    dc_client.delete_dataset(dsid1)
    dc_client.delete_dataset(dsid2)

def main():
    test_create_dataset_simple()
    # test_create_dataset_by_anonymous()
    # test_create_dataset_instance_simple()
    # test_get_dataset_simple()

if __name__ == '__main__':
    main()
