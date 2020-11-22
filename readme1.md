# Data Manager for Data Lake

Manages data assets and ETL pipelines for Apache Spark based Data Lake.

Here is a list of platform we supports:
<table>
    <tr>
        <td>
            <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Apache_Spark_logo.svg/1200px-Apache_Spark_logo.svg.png"
                width="120px"
            />
        </td>
        <td>
            <img src="https://databricks.com/wp-content/uploads/2019/02/databricks-generic-tile.png" width="120px">
        </td>
        <td>
            <img
                src="https://blog.ippon.tech/content/images/2019/06/emrlogogo.png"
                width="120px"
            />
        </td>
        <td>
            <img
                src="https://cdn.app.compendium.com/uploads/user/e7c690e8-6ff9-102a-ac6d-e4aebca50425/d3598759-8045-4b7f-9619-0fed901a9e0b/File/a35b11e3f02caf5d5080e48167cf320c/1_xtt86qweroeeldhjroaaaq.png"
                width="120px"
            />
        </td>
        <td>
            <img
                src="https://upload.wikimedia.org/wikipedia/commons/2/24/IBM_Cloud_logo.png"
                width="120px"
            />
        </td>
    </tr>
</table>

# Data Manager Feature

* Data Catalog
* Asset Tracking and data linage
* Uniformed Spark Job Layer
* [Automatic ETL Pipeline builder UI](#Automatic-ETL-Pipeline-builder-UI)

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
<summary>List all assets for a given dataset</summary>
Data Manage can show you all the asset of a dataset.

<img src="docs/images/list_assets.png" />
</details>

<details>
<summary>Support for views</summary>
"asset" can be materized file, such as parquet, json or csv file, "asset" can also be a "view", which through a "loader", you can get the dataframe as well.
In this example, the asset tradings:1.0:1:/2020-11-20 is a view, it unions 2 other assets
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

## Automatic ETL Pipeline builder UI
