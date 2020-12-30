import os
import sys
import uuid
import subprocess
from functools import wraps

from pyspark import SparkFiles

def task_stage_objects(group):
    from pulse_logic import stage_objects

    worker_return = stage_objects(
        group['idx'],
        group['group_creation_time'],
        group['round'],
        group['max_group_time'],
        group['source_region'],
        group['total_size'],
        group['dt'],
        group['obj_infos'],
        group['delegation_token'],
        group['destination'],
        group['pulse_bucket_name']
    )

    return worker_return
