# create test environment
```bash
cd ~/dm/DataManager/client/dc_client/test
mkdir .testenv
python3 -m venv .testenv
source .testenv/bin/activate
pip install pip setuptools --upgrade
pip install wheel
pip install -r requirements.txt
# install dc-client
pip install -e ~/dm/DataManager/client/dc_client
```

# run tests
```bash
cd ~/dm/DataManager/client/dc_client/test
source .testenv/bin/activate
pytest
```
