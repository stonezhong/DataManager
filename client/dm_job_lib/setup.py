import os
from setuptools import setup

# The directory containing this file
HERE = os.path.dirname(os.path.abspath(__file__))

# The text of the README file
with open(os.path.join(HERE, "README.md"), "r") as f:
    README = f.read()

# This call to setup() does all the work
setup(
    name="dm-job-lib",
    version="0.0.32",
    description="Data Manager Job Library",
    long_description=README,
    long_description_content_type="text/markdown",
    url="https://github.com/stonezhong/DataManager/tree/master/client/dm_job_lib",
    author="Stone Zhong",
    author_email="stonezhong@hotmail.com",
    license="MIT",
    classifiers=[
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
    ],
    packages=["dm_job_lib"],
    install_requires=["dc-client"],
)
