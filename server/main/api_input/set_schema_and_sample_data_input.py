from .schema import validate_model

class SetSchemaAndSampleDataInput:
    @classmethod
    def from_json(cls, data, tenant_id):
        validate_model("set_schema_and_sample_data_input", data)
        self = cls()
        self.schema = data["schema"]
        self.sample_data = data.get("sample_data", "")
        return self
