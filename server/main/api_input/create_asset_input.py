from .schema import validate_model
from datetime import datetime
from django.core.exceptions import SuspiciousOperation
from main.models import Dataset, Asset, DataLocation, Application
import pytz

from tools.view_tools import get_model_by_pk
from tools.common_tool import none_or, q

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
        validate_model("create_asset_input", data)
        self = cls()

        self.name = data["name"]
        self.row_count = data.get("row_count")
        self.loader = data.get("loader")

        self.data_time = datetime.strptime(data["data_time"], "%Y-%m-%d %H:%M:%S")

        locations = []
        for entry in data["locations"]:
            locations.append(cls._BriefLocation(
                entry["type"], entry["location"], entry.get("size"), entry.get("repo_name")
            ))
        self.locations = locations

        self.src_asset_paths = data.get("src_asset_paths", [])

        self.application = none_or(
            data.get('application_id'),
            lambda application_id: get_model_by_pk(Application, data.get('application_id'), tenant_id)
        )
        self.application_args = data.get("application_args")
        return self
