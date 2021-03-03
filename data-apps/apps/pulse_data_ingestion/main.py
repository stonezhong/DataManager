from datetime import date, datetime, timedelta
import os
import json
from functools import wraps
import uuid

from oci_core import os_upload_json, get_delegation_token, dfapp_get_os_client, os_delete_objects
import pulse_logic as pl
from config import OHDDATA_NAMESPACE, OHDDATA_BUCKETS, OHDDATA_REGION

from processor import task_stage_objects
from tools import json_2_str, partition, dt_str_to_date

def make_task(f, sysops):
    @wraps(f)
    def wrapper(*args, **kwargs):
        sysops['install_libs']()
        return f(*args, **kwargs)
    return wrapper

def stage_json_objects_round(
    spark, 
    worker_task, 
    round, dt, destination, pulse_bucket_name, 
    object_infos, watermark, max_group_time, group_count
):
    # purpose: stage json objects
    # arguments
    #   spark:            spark session
    #   round:            the round number, integer
    #   object_infos:     objects to download, list of obj_info
    #   watermark:        max size per group, integer
    #   max_group_time:   each group should not exceed this time when processing, timedelta
    #   group_count:      number of groups to split into

    delegation_token = get_delegation_token(spark)
    sc = spark.sparkContext

    sorted_object_infos = sorted(
        object_infos, 
        key = lambda obj_info: (obj_info['region'], obj_info['ad'], )
    )

    groups = []
    last_obj_info = None
    group = {
        "source_region": "",
        "total_size": 0,
        "obj_infos": [],
    }
    objs_per_group = (len(object_infos) + group_count - 1) // group_count
    for obj_info in sorted_object_infos:
        if last_obj_info is None or last_obj_info['region'] != obj_info['region']:
            if len(group['obj_infos']) > 0:
                group['idx'] = len(groups)
                groups.append(group)
                group = {
                    "source_region": "",
                    "total_size": 0,
                    "obj_infos": [],
                }
        
        last_obj_info = obj_info
        group['source_region'] = obj_info['region']
        group['total_size'] += obj_info['size']
        group['obj_infos'].append(obj_info)
        if (group['total_size'] > watermark) or (len(group['obj_infos']) >= objs_per_group):
            group['idx'] = len(groups)
            groups.append(group)
            group = {
                "source_region": "",
                "total_size": 0,
                "obj_infos": [],
            }

    if len(group['obj_infos']) > 0:
        group['idx'] = len(groups)
        groups.append(group)

    now = datetime.utcnow()
    for group in groups:
        group['dt'] = dt
        group['delegation_token'] = delegation_token
        group['destination'] = destination
        group['pulse_bucket_name'] = pulse_bucket_name
        group['max_group_time'] = max_group_time
        group['round'] = round
        group['group_creation_time'] = now

    debug_info = {
        "round": round,
        "max_group_time": max_group_time.total_seconds(),
        "object_count": len(object_infos),        # total object count
        "process_duration": 0.0,                  # download object, unzip, parse, zip, and upload time
        "group_count": len(groups),               # how many groups do we have
        "watermark": watermark,                   # watermark for each group
        "unhandled_count": 0,
        "worker_debug_info_list": [],
        "group_summary": {},
    }

    # keep it in sync with debug_info in pulse_logic.py
    keys = [
        "download_file_count",
        "download_duration",
        "download_size",
        "total_size",
        "unzip_file_count",
        "unzip_duration",
        "load_json_count",
        "load_json_duration",
        "dump_json_line_duration",
        "write_stage_file_duration",
        "gzip_output_duration",
        "upload_duration",
        "upload_size",
        "upload_file_count",
        "total_duration",
        "unhandled_count",
    ]
    for key in keys:
        debug_info["group_summary"][key] = 0

    t1 = datetime.utcnow()
    rdd = sc.parallelize(groups)
    r = rdd.map(worker_task)
    worker_return_list = r.collect()
    t2 = datetime.utcnow()
    duration = (t2 - t1).total_seconds()
    debug_info["process_duration"] = duration

    unhandled_object_infos = []
    for worker_return in worker_return_list:
        group_unhandled_object_infos, group_debug_info = worker_return
        unhandled_object_infos.extend(group_unhandled_object_infos)
        debug_info['worker_debug_info_list'].append(group_debug_info)

        for key in keys:
            debug_info['group_summary'][key] += group_debug_info[key]
    
    debug_info['unhandled_count'] = len(unhandled_object_infos)
    return unhandled_object_infos, debug_info

def action_generate_parquet(spark, args, sysops, application_id):
    # requires
    # args
    #     action   : should be "generate-parquet"
    #     bucket   : the PULSE bucket, e.g. "problems"
    #     dt       : the date for the data, e.g. "2020-06-01"

    server_channel = sysops['channel']

    stage     = args['stage']
    bucket    = args['bucket']
    dt        = dt_str_to_date(args['dt'])
    partition_count = args['partition_count']

    pl.generate_parquet(
        spark,
        server_channel,
        dt, 
        source = {
            'bucket': bucket,
        },
        destination = {
            'region'    : OHDDATA_REGION,
            'namespace' : OHDDATA_NAMESPACE,
            'bucket'    : OHDDATA_BUCKETS[bucket][stage],
        },
        partition_count = partition_count,
        application_id = application_id,
        application_args = args,
    )

def action_stage_objects(spark, args, sysops):
    # requires
    # args
    #     action            : should be "stage-objects"
    #     stage             : "beta" or "prod"
    #     pulse_bucket_name : the PULSE bucket, e.g. "problems"
    #     dt                : string, the date for the data, e.g. "2020-06-01"
    #     regions           : dict, key is region name, value is ad list, like ['AD_1', 'AD_2', 'AD_3']
    #     watermark         : control how big each group is (in term of total raw pulse object size)
    print("action_stage_objects: enter")

    stage               = args['stage']
    pulse_bucket_name   = args['pulse_bucket_name']
    dt                  = dt_str_to_date(args['dt'])
    regions             = args['regions']
    watermark           = args['watermark']
    max_group_time      = timedelta(seconds=int(args['max_group_time']))
    group_count         = args['group_count']

    debug_info = {
        "collect_object_list_duration": 0.0,      # time to collect list of objects for the day
        "object_count": 0,                        # total object count
        "rounds": [],
    }

    delegation_token = get_delegation_token(spark)

    # get object list
    t1 = datetime.utcnow()
    obj_infos = []
    for region, ads in regions.items():
        region_obj_infos = pl.get_objects_for_day(
            dt, 
            {
                'bucket': pulse_bucket_name,
                'region': region,
                'ads'   : ads
            },
            delegation_token
        )
        print(f"{len(region_obj_infos)} objects for {region}")
        obj_infos.extend(region_obj_infos)
    print(f"Overall {len(obj_infos)} objects")
    t2 = datetime.utcnow()
    duration = (t2 - t1).total_seconds()
    debug_info['collect_object_list_duration'] = duration
    debug_info['object_count'] = len(obj_infos)


    # during testing, let's chop it to  speed up the testing
    # obj_infos = obj_infos[:1000]

    destination = {
        'region'    : OHDDATA_REGION,
        'namespace' : OHDDATA_NAMESPACE,
        'bucket'    : OHDDATA_BUCKETS[pulse_bucket_name][stage],
    }
    dest_region    = destination['region']
    dest_namespace = destination['namespace']
    dest_bucket    = destination['bucket']

    # clean the staging area
    os_client = dfapp_get_os_client(dest_region, delegation_token)
    os_delete_objects(os_client, dest_namespace, dest_bucket, f"__stage__/{dt}/raw/")
    os_delete_objects(os_client, dest_namespace, dest_bucket, f"__stage__/{dt}/summary/")

    current_object_infos = obj_infos
    worker_task = make_task(task_stage_objects, sysops)
    for round in range(0, 10):       # no more than 10 rounds
        unhandled_object_infos, round_debug_info = stage_json_objects_round(
            spark, worker_task, round, dt, destination, pulse_bucket_name, current_object_infos, watermark, 
            max_group_time, group_count
        )
        debug_info['rounds'].append(round_debug_info)
    
        if len(unhandled_object_infos) == 0:
            break
        current_object_infos = unhandled_object_infos
    
    if len(unhandled_object_infos) > 0:
        raise Exception("Not all objects are handled!")
    
    print("action_stage_objects: exit")

    return debug_info


def main(spark, input_args, sysops={}):
    print("main: enter")
    print("================== args ==================")
    print(json_2_str(input_args))
    print("==========================================")
    print("")

    args = input_args['app_args']
    application_id = input_args['application_id']

    action = args['action']
    ret = None
    if action == 'generate-parquet':
        ret = action_generate_parquet(spark, args, sysops, application_id)
    elif action == 'stage-objects':
        ret = action_stage_objects(spark, args, sysops)
    else:
        raise Exception(f"Unrecognized action {action}")
    
    print("main: exit")
    return ret
