from .schema import validate_model
from datetime import datetime
import pytz

class CreateTimerInput:
    @classmethod
    def from_json(cls, data):
        validate_model("create_timer_input", data)
        self = cls()
        self.tenant_id = data["tenant_id"]
        self.name = data["name"]
        self.description = data["description"]
        self.team = data["team"]
        self.paused = data["paused"]
        self.interval_unit = data["interval_unit"]
        self.interval_amount = data["interval_amount"]
        self.start_from = datetime.strptime(
            data["start_from"], "%Y-%m-%d %H:%M:%S"
        )
        self.topic = data['topic']
        self.context = data['context']
        self.category = data['category']
        end_at = data['end_at']
        if end_at:
            self.end_at = datetime.strptime(
                end_at, "%Y-%m-%d %H:%M:%S"
            )
        else:
            self.end_at = None
        return self
