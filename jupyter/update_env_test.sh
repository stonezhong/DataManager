#!/bin/sh


###################################################################################
# This tool setup python libs and configs for jupyterlab
###################################################################################

###################################################################################
# Before you run this tool, you need to create a
# python3 virtual environment and run this tool under python3 virtualenv
###################################################################################


rm -rf python_libs/
mkdir python_libs/
pip install -r requirements.txt -t python_libs/
cp -R /home/stonezhong/dm/DataManager/client/dm_job_lib/dm_job_lib/* -t python_libs/dm_job_lib

for host in spnode1 spnode2 spnode3 spnode4
do
    ssh $host "rm -rf /mnt/python_libs && mkdir /mnt/python_libs"
    scp -r python_libs/* $host:/mnt/python_libs

    ssh $host "rm -rf /mnt/jupyter/configs && mkdir -p /mnt/jupyter/configs"
    scp -r .configs/* $host:/mnt/jupyter/configs
done


