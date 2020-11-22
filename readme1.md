# Data Manager for Data Lake

Manages data assets and ETL pipelines for Apache Spark based Data Lake.

## Here is a list of platform we supports:
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

# Data Manager Feature

* [Data Catalog](#Data-Catalog)
* [Asset Tracking and data linage](#Asset-Tracking-and-data-linage)
* [Uniformed Spark Job Layer](#Uniformed-Spark-Job-Layer)
* [UI for Building ETL Pipeline](#UI-for-Building-ETL-Pipeline)

## Data Catalog

<details>
<summary>Keep track all datasets</summary>

* List all datasets
* Choose a dataset, you can view the schema of it.

Screenshot for list datasets:
<img src="docs/images/list_datasets.png" />

Screenshot for show schema of a dataset:
<img src="docs/images/show_schema.png" />
</details>


## Asset Tracking

<details>
<summary>List all assets</summary>
Data Manage can show you all the asset of a dataset.

<img src="docs/images/list_assets.png" />
</details>

<details>
<summary>Support for views</summary>
"asset" can be materized file, such as parquet, json or csv file, "asset" can also be a "view", which through a "loader", you can get the dataframe as well.
In this example, the asset <code>tradings:1.0:1:/2020-11-20</code> is a view, it unions 2 other assets
<img src="docs/images/asset_as_view.png" />
</details>


## Uniformed Spark Job Layer

<details>
<summary>dm-job-lib</summary>

Through [dm-job-lib](client/dm-job-lib), user's application can load asset, write asset, and register asset.

* Application using dm-job-lib to load, write assets are decoupled from specific cloud provider and can migrate to other platform easily.
* Application using dm-job-lib can be tested using PySPark with small scale of data easily.
</details>

<details>
<summary>uniformed tool to build, deploy and run job for all platforms</summary>

Please checkout [data-appls]
</details>

## UI for Building ETL Pipeline
Pleaee see the youtube video for details.

[![Data Manager Demo](http://img.youtube.com/vi/KOxbO0EI4MA/0.jpg)](https://www.youtube.com/watch?v=SLPCHyqxhKk")