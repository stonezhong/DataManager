import os
from config import get_mordor_config_json_template

enable_js_debug = get_mordor_config_json_template("django.json").get("enable_debug_js", False)

###################################################################
# stage: either "production" or "development"
###################################################################
def environment(request):
    return {
        "ENV_enable_js_debug": enable_js_debug
    }
