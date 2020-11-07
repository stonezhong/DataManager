# Steps to test Data Manager using spark-local

## Step 1: setup a MySQL server 8.x:
- You can change the password if needed.

```
docker run \
    --name mysql \
    -p 3306:3306/tcp \
    -e MYSQL_ROOT_PASSWORD=foo -d mysql:latest
```

- create a SQL user, you can use different password if needed
```
docker exec -it mysql mysql --host localhost --user=root --password=foo
CREATE USER 'dm'@'%' IDENTIFIED WITH mysql_native_password BY 'foo';
CREATE USER 'dm'@'localhost' IDENTIFIED WITH mysql_native_password BY 'foo';
GRANT ALL ON *.* TO 'dm'@'localhost';
GRANT ALL ON *.* TO 'dm'@'%';
FLUSH PRIVILEGES;
```


## Step 2: run the docker container
```
# port 8080 is for airflow
# port 8888 is for Data Manager
# port 8787 is for jupyterlab
docker run -d --name dm \
    -p 8080:8080/tcp \
    -p 8888:8888/tcp \
    -p 8787:8787/tcp \
    stonezhong/dm
```

## initialize the container
- Make sure you review the config at docker/local/config.json

```
docker exec -it dm bash
cd ~/DataManager/docker/local
./initialize.py
```

## start
```
# start airflow
./start-airflow.sh

# start jupyter notebook
./start-jupyter.sh

# start web server
./start-django.sh
```
