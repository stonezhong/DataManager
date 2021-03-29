from .schema import validate_model
from datetime import datetime
import pytz

class CreateApplicationInput:
    @classmethod
    def from_json(cls, data):
        validate_model("create_application_input", data)
        self = cls()
        self.tenant_id = data["tenant_id"]
        self.name = data["name"]
        self.description = data["description"]
        self.team = data["team"]
        self.app_location = data["app_location"]
        return self
