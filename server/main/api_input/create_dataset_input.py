from .schema import validate_model
from datetime import datetime
import pytz

class CreateDatasetInput:
    @classmethod
    def from_json(cls, data, tenant_id):
        validate_model("create_dataset_input", data)
        self = cls()
        self.name = data["name"]
        self.major_version = data["major_version"]
        self.minor_version = data["minor_version"]
        self.description = data["description"]
        self.team = data["team"]
        return self
