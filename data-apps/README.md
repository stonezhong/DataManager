# Brief

This directory has all the data applications needed for data manager.

# setup
<details>
<summary>Brief</summary>

- The dev environment is in your dev machine
- You can publish data app to HDFS

</details>


<details>
<summary>setup dev environment</summary>

- Create a python virtualenv

```
mkdir .venv
python3 -m venv .venv
source .venv/bin/activate
pip install pip setuptools --upgrade
pip install wheel
pip install -r requirements.txt
```

You can create an alias to make enter virtualenv easier, put the following in your `~/.bashrc`
```
alias evenv="source .venv/bin/activate"
```

</details>

<details>
<summary>config.json</summary>

Here is an example:

```
{
    "livy": {
        "service_url": "http://10.0.0.18:60008/",
        "username": "root",
        "password": "changeme"
    },
    "bridge": {
        "hostname": "spnode1",
        "stage_dir": "/root/.stage"
    }
}
```

- note: my dev machine is not in the swarm cluster, so it access livy via reverse proxy (nginx).
- your dev machine MUST be able to ssh the bridge without password, you need to config your `~/.ssh/config`
</details>

# build

- Each directory in `app` directory is an application. Here is how you build:


<details>
<summary>Example: build and deploy</summary>

```
./build.sh execute_sql
```
</details>

# Test

<details>
<summary>Test generate trading samples</summary>

- You can run `./test-gts.sh`
- after done, checkout data manager's dataset instance under data set "tradings:1.0:1"
</details>

<details>
<summary>Test execute-sql</summary>

- You can run `./test-execute-sql.sh`
- after done, run `yarn logs -applicationId <app_id>` on spnode1 to check the yarn log.
    - search `running App: execute_sql` in the log and look at the log file.
</details>
