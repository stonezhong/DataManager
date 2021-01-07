import os
from setuptools import setup

# The directory containing this file
HERE = os.path.dirname(os.path.abspath(__file__))

# The text of the README file
with open(os.path.join(HERE, "README.md"), "r") as f:
    README = f.read()

# This call to setup() does all the work
setup(
    name="dc-client",
    version="0.0.100",
    description="Data Catalog Client",
    long_description=README,
    long_description_content_type="text/markdown",
    url="https://github.com/stonezhong/DataManager/tree/master/client/dc_client",
    author="Stone Zhong",
    author_email="stonezhong@hotmail.com",
    license="MIT",
    classifiers=[
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
    ],
    packages=["dc_client"],
    install_requires=["requests"],
)
