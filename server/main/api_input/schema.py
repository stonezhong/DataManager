import re
from jsonschema import validate, validators, Draft7Validator
from datetime import datetime
from jsonschema.exceptions import ValidationError

def is_datetime_string(validator, value, instance, schema):
    if instance is None:
        return
    p = re.compile("^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$")
    if not p.match(instance):
        raise ValidationError(f"{instance} does not match the datetime pattern")
    try:
        dt = datetime.strptime(instance, "%Y-%m-%d %H:%M:%S")
    except ValueError as e:
        raise ValidationError(str(e))
    if "min" in value and dt < value['min']:
        raise ValidationError(f"minium value should be {value['min']}")
    if "max" in value and dt > value['max']:
        raise ValidationError(f"maxium value should be {value['max']}, actual value is {dt}")


types = {
    "datetime_string": {
        "type": "string",
        "is_datetime_string": {
        }
    },
    "nullable_datetime_string": {
        "type": ["string", "null"],
        "is_datetime_string": {
        }
    },
}

models = {
    "create_dataset_input": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string"
            },
            "major_version": {
                "type": "string"
            },
            "minor_version": {
                "type": "integer",
                "minimum": 1
            },
            "publish_time": {
                "$ref": f"#/types/datetime_string"
            },
            "description": {
                "type": "string"
            },
            "team": {
                "type": "string"
            },
        },
        "additionalProperties": False,
        "required": ["name", "major_version", "minor_version", "description", "team"]
    },
    "create_asset_input": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string"
            },
            "data_time": {
                "$ref": f"#/types/datetime_string"
            },
            "row_count": {
                "type": "integer"
            },
            "loader": {
                "type": ["string", "null"]
            },
            "locations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "repo_name": {
                            "type": ["string", "null"]
                        },
                        "type": {
                            "type": "string"
                        },
                        "location": {
                            "type": "string"
                        },
                        "size": {
                            "type": "integer"
                        }
                    },
                    "minItems": 1,
                    "required": ["type", "location"],
                    "additionalProperties": False,
                }
            },
            "src_asset_paths": {  # optional
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "application_id": {
                "type": ["string", "null"]
            },
            "application_args": {
                "type": ["string", "null"]
            }
        },
        "additionalProperties": False,
        "required": [
            "name", "data_time", "locations"
        ]
    },
    "create_pipeline_input": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string"
            },
            "description": {
                "type": "string"
            },
            "team": {
                "type": "string"
            },
            "category": {
                "type": "string"
            },
            "context": {
                "type": "string"
            },
        },
        "additionalProperties": False,
        "required": ["name", "description", "team", "category", "context"]
    },
    "create_application_input":{
        "type": "object",
        "properties": {
            "name": {
                "type": "string"
            },
            "description": {
                "type": "string"
            },
            "team": {
                "type": "string"
            },
            "app_location": {
                "type": "string"
            },
        },
        "additionalProperties": False,
        "required": ["name", "description", "team", "app_location"]
    },
    "create_timer_input": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string"
            },
            "description": {
                "type": "string"
            },
            "team": {
                "type": "string"
            },
            "paused": {
                "type": "boolean",
            },
            "interval_unit": {
                "type": "string",
                "enum": ["YEAR", "MONTH", "DAY", "HOUR", "MINUTE", "SECOND"]
            },
            "interval_amount": {
                "type": "integer",
                "minimum": 1
            },
            "start_from": {
                "$ref": f"#/types/datetime_string"
            },
            "topic": {
                "type": "string"
            },
            "context": {
                "type": "string"
            },
            "category": {
                "type": "string"
            },
            "end_at": {
                "$ref": f"#/types/nullable_datetime_string"
            }
        },
        "additionalProperties": False,
        "required": [
            "name", "description", "team", "paused", "interval_unit", "interval_amount", "start_from",
            "topic", "context", "category", "end_at"
        ]
    },
    "create_datarepo_input":{
        "type": "object",
        "properties": {
            "name": {
                "type": "string"
            },
            "description": {
                "type": "string"
            },
            "context": {
                "type": "string"
            },
            "type": {
                "type": "integer"
            },
        },
        "additionalProperties": False,
        "required": ["name", "description", "context", "type"]
    },
    "set_schema_and_sample_data_input": {
        "type": "object",
        "properties": {
            "schema": {
                "type": "string"
            },
            "sample_data": {
                "type": "string"
            },
        },
        "additionalProperties": False,
        "required": [
            "schema"
        ]
    },
    "create_tenant_input": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string"
            },
            "description": {
                "type": "string"
            },
            "config": {
                "type": "string"
            },
            "is_public": {
                "type": "boolean",
            },
        },
        "additionalProperties": False,
        "required": [
            "name", "description", "config", "is_public"
        ]
    }
}

def validate_model(model_name, data):
    MyValidator = validators.extend(
        Draft7Validator,
        validators = {
            'is_datetime_string': is_datetime_string
        }
    )
    schema = {
        "types": types,
        "models": models,
        "$ref": f"#/models/{model_name}"
    }
    my_validator = MyValidator(schema=schema)
    my_validator.validate(data)
