import gzip
import json
import tempfile
import os
from datetime import date, datetime
import subprocess
import hashlib

import simplejson as json2
import oci
from oci_core import os_download, get_delegation_token, dfapp_get_os_client, \
    os_upload, os_delete_objects, os_delete_object_if_exists, os_upload_json, \
    os_rename_objects

from dc_client import DataCatalogClientProxy
from dm_job_lib import Loader

# list all PULSE objects for a given day, for a given region and ad

PULSE_NAMESPACE = "oci-pulse-prod"

REGIONS = {
    "PHX"           : ["AD_1", "AD_2", "AD_3"],
    "IAD"           : ["AD_1", "AD_2", "AD_3"],
    "UK_LONDON_1"   : ["AD_1", "AD_2", "AD_3"],
    "EU_FRANKFURT_1": ["AD_1", "AD_2", "AD_3"],
    "AP_SEOUL_1"    : ["AD_1"],
    "CA_TORONTO_1"  : ["AD_1"],
    "AP_TOKYO_1"    : ["AD_1"],
    "AP_MUMBAI_1"   : ["AD_1"],
    "SA_SAOPAULO_1" : ["AD_1"],
    "AP_SYDNEY_1"   : ["AD_1"],
    "EU_ZURICH_1"   : ["AD_1"],
    "AP_MELBOURNE_1": ["AD_1"],
    "AP_OSAKA_1"    : ["AD_1"],
    "EU_AMSTERDAM_1": ["AD_1"],
    "ME_JEDDAH_1"   : ["AD_1"],
    "AP_HYDERABAD_1": ["AD_1"],
    "CA_MONTREAL_1" : ["AD_1"],
    "AP_CHUNCHEON_1": ["AD_1"],
    "US_SANJOSE_1"  : ["AD_1"],
    "ME_DUBAI_1"    : ["AD_1"],
    "UK_CARDIFF_1"  : ["AD_1"],
}

REGION_START_DATE = {
    "PHX"           : date(2018, 11, 1),
    "IAD"           : date(2018, 11, 1),
    "UK_LONDON_1"   : date(2018, 11, 1),
    "EU_FRANKFURT_1": date(2018, 11, 1),
    "AP_SEOUL_1"    : date(2019, 4, 17),
    "CA_TORONTO_1"  : date(2019, 4, 15),
    "AP_TOKYO_1"    : date(2019, 4, 28),
    "AP_MUMBAI_1"   : date(2019, 10, 8),
    "SA_SAOPAULO_1" : date(2019, 10, 8),
    "AP_SYDNEY_1"   : date(2019, 10, 8),
    "EU_ZURICH_1"   : date(2019, 10, 8),
    "AP_MELBOURNE_1": date(2020, 3, 5),
    "AP_OSAKA_1"    : date(2020, 3, 5),
    "EU_AMSTERDAM_1": date(2020, 3, 5),
    "ME_JEDDAH_1"   : date(2020, 3, 5),
    "AP_HYDERABAD_1": date(2020, 5, 14),
    "CA_MONTREAL_1" : date(2020, 5, 14)
}

# if a region is down after it is started, put it here
REGION_DOWN_HISTORY = [
    {
        "region": "AP_HYDERABAD_1",
        "bucket": "problems",
        "start": date(2020, 5, 27),
        "end": None   # end is exclusive
    }
]

class RawPulseDataLocations:
    # terminologies
    # When I say "path", it is a path like 'foo/bar', **not** start with '/'
    # When I say "url", it is a URL, like oci://bucket@namespace/foo/bar
    def __init__(self, destination):
        # destination
        #     region          - the region for saving the pulse data
        #     bucket          - the bucket for saving the pulse data
        #     namespace       - the namespace for saving the pulse data
        self.destination = destination
    
    def url_from_path(self, path):
        return f"oci://{self.destination['bucket']}@{self.destination['namespace']}/{path}"


def is_date_in_range(dt, begin, end):
    return begin <= dt and (end is None or dt < end)

def is_region_down(region, bucket, dt):
    for i in REGION_DOWN_HISTORY:
        if i['region']==region and i['bucket']==bucket and is_date_in_range(dt, i['start'], i['end']):
            return True
    return False

def should_collect_data(region, bucket, dt):
    return REGION_START_DATE[region] <= dt and not is_region_down(region, bucket, dt)

# Convert a pulse object to json
#     Download the gz file from object storage, unzip it and convert it to json
def object_to_json(os_client, bucket, object_name, debug_info):
    # os_client  : object storage client for pulse objects
    # object_name: the name of the object
    tmp_f = tempfile.NamedTemporaryFile(delete=False, suffix='.json.gz')
    tmp_f.close()

    try:
        t1 = datetime.utcnow()
        os_download(os_client, tmp_f.name, PULSE_NAMESPACE, bucket, object_name)
        t2 = datetime.utcnow()
        duration = (t2 - t1).total_seconds()
        debug_info['download_duration'] += duration
        debug_info['download_file_count'] += 1

        filesize = os.path.getsize(tmp_f.name)
        debug_info['download_size'] += filesize
        if filesize==0:
            return [], "OK"

        # unzip it
        t1 = datetime.utcnow()
        r = subprocess.call(['gunzip', tmp_f.name])
        t2 = datetime.utcnow()
        duration = (t2 - t1).total_seconds()
        debug_info['unzip_file_count'] += 1
        debug_info['unzip_duration'] += duration
        if r == 1:
            return [], "BAD-GZIP"
        if r != 0:
            raise Exception("gunzip failure")

        unzipped_filename = tmp_f.name[:-3]

        t1 = datetime.utcnow()
        try:
            with open(unzipped_filename, "rb") as f:
                ret = json2.load(f)
                t2 = datetime.utcnow()
                duration = (t2 - t1).total_seconds()
                debug_info['load_json_duration'] += duration
                debug_info['load_json_count'] += 1
                return ret, "OK"
        except json2.errors.JSONDecodeError:
            t2 = datetime.utcnow()
            duration = (t2 - t1).total_seconds()
            debug_info['load_json_duration'] += duration
            return ret, "BAD-JSON"
        finally:
            if os.path.isfile(unzipped_filename):
                os.remove(unzipped_filename)
    finally:
        if os.path.isfile(tmp_f.name):
            os.remove(tmp_f.name)


# Get list of pulse objects for the given day
def get_objects_for_day(dt, source, delegation_token):
    # dt                            - date
    # source                        - specify the source
    #     region                    - the region of the pulse data
    #     bucket                    - the bucket name, e.g. "problems"
    #     ads                       - list of ADs in the region, such as ['AD_1', 'AD_2', 'AD_3']
    # delegation_token              - the oci delegation_token
    src_region = source['region']
    src_bucket = source['bucket']
    src_ads    = source['ads']
    os_client = dfapp_get_os_client(src_region, delegation_token)

    obj_infos = []
    for ad in src_ads:
        prefix = f"{src_region}_{ad}/{src_bucket}/{dt.year}/{dt.month}/{dt.day}/"
        for record in oci.pagination.list_call_get_all_results_generator(
            os_client.list_objects, 'record', PULSE_NAMESPACE, src_bucket, prefix=prefix, fields = "name, size",
        ):
            obj_infos.append({"name": record.name, "size": record.size, 'region': src_region, 'ad': ad})
    
    return obj_infos


# Save all pulse rows in JSON object in staging area
def generate_parquet(spark, server_channel, dt, source, destination, partition_count, application_id, application_args):
    # spark             - spark session
    # dt                - date, for which day we are processing?
    # source            - specify the source
    #     bucket        - the pulse bucket we are handling
    # destination
    #     region          - the region for saving the pulse data
    #     bucket          - the bucket for saving the pulse data
    #     namespace       - the namespace for saving the pulse data
    source_bucket = source['bucket']
    dest_region = destination['region']
    dest_namespace = destination['namespace']
    dest_bucket = destination['bucket']
    os_client = dfapp_get_os_client(dest_region, get_delegation_token(spark))

    os_delete_objects(os_client, dest_namespace, dest_bucket, f"{dt}/")

    rpl = RawPulseDataLocations(destination)
    # save pulse data
    write_location = rpl.url_from_path(f"{dt}/raw.parquet")
    df = spark.read.json(rpl.url_from_path(f"__stage__/{dt}/raw/*"))
    df.coalesce(partition_count).write.partitionBy("_sys_region").parquet(write_location)
    data_time = datetime.combine(dt, datetime.min.time())
    df = spark.read.parquet(write_location)

    # register it to data catalog
    dcc = DataCatalogClientProxy(server_channel)
    loader = Loader(dcc=dcc)

    dsi = loader.register_asset(
        spark,
        f"daily_pulse_{source_bucket}_raw:1.0:1:/{dt}",
        'hwd',
        'parquet', write_location,
        df.count(), df.schema.jsonValue(),
        data_time = data_time,
        application_id = application_id,
        application_args = json.dumps(application_args),
    )

    # save summary
    df = spark.read.json(rpl.url_from_path(f"__stage__/{dt}/summary/*"))
    # summary file is small, so it is ok to have 1 partition per region
    df.coalesce(1).write.partitionBy("region").parquet(rpl.url_from_path(f"{dt}/summary.parquet"))

    os_delete_objects(os_client, dest_namespace, dest_bucket, f"__stage__/{dt}/raw/")
    os_delete_objects(os_client, dest_namespace, dest_bucket, f"__stage__/{dt}/summary/")



def stage_objects(
    group_idx, group_creation_time, round, 
    max_group_time, source_region, total_size, 
    dt, obj_infos, delegation_token, destination, pulse_bucket_name
):
    # group_idx         - group index, each task has a group index
    # group_creation_time - when the group is created, datetime
    # round             - the round number, integer
    # max_group_time    - max time a group is allowed, timedelta
    # source_region     - the pulse region
    # total_size        - total raw pulse object size in bytes
    # dt                - date, for which day we are processing?
    # obj_infos         - list of dict which contain name, size, region and ad (for PULSE object names, object size, region and ad)
    # delegation_token  - oci delegation token
    # destination
    #     region          - the region for saving the pulse data
    #     bucket          - the bucket for saving the pulse data
    #     namespace       - the namespace for saving the pulse data
    # pulse_bucket_name -  Pulse bucket name

    current_dir = os.getcwd()

    begin_time = datetime.utcnow()

    debug_info = {
        "download_file_count": 0,           # number of gzipped pulse raw file
        "download_duration": 0.0,           # time to download gzipped pulse raw file
        "download_size": 0,                 # total bytes for gzipped pulse raw file downloaded
        "total_size": total_size,           # total bytes for gzipped pulse raw file (form list objects api)
                                            # should match download_size

        "unzip_file_count": 0,              # number of time we unzip gzipped raw pulse file
        "unzip_duration": 0.0,              # time to unzip gzipped raw pulse file

        "load_json_count": 0,               # number of json we try to load from unzipped pulse file
        "load_json_duration": 0.0,          # time to load json

        "dump_json_line_duration": 0.0,     # the time to dump a json object to a string in a line for the output
        "write_stage_file_duration": 0.0,   # the time to write to staging file

        "gzip_output_duration": 0.0,        # gzip output json for pulse data

        "upload_duration": 0.0,             # time for upload to object storage, both raw json and summary json
        "upload_size": 0,                   # total bytes for upload
        "upload_file_count": 0,             # number of files upload

        "total_duration": 0.0,              # total duration for this task
        "unhandled_count": 0,               # number of object_info that is skipped
    }

    rpl = RawPulseDataLocations(destination)

    stage_path   = f"__stage__/{dt}/raw"
    summary_path = f"__stage__/{dt}/summary"

    dest_region = destination['region']
    dest_namespace = destination['namespace']
    dest_bucket = destination['bucket']

    save_os_client  = dfapp_get_os_client(dest_region, delegation_token)
    pulse_os_client = dfapp_get_os_client(source_region, delegation_token)

    summaries = []

    local_stage_filename = os.path.join(current_dir, f"__{round}_{group_idx}-{pulse_bucket_name}-{dt}-stage__.json")
    local_stage_gz_filename = f"{local_stage_filename}.gz"

    if os.path.isfile(local_stage_filename):
        os.remove(local_stage_filename)
    if os.path.isfile(local_stage_gz_filename):
        os.remove(local_stage_gz_filename)

    unhandled_object_infos = []
    with open(local_stage_filename, "a+t") as f:
        for obj_info_idx, obj_info in enumerate(obj_infos):

            now = datetime.utcnow()
            if (now - group_creation_time) >= max_group_time:
                unhandled_object_infos = obj_infos[obj_info_idx:]
                break

            object_name = obj_info['name']
            filename_md5 = hashlib.md5(object_name.encode('utf-8')).hexdigest()
            rows, status = object_to_json(pulse_os_client, pulse_bucket_name, object_name, debug_info)
            for idx, row in enumerate(rows):
                row['_sys_region'] = obj_info['region']
                row['_sys_filename_md5'] = filename_md5
                row['_sys_idx'] = idx
                
                t1 = datetime.utcnow()
                line = f"{json.dumps(row)}\n"
                t2 = datetime.utcnow()
                duration = (t2 - t1).total_seconds()
                debug_info['dump_json_line_duration'] += duration

                t1 = datetime.utcnow()
                f.write(line)
                t2 = datetime.utcnow()
                duration = (t2 - t1).total_seconds()
                debug_info['write_stage_file_duration'] += duration

            summary = {
                "count": len(rows),
                "ad": obj_info['ad'],
                "region": obj_info['region'],
                "filename_md5": filename_md5,
                "filename": obj_info['name'],
                "filesize": obj_info['size'],
                "date": str(dt),
                "status": status
            }
            summaries.append(summary)

    t1 = datetime.utcnow()
    subprocess.check_call(['gzip', local_stage_filename])
    t2 = datetime.utcnow()
    duration = (t2 - t1).total_seconds()
    debug_info['gzip_output_duration'] = duration

    filesize = os.path.getsize(local_stage_gz_filename)
    t1 = datetime.utcnow()
    os_upload(
        save_os_client, 
        local_stage_gz_filename,
        dest_namespace, dest_bucket, f"{stage_path}/{round:03}_{group_idx:07}.json.gz"
    )
    if os.path.isfile(local_stage_filename):
        os.remove(local_stage_filename)
    if os.path.isfile(local_stage_gz_filename):
        os.remove(local_stage_gz_filename)
    t2 = datetime.utcnow()
    duration = (t2 - t1).total_seconds()
    debug_info['upload_duration'] += duration
    debug_info['upload_size'] += filesize
    debug_info['upload_file_count'] += 1

    # upload summary as well
    local_summary_filename = os.path.join(current_dir, f"__{round}_{group_idx}-{pulse_bucket_name}-{dt}-summary__.json")
    with open(local_summary_filename, "wt") as f:
        for summary in summaries:
            line = f"{json.dumps(summary)}\n"
            f.write(line)
    t1 = datetime.utcnow()
    os_upload(
        save_os_client, 
        local_summary_filename,
        dest_namespace, dest_bucket, f"{summary_path}/{round:03}_{group_idx:07}.json"
    )
    t2 = datetime.utcnow()
    filesize = os.path.getsize(local_summary_filename)
    duration = (t2 - t1).total_seconds()
    debug_info['upload_duration'] += duration
    debug_info['upload_size'] += filesize
    debug_info['upload_file_count'] += 1

    end_time = datetime.utcnow()
    debug_info['total_duration'] = (end_time - begin_time).total_seconds()
    debug_info['begin_time'] = begin_time.strftime("%Y-%m-%d %H:%M:%S")
    debug_info['end_time'] = end_time.strftime("%Y-%m-%d %H:%M:%S")
    debug_info['unhandled_count'] = len(unhandled_object_infos)
    return unhandled_object_infos, debug_info
