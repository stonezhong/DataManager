# Brief

This command pushes some python libraries and configurations to spark cluster so jupyter notebook can use it.

# How to

```
|
+-- .configs
|
+-- requirements.txt
```

- You can put configurations to `.configs` directory
- You can put required python libraries to `requirements.txt`

Then you run `update_env.sh` to push these files to spark cluster

On each node of spark cluster, they will be landed at
```
/mnt
  |
  +-- jupyter/configs
  |
  +-- python_libs
```

# setup in Jupyter Notebook
```python
# To add python path
import sys
sys.path.insert(0,'/mnt/python_libs')

# To load configuration file
import os
import json
def get_config(name):
    with open(os.path.join("/mnt/jupyter/configs", name), "r") as f:
        return json.load(f)
```

# setup venv
To run  `update_env.sh`, you need a virtual environment, here is how you create it:
```
mkdir .venv
python3 -m venv .venv
source .venv/bin/activate
pip install pip setuptools --upgrade
pip install whell
```

