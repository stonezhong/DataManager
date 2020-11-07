#!/usr/bin/sh

source /root/mordor/venvs/dm/bin/activate
cd /root/mordor/apps/dm/current

# start the web
python manage.py runserver 0.0.0.0:8888 &

# start the scheduler
./scheduler.py &

