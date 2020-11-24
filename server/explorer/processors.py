import os

###################################################################
# stage: either "production" or "development"
###################################################################
def environment(request):
    return {
        "ENV_is_production": True
    }
