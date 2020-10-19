import requests
from datetime import datetime

# Let's hard code it for now
ENDPOINT = "http://192.168.0.30:8888/api"

def decode_dataset_instance_path(dataset_instance_path):
    # full_path is dataset_name:major_version:minor_version/path
    slash_p = dataset_instance_path.find('/')
    if slash_p < 0:
        raise Exception("Invalid dataset instance path")

    p1 = dataset_instance_path[:slash_p]
    dsi_path = dataset_instance_path[slash_p:]

    dataset_name, major_version, minor_version = p1.split(':')
    minor_version = int(minor_version)
    return (dataset_name, major_version, minor_version, dsi_path)

