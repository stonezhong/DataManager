import json
from datetime import date

# dump a json object to pretty formatted string
def json_2_str(obj):
    return json.dumps(obj, indent=4, separators=(',', ': '))        

# split a list into count partitions evenly (best effort)
def partition(objs, count):
    # objs  : list like
    # count : number of groups
    # return list of groups, each group has
    #     idx : the group id
    #     objs: objects in the group
    assert type(count)==int
    assert count > 0

    ret = []
    for i in range(0, count):
        ret.append({
            'idx': i,
            'objs': []
        })

    for i, obj in enumerate(objs):
        idx = i % count
        ret[idx]['idx'] = idx
        ret[idx]['objs'].append(obj)
    
    return ret

# convert a date string to date object, e.g. "2020-11-02" --> date(2020, 11, 2)
def dt_str_to_date(dt_str):
    return date(*[int(i) for i in dt_str.split('-')])
