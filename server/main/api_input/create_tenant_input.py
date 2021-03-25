from .schema import validate_model
from datetime import datetime
import pytz

class CreateTenantInput:
    @classmethod
    def from_json(cls, data):
        validate_model("create_tenant_input", data)
        self = cls()
        self.name = data["name"]
        self.description = data["description"]
        self.is_public = data["is_public"]
        self.config = data["config"]
        return self
