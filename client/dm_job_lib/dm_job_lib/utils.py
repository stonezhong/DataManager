import json

def print_json(title, payload):
    print(title)
    print("------------------------------------------")
    print(f"\n{json.dumps(payload, indent=4, separators=(',', ': '))}")
    print("------------------------------------------")

def _trim_json(src, trim_array=5):
    ret = {}
    for k, v in src.items():
        if type(v)==dict:
            ret[k]=_trim_json(v, trim_array=trim_array)
            continue
        if trim_array is not None and type(v)==list:
            ret[k] = v[:trim_array]
            continue
        ret[k] = v

    return ret


def get_dataframe_sample_data(df, max_rows=5, trim_array=5):
    samples = df.limit(max_rows).toJSON().collect()
    trimmed_samples = [
        _trim_json(json.loads(sample)) for sample in samples
    ]
    return list(trimmed_samples)

