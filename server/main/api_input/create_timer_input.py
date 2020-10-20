from .schema import validate_model
from datetime import datetime
import pytz

class CreateTimerInput:
    @classmethod
    def from_json(cls, data):
        validate_model("create_timer_input", data)
        self = cls()
        self.name = data["name"]
        self.description = data["description"]
        self.team = data["team"]
        self.paused = data["paused"]
        self.interval_unit = data["interval_unit"]
        self.interval_amount = data["interval_amount"]
        self.offset_unit = data["offset_unit"]
        self.offset_amount = data["offset_amount"]
        self.initial_base = datetime.strptime(
            data["initial_base"], "%Y-%m-%d %H:%M:%S"
        )
        return self
