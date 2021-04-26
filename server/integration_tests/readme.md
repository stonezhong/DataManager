# Purpose
* Test dc-client
* Test dm-job-lib

# Prepare
* Create a python virtual environment
```
mkdir ~/dm/.test_venv
python3 -m venv ~/dm/.test_venv
source ~/dm/.test_venv/bin/activate
pip install pip setuptools --upgrade
pip install wheel
pip install -r ~/dm/DataManager/server/requirements.txt
pip install pyspark
pip install -e ~/dm/DataManager/client/dc_client
pip install -e ~/dm/DataManager/client/dm_job_lib
```

# To run the test
