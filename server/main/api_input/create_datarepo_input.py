from .schema import validate_model

class CreateDataRepoInput:
    @classmethod
    def from_json(cls, data):
        validate_model("create_datarepo_input", data)
        self = cls()
        self.tenant_id = data["tenant_id"]
        self.name = data["name"]
        self.description = data["description"]
        self.context = data["context"]
        self.type = data["type"]
        return self
