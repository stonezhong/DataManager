#!/bin/sh

# python -m coverage run --source="." manage.py test -v=2
python -m coverage run --source="." manage.py test
python -m coverage html

