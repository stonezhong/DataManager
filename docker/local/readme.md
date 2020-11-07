# Steps to test Data Manager using spark-local

## Step 1: run a MySQL server:
- You can change the password if needed.

```
docker run \
    --name mysql \
    -e MYSQL_ROOT_PASSWORD=foo -d mysql:latest
```

- create a SQL user
```
docker exec -it mysql mysql --host localhost --user=root --password=foo
CREATE USER 'dm'@'%' IDENTIFIED WITH mysql_native_password BY 'foo';
CREATE USER 'dm'@'localhost' IDENTIFIED WITH mysql_native_password BY 'foo';
GRANT ALL ON *.* TO 'dm'@'localhost';
GRANT ALL ON *.* TO 'dm'@'%';
FLUSH PRIVILEGES;
```



## Checkout Data Manager source code
```
mkdir ~/test
cd ~/test
git clone git@github.com:stonezhong/DataManager.git
```

## run it in docker
```
docker run -d --name dm \
    -v ~/test/DataManager:/root/DataManager \
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
