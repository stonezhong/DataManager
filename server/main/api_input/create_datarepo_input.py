from .schema import validate_model

from main.models import DataRepo

class CreateDataRepoInput:
    @classmethod
    def from_json(cls, data, tenant_id):
        validate_model("create_datarepo_input", data)
        self = cls()
        self.name = data["name"]
        self.description = data["description"]
        self.context = data["context"]
        self.type = data["type"]
        if data.get("type") is not None:
            self.type = DataRepo.RepoType(data["type"])
        else:
            self.type = None
        return self
