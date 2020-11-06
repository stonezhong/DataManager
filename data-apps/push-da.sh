#!/bin/sh

# Copy data-app to the test machine

ssh dmhost "mkdir -p /root/data-apps"
scp -r . dmhost:/root/data-apps
