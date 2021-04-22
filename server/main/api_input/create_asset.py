from .schema import validate_model
from datetime import datetime
from django.core.exceptions import SuspiciousOperation
from main.models import Dataset, Asset, DataLocation, Application
import pytz

from tools.view_tools import get_model_by_pk
from common_tool import none_or, q

class CreateAssetInput:
    class _BriefLocation:
        def __init__(self, type, location, size, repo_name):
            # if repo_name is None, the location is a repo-less location
            # such as hdfs://...
            self.type = type
            self.location = location
            self.size = size
            self.repo_name = repo_name

    @classmethod
    def from_json(cls, data, tenant_id):
        validate_model("create_dataset_instance", data)
        self = cls()

        self.dataset = get_model_by_pk(Dataset, data['dataset_id'], tenant_id)
        self.parent_instance = none_or(
            data.get('parent_instance_id'),
            lambda parent_instance_id: get_model_by_pk(Asset, parent_instance_id, tenant_id)
        )
        self.name = data["name"]
        self.row_count = data.get("row_count")
        self.loader = data.get("loader")

        self.publish_time = q(
            "publish_time" in data,
            lambda : datetime.strptime(data["publish_time"], "%Y-%m-%d %H:%M:%S"),
            lambda : datetime.utcnow()
        ).replace(tzinfo=pytz.UTC)
        self.data_time = datetime.strptime(data["data_time"], "%Y-%m-%d %H:%M:%S")

        locations = []
        for entry in data["locations"]:
            locations.append(cls._BriefLocation(
                entry["type"], entry["location"], entry.get("size"), entry.get("repo_name")
            ))
        self.locations = locations

        self.src_dsi_paths = data.get("src_dsi_paths", [])

        self.application = none_or(
            data['application_id'],
            lambda application_id: get_model_by_pk(Application, data['application_id'], tenant_id)
        )
        self.application_args = data.get("application_args")
        return self
