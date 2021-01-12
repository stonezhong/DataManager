import pytest
import requests
import json
from base64 import b64encode

from dc_client import DataCatalogClient

URL_BASE = "http://foo/bar"
USERNAME = "user"
PASSWORD = "password"

@pytest.fixture(scope='function')
def dcc():
    return DataCatalogClient(URL_BASE, auth=(USERNAME, PASSWORD,))

class TestGetDataset:
    def test_get_dataset_with_error(self, dcc, requests_mock):
        "When server failed, dc-client throws HTTPError"
        # simulate error
        requests_mock.get(f'{URL_BASE}/Datasets/?name=foo', status_code=500, text='some error')
        with pytest.raises(requests.exceptions.HTTPError):
            dcc.get_dataset(
                "foo", "1.0", 1
            )
        # make sure dc-client sends the password
        encoded_auth = b64encode(f"{USERNAME}:{PASSWORD}".encode('utf-8')).decode("ascii")
        assert requests_mock.last_request.headers["Authorization"] == f"Basic {encoded_auth}"

    def test_get_dataset_empty(self, dcc, requests_mock):
        "When server not found, it returns None"
        ret = {
            "count": 0,
            "results": [
            ]
        }
        requests_mock.get(f'{URL_BASE}/Datasets/?name=foo&major_version=1.0&minor_version=1', text=json.dumps(ret))
        assert dcc.get_dataset(
            "foo", "1.0", 1
        ) is None
        # make sure dc-client sends the password
        encoded_auth = b64encode(f"{USERNAME}:{PASSWORD}".encode('utf-8')).decode("ascii")
        assert requests_mock.last_request.headers["Authorization"] == f"Basic {encoded_auth}"

    def test_get_dataset_found(self, dcc, requests_mock):
        "Common case"
        ret = {
            "count": 1,
            "results": [
                {
                    "id": "123",
                    "name": "foo",
                    "major_version": "1.0",
                    "minor_version": 1
                }
            ]
        }
        requests_mock.get(f'{URL_BASE}/Datasets/?name=foo&major_version=1.0&minor_version=1', text=json.dumps(ret))
        assert dcc.get_dataset(
            "foo", "1.0", 1
        ) == {
            "id": "123",
            "name": "foo",
            "major_version": "1.0",
            "minor_version": 1
        }
        # make sure dc-client sends the password
        encoded_auth = b64encode(f"{USERNAME}:{PASSWORD}".encode('utf-8')).decode("ascii")
        assert requests_mock.last_request.headers["Authorization"] == f"Basic {encoded_auth}"

