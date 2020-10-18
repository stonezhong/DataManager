from .schema import validate_model
from datetime import datetime
import pytz

class CreatePipelineInput:
    @classmethod
    def from_json(cls, data):
        validate_model("create_pipeline_input", data)
        self = cls()
        self.name = data["name"]
        self.description = data["description"]
        self.team = data["team"]
        self.category = data["category"]
        self.context = data["context"]
        return self
