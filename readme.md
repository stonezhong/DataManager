# Indexes
* [Brief](#Brief)
* [Overall Working Model](#overall-working-model)
* [Supported Platforms](#supported-platforms)
* [Features](#Features)
    * [Cloud Provider Agnostic](#cloud-provider-agnostic)
    * [Create Data Pipeline with UI](#create-data-pipeline-with-ui)
    * [Schedule Pipelines with UI](#schedule-pipelines-with-ui)
    * [Data Catalog](#data-catalog)
    * [Data Lineage](#data-lineage)
    * [Pipeline / Asset dependency](#pipeline-asset-dependency)
    * [View Schema for Dataset](#view-schema-for-dataset)
    * [Assets are immutable](#assets-are-immutable)
    * [Decouple asset’s name from storage location](#decouple-assets-name-from-storage-location)

# Brief

Data Manager is a one stop shop as Apache Spark based data lake management platform. It covers all the needs for data team that is using Apache Spark for batching process. However, data visualization and notebook (like JupyterHub) is not included in Data Manager. For more informations, please read [Data Manager wiki Pages](https://github.com/stonezhong/DataManager/wiki)

# Overall Working Model
![Pipeline Execution Diagram](https://raw.githubusercontent.com/stonezhong/DataManager/master/docs/images/pipeline_diagram.png)

# Supported Platforms
<table>
    <tr>
        <td>
            <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Apache_Spark_logo.svg/1200px-Apache_Spark_logo.svg.png"
                width="120px"
            />
        </td>
        <td>You setup your own Apache Spark Cluster.</td>
    </tr>
    <tr>
        <td>
            <img src="https://miro.medium.com/max/700/1*qgkjkj6BLVS1uD4mw_sTEg.png" width="120px" />
        </td>
        <td>
            Use <a href="https://pypi.org/project/pyspark/">PySpark</a> package, fully compatible to other spark platform, allows you to test your pipeline in a single computer.
        </td>
    </tr>
    <tr>
        <td>
            <img src="https://databricks.com/wp-content/uploads/2019/02/databricks-generic-tile.png" width="120px">
        </td>
        <td>You host your spark cluster in <a href="https://databricks.com/">databricks</a></td>
    </tr>
    <tr>
        <td>
            <img
                src="https://blog.ippon.tech/content/images/2019/06/emrlogogo.png"
                width="120px"
            />
        </td>
        <td>You host your spark cluster in <a href="https://aws.amazon.com/emr/">Amazon AWS EMR</a></td>
    </tr>
    <tr>
        <td>
            <img
                src="https://d15shllkswkct0.cloudfront.net/wp-content/blogs.dir/1/files/2020/07/100-768x402.jpeg"
                width="120px"
            />
        </td>
        <td>You host your spark cluster in <a href="https://cloud.google.com/dataproc">Google Cloud</a></td>
    </tr>
    <tr>
        <td>
            <img
                src="https://apifriends.com/wp-content/uploads/2018/05/HDInsightsDetails.png"
                width="120px"
            />
        </td>
        <td>You host your spark cluster in <a href="https://azure.microsoft.com/en-us/services/hdinsight/">Microsoft Azure HDInsight</a></td>
    </tr>
    <tr>
        <td>
            <img
                src="https://cdn.app.compendium.com/uploads/user/e7c690e8-6ff9-102a-ac6d-e4aebca50425/d3598759-8045-4b7f-9619-0fed901a9e0b/File/a35b11e3f02caf5d5080e48167cf320c/1_xtt86qweroeeldhjroaaaq.png"
                width="120px"
            />
        </td>
        <td>
            You host your spark cluster in <a href="https://www.oracle.com/big-data/data-flow/">Oracle Cloud Infrastructure, Data Flow Service</a>
        </td>
    </tr>
    <tr>
        <td>
            <img
                src="https://upload.wikimedia.org/wikipedia/commons/2/24/IBM_Cloud_logo.png"
                width="120px"
            />
        </td>
        <td>You host your spark cluster in <a href="https://www.ibm.com/products/big-data-and-analytics">IBM Cloud</a></td>
    </tr>
</table>

# Features

## Cloud Provider Agnostic
Data Manager support many Apache Spark providers, including AWS EMR, Microsoft Azure HDInsight, etc. For complete list, see [readme.md](https://github.com/stonezhong/DataManager).

* Pipelines, Data Applications are sit on top of an abstraction layer that hides the cloud provider details. 
* Moving your Data Manager based data lake from one cloud provider to another just need configuration change, no code change is required.

We achieved this by introducing “job deployer” and “job submitter” via python package [spark-etl](https://github.com/stonezhong/spark_etl).
* By using “spark_etl.vendors.oracle.DataflowDeployer” and “spark_etl.vendors.oracle.DataflowJobSubmitter”, your can run Data Manager in OCI DataFlow, here is an [example](https://github.com/stonezhong/spark_etl/blob/master/examples/config_oci.json).
* By using “spark_etl.vendors.local.LocalDeployer” and “spark_etl.vendors.local.PySparkJobSubmitter”, you can run Data Manager with PySpack with your laptop, here is an [example](https://github.com/stonezhong/spark_etl/blob/master/examples/config_local.json)
* By using "spark_etl.deployers.HDFSDeployer" and "spark_etl.job_submitters.livy_job_submitter.LivyJobSubmitter", you can run Data Manager with your on premise spark cluster, here is an [example](https://github.com/stonezhong/spark_etl/blob/master/examples/config_hdfs.json)

Even you are using a public cloud for your production data lake, you can test your pipeline and data application using PySpark on your laptop with down scaled sample data with exactly the same code.

## Create Data Pipeline with UI
It allows non-programmer to create pipeline via UI, the pipeline can have multiple “tasks”, each task is either executing a series of Spark-SQL statements or launching a Data Application.

![alt text](http://data-manager-docs.s3-website-us-west-2.amazonaws.com/pipeline-ui.png "Pipeline UI")

## Schedule Pipelines with UI
User can schedule the execution of pipeline with UI. It will execute all the pipelines related to the category of the scheduler, when these pipelines are invoked, they will use shared context defined in this scheduler.

![alt text](http://data-manager-docs.s3-website-us-west-2.amazonaws.com/scheduler-ui.png "Scheduler UI")

## Data Catalog
It provides a data catalog which tracks all datasets and assets. The data catalog has a REST API for client to query and register dataset and asset.

## Data Lineage

Data Manager keeps track the data lineage info. When you view an asset, you will see:
* The actual SQL statement that produces this asset if the asset is produced by Spark-SQL task
* The application name and arguments if the asset is produced by a data application
* Upstream assets, list of assets being used when producing this asset
* Downstream assets, list of assets that require this asset when produced

With these information, you understands where data comes from, where data goes to and how it is produced.

![alt text](http://data-manager-docs.s3-website-us-west-2.amazonaws.com/data-lineage-ui.png "Data Lineage UI")

## Pipeline / Asset dependency

You can specify a list of assets as “require” for a pipeline. The scheduler will only invoke the pipeline when all the required assets shows up.

Note, the required asset here in the example is <code>tradings:1.0:1:/{{dt}}</code>, this is actually a jinja template. "dt" is part of the rendering context belongs to the scheduler.

![alt text](http://data-manager-docs.s3-website-us-west-2.amazonaws.com/asset-dependency.png "Pipeline / Asset Dependency")

## View Schema for Dataset

In the Dataset Browser UI, you can see the schema for any dataset. Here is an example:

![alt text](http://data-manager-docs.s3-website-us-west-2.amazonaws.com/view-schema.png "View Schema")

## Assets are immutable
Assets are immutable, if you want to republish an asset (maybe the earlier asset has a data-bug), it will bump the revision. If you cache the asset or derived data from the asset, you can check the asset revision to decide whether you need to update your cache.

Each asset, only the latest revision might be active, and the metadata tracks all the revisions.

This page also shows the revision history, so you can see if the asset has been corrected or not, and when.

![alt text](http://data-manager-docs.s3-website-us-west-2.amazonaws.com/asset-revisions.png "View Schema")

## Decouple asset’s name from storage location

As you can see, below is a task inside a pipeline, it imports an asset <code>tradings:1.0:1/{{dt}}</code> and call it “tradings”, then run a SQL statement. User do not even need to know where is the storage location of the asset, Data Manager automatically resolve the asset name to storage location and load the asset from it.

This also make it easy to migrate data lake between cloud providers since your pipeline is not tied to the storage location of assets.

![alt text](http://data-manager-docs.s3-website-us-west-2.amazonaws.com/sql-task-basic-info.png "SQL Task - Basic Info")
![alt text](http://data-manager-docs.s3-website-us-west-2.amazonaws.com/sql-task-sql.png "SQL Task - SQL Statement")

If you go to the asset page, it shows the storage location for asset, for example:

![alt text](http://data-manager-docs.s3-website-us-west-2.amazonaws.com/asset-list.png "Asset List")
