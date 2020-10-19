from .schema import validate_model
from datetime import datetime
import pytz

class CreateDatasetInput:
    @classmethod
    def from_json(cls, data):
        validate_model("create_dataset_input", data)
        self = cls()
        self.name = data["name"]
        self.major_version = data["major_version"]
        self.minor_version = data["minor_version"]
        if "publish_time" in data:
            publish_time = datetime.strptime(data["publish_time"], "%Y-%m-%d %H:%M:%S")
        else:
            publish_time = datetime.utcnow()
        publish_time = publish_time.replace(tzinfo = pytz.UTC)
        self.publish_time = publish_time
        self.description = data["description"]
        self.team = data["team"]
        return self
