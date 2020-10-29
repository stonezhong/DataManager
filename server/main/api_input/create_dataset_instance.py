from .schema import validate_model
from datetime import datetime
from django.core.exceptions import SuspiciousOperation
from main.models import Dataset, DatasetInstance, DataLocation
import pytz

class CreateDatasetInstanceInput:
    class _BriefLocation:
        def __init__(self, type, location, size):
            self.type = type
            self.location = location
            self.size = size

    @classmethod
    def from_json(cls, data):
        validate_model("create_dataset_instance", data)
        self = cls()

        dataset_id = data["dataset_id"]
        dataset = Dataset.objects.filter(pk=data['dataset_id']).first()
        if dataset is None:
            raise SuspiciousOperation(f"Invalid dataset id: {dataset_id}")
        self.dataset = dataset

        parent_instance_id = data['parent_instance_id']
        if parent_instance_id is None:
            parent_instance = None
        else:
            parent_instance = DatasetInstance.objects.filter(pk=parent_instance_id).first()
            if parent_instance is None:
                raise SuspiciousOperation(f"Invalid parent_instance")
        self.parent_instance = parent_instance

        self.name = data["name"]
        self.row_count = data.get("row_count")

        self.loader = data.get("loader")

        if "publish_time" in data:
            publish_time = datetime.strptime(data["publish_time"], "%Y-%m-%d %H:%M:%S")
        else:
            publish_time = datetime.utcnow()
        publish_time = publish_time.replace(tzinfo = pytz.UTC)
        self.publish_time = publish_time

        self.data_time = datetime.strptime(data["data_time"], "%Y-%m-%d %H:%M:%S")

        locations = []
        for entry in data["locations"]:
            locations.append(cls._BriefLocation(
                entry["type"], entry["location"], entry.get("size")
            ))
        self.locations = locations

        return self
