from jinja2 import Template

import os
import json

APP_NAME = "dm"
ENV_HOME = os.environ.get('ENV_HOME')

def get_mordor_config(name):
    with open(os.path.join(ENV_HOME, "configs", APP_NAME, name), "rt") as f:
        return f.read()


def get_mordor_config_json_template(name, context={}):
    template = Template(get_mordor_config(name))
    rendered_content = template.render(
        context
    )
    return json.loads(rendered_content)

def get_log_path():
    return os.path.join(ENV_HOME, "logs", APP_NAME)