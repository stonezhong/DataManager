# Server Build and Deploy

## Dev environment
<details>
<summary>Build Machine</summary>

- I am using Ubuntu 18.04
- I have python 3.6.9 (shipped with Ubuntu)
- I have node v10.16.3

```
(.venv) stonezhong@trentor ~/DATA_DISK/projects/DataManager/server (main)$ uname -a
Linux trentor 5.4.0-48-generic #52~18.04.1-Ubuntu SMP Thu Sep 10 12:50:22 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux
(.venv) stonezhong@trentor ~/DATA_DISK/projects/DataManager/server (main)$ python3 --version
Python 3.6.9
(.venv) stonezhong@trentor ~/DATA_DISK/projects/DataManager/server (main)$ node -v
v10.16.3
```
</details>

## Setup build environment
<details>
<summary>Create python virtual environment</summary>

```bash
# assuming your current directory is $PROJECT_ROOT/server
mkdir .venv
python3 -m venv .venv
source .venv/bin/activate
pip install pip setuptools --upgrade
pip install wheel
pip install libsass==0.20.1
pip install mordor2==0.0.27
```

- libsass is needed for build css library
- mordor2 is needed for deployment
</details>

<details>
<summary>Initialize npm</summary>

```bash
npm install
```
</details>

## Build
<details>
<summary>Build CSS Library</summary>

```bash
# Build css styles
source .venv/bin/activate
./build-css.sh
```
</details>


<details>
<summary>Build javascripts</summary>

```bash
npm run build
```
</details>

<details>
<summary>Build all</summary>

```bash
./build.sh
```
</details>

## Deployment
<details>
<summary>Setup host to deploy</summary>

- Airflow and DataManager are on the same box.
- You can host Data Manager on any CentOS 7 or 8 or compatible system.
- With CentOS 7, you need to set MySQL user password in native mode to avoid `caching_sha2_password` error if your MySQL's version is 8.x

Here is an example to setup a docker container to host the data manager. I have a docker swarm cluster installed so it can access MySQL in the same swarm cluster. `home` is the overlay network name in my swarm cluster.

- To create the container, do the following:
```
docker run \
    --privileged -d \
    -h dmhost \
    --name dmhost \
    --network home \
    stonezhong/centos_python3
```

- now update os
```
docker exec -it dmhost bash
yum update
# now restart the container
CTRL-D
docker stop dmhost
docker start dmhost
```

- config you `~/.ssh/config` so you can login to dmhost without specifying password
</details>

<details>
<summary>Install some packages</summary>

```
yum install tmux mysql-devel
```
</details>

<details>
<summary>Config ssh</summary>

You shuold be able to ssh to bridge node without password, config your `~/.ssh/config` file.

Here is an example: (my `~/.ssh/config` on dmhost)
```
Host spnode1
    HostName spnode1
    User root
    IdentityFile ~/.ssh/home
```

Now try `ssh spnode1`, if you can ssh without password, you are done with this step.
</details>

## Airflow
<details>
<summary>Airflow: create DB in MySQL</summary>

```
CREATE SCHEMA `dm-airflow` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin ;
```
</details>

<details>
<summary>Install Airflow</summary>

- step1: `setup python virtual environment for airflow`
```
mkdir -p ~/.venvs/airflow
python3 -m venv  ~/.venvs/airflow
source ~/.venvs/airflow/bin/activate
pip install pip setuptools --upgrade
pip install wheel
```

- step 2: `set environment variables`
    - add `export AIRFLOW_HOME=$HOME/airflow/home` to your `~/.bashrc`

also do
```
export AIRFLOW_HOME=$HOME/airflow/home
mkdir -p $AIRFLOW_HOME
```

- step 3: `install airflow`
```
pip install apache-airflow[mysql] apache-airflow[password]
```
- step 4: `config airflow`
```
cd $AIRFLOW_HOME
airflow config   # it will generate $AIRFLOW_HOME/airflow.cfg
```

Now update the config, edit file $AIRFLOW_HOME/airflow.cfg
```
# we are using MySQL as backend
# mysql server name: mysql1 (you can change it)
# username: USERNAME        (you can change it)
# password: PASSWORD        (you can change it)
# port: the port MySQL listens on (normally 3306, you can change it if needed)
# db name: dm-airflow       (you can change it)
sql_alchemy_conn = mysql://USERNAME:PASSWORD@mysql1:3306/airflow?charset=utf8mb4&binary_prefix=true

executor = LocalExecutor
load_examples = False

# we want DAG not paused upon creation
dags_are_paused_at_creation = False

# When you drop a file in dag directory, this value controls how long it shows up in airflow web UI
dag_dir_list_interval = 10

auth_backend = airflow.api.auth.backend.default

```
</details>

<details>
<summary>Install additional packages</summary>

```
pip install Jinja2==2.11.2
pip install spark-etl==0.0.6
```
</details>

<details>
<summary>Initialize airflow</summary>

```
airflow initdb
```
</details>

<details>
<summary>Configuration files</summary>

We have the config files in the following structure:
```
$AIRFLOW_HOME/configs
  |
  +-- dc_config.json
  |
  +-- livy.json
  |
  +-- mysql.json
  |
  +-- spark_env.json
```

* `dc_config.json`
    - This is the data manager API location.
```
{
    "url_base": "http://192.168.0.7:8888/api",
    "username": "stonezhong",
    "password": "xyz"
}
```


* `livy.json`
    - Your spark cluster need to have livy installed, so we can submit spark jobs through it. This file tells the livy endpoint location and username/password. Example
    - You also need to have a `bridge` node, the bridge node can access HDFS (we are not using webhdfs yet) via hdfs command. You should be able to ssh to the bridge node without password
    - `bridge.stage_dir`: the staging area if we want to pass files to HDFS.
```
{
    "livy": {
        "service_url": "http://spnode1:8998/",
        "username": "root",
        "password": "xyz"
    },
    "bridge": {
        "hostname": "spnode1",
        "stage_dir": "/root/.stage"
    }
}
```

* `mysql.json`
    - The config for MySQL DB, looks like blow. The airflow DAG may need to access mysql to get some information.
```
{
    "hostname": "mysql1",
    "username": "stonezhong",
    "password": "123",
    "db"      : "dm-beta",
    "charset" : "utf8"
}
```

* `spark_env.json`
    - some spark related config
    - it tells where to set the run_dir (a concept in [spark_etl](https://github.com/stonezhong/spark_etl/blob/master/vendor-native.md) )
    - it tells where the execute_sql is deployed.
```
{
    "apps": {
        "execute_sql": {
            "appLocation": "hdfs:///etl/apps/execute_sql/1.0.0.0"
        }
    },
    "run_dir": "hdfs:///etl/runs"
}
```
</details>

<details>
<summary>Create directory $AIRFLOW_HOME/dags</summary>

```bash
mkdir $AIRFLOW_HOME/dags
```
</details>

<details>
<summary>Airflow: start</summary>

create some useful alias, put them in your ~/.bashrc
```bash
alias eairflow='source ~/.venvs/airflow/bin/activate'
alias airflow_s='airflow scheduler'
alias airflow_web='airflow webserver -p 8080'
```

```bash
# create a TMUX session, called airflow_web
# do
eairflow
cd $AIRFLOW_HOME
airflow_web

# crate a TMUX session, called airflow_s
# do
eairflow
cd $AIRFLOW_HOME
airflow_s

```

We can try to access it via ssh tunnel before we config the nginx.

`ssh -L 8080:localhost:8080 dmhost`, and open browser and go to page `http://localhost:8080/`, if you can see the page, then your airflow is successfully installed.
</details>


<details>
<summary>Airflow: Config Nginx</summary>

Since `home` network isn't reachable from outside, I have a nginx server to do the port forwarding

vi /etc/nginx/nginx.conf

```
...
stream {
    server {
        # airflow web
        listen 60010;
        proxy_pass dmhost:8080;
    }
}

systemctl restart nginx
```
</details>



## Data Manager
<details>
<summary>Config your mordor</summary>

We use `mordor` to deploy Data Manager, first, you need to config mordor on your dev machine, here is the file structure you shuold have:

```
~/.mordor
|
+-- config.json
|
+-- configs
      |
      +-- dm
            |
            +-- beta
                  |
                  +-- db.json
                  |
                  +-- django.json
```

Your ~/.mordor/config.json looks like

```
{
    "hosts": {
        "dmhost": {
            "ssh_host"  : "dmhost",
            "env_home"  : "/root/mordor",
            "virtualenv": "/usr/bin/virtualenv",
            "python3"   : "/usr/bin/python3"
        }
    },
    "applications": {
        "dm_beta": {
            "stage"       : "beta",
            "name"        : "dm",
            "home_dir"    : "/home/stonezhong/DATA_DISK/projects/DataManager/server",
            "deploy_to"   : [ "dmhost" ],
            "use_python3" : true,
            "config"      : {
                "db.json": "copy",
                "django.json": "copy"
            }
        }
    }
}
```

Your ~/.mordor/configs/dm/beta/db.json looks like:
```
{
    "server":   "mysql1",
    "username": "username",
    "password": "password",
    "db_name":  "dm-beta"
}
```
- Data Manager uses MySQL as backend database server.
- `server`   : the MySQL server name (or ip)
- `username` : the username for MySQL
- `password` : the password for MySQL
- `db_name`  : the database name

Your ~/.mordor/configs/dm/beta/django.json looks like:
```
{
    "SECRET_KEY": "zoz#m&pm!t#0e4+%es_x!2n6(af6sh+@pt2gr03#n!=1%on*^g",
    "ALLOW_ANONYMOUS_READ": true
}
```
- You can change the secret key
- If ALLOW_ANONYMOUS_READ is false, then anonymous user cannot view data manager.
</details>

<details>
<summary>Initialize host for mordor</summary>

- run `mordor -a init-host --host-name <hostname>` to initialize the destination host
    - E.g., I am running `mordor -a init-host --host-name dmhost`
- For details, see [mordor2 document](https://github.com/stonezhong/mordor)
</details>

<details>
<summary>Deploy Data Manager</summary>

- run `mordor -a stage -p dm --stage beta  --update-venv T`

If you make changes latter, and you are not adding new packages, you can do
`mordor -a stage -p dm --stage beta  --update-venv F` to speed up the deployment.

</details>

<details>
<summary>Data Manager: initialize database</summary>

- First, login MySQL console (I am using MySQL Workbench) to create the schema:
```
CREATE SCHEMA `dm-beta` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
```

- Now, initialize the database:

```bash
eae dm
rm -f main/migrations/*      # I do this in dev environment
python manage.py migrate
python manage.py makemigrations main
python manage.py migrate main

# Then create admin. You can change it!
python manage.py createsuperuser --email stone.zhong@gmail.com --username stonezhong
```
</details>

<details>
<summary>Start Data Manager</summary>

- create an alias, put into you `~/.bashrc` file:
```
alias dm_web='python manage.py runserver 0.0.0.0:8888'
```

- create a tmux session, called "dm_web"
```
eae dm
dm_web
```

To check the server, do a ssh tunnel and see if the server is running before config the nginx forward.

ssh -L 8888:localhost:8888 dmhost
</details>

<details>
<summary>Start Scheduler</summary>

```bash
# do it in tmux session
eae dm
./scheduler.py
```
</details>

<details>
<summary>Data Manager: config nginx</summary>

vi /etc/nginx/nginx.conf

```
...
stream {
    server {
        # dcs beta
        listen 60009;
        proxy_pass dmhost:8888;
    }
}

systemctl restart nginx
```

</details>
