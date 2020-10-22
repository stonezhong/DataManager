# Why you want to consider Data Manager?

Here are the reasons:
<html>
<table>
<tr>
    <td>Without Data Manager</td>
    <td>With Data Manager</td>
</tr>

<tr>
    <td>
        <ul>
            <li>
                My data is messy, I have lots of JSON, parquet files distributed in hundreds of AWS S3 buckets, it is hard for me to find the data when I need it
            </li>
            <li>
                My ETL pipeline code load data with physical path directly, once I move the data, many pipelines got broken and I have to spend whole day to fix it.
            </li>
        </ul>
    </td>
    <td>
        <ul>
            <li>
                With the data catalog Data Manager provides, I can easily find the data I needed. I can go to the Datasets menu, find the dataset, and click the dataset, I can see all the instances of that dataset. (TODO) Use the search menu, I can search dataset by name.
            </li>
            <li>
                With the data catalog Data Manager provides, your ETL pipeline can reference dataset by "logical name" instead of physical location, if the data moves the location, your pipeline stay unbroken.
            </li>
        </ul>
    </td>
</tr>

<tr>
    <td>
        <ul>
            <li>
                The cost for building ETL pipeline is high. I have to contact Data Enginer to create a pipeline, test it and publish it, it usually take days to get it done.
            </li>
            <li>
                We have bunch of data applications, each of them do a specific thing, document is not clear, only Data Engineer knows how to use it.
            </li>
            <li>
                For launch the pipeline, I have to ask Data Engineer to manually update the airflow DAG code to adding the new pipeline, and set the schedule in the code.
            </li>
        </ul>
    </td>
    <td>
        <ul>
            <li>
                Now I just click the "Pipelines" menu, 95% of time, I can create pipeline using SparkSQL with this tool, and for the 5% rare cases, our Data Engineer write highly reusable Data Application to help me.
            </li>
            <li>
                I can also create pipeline with mixed steps, some steps uses the SparkSQL, and some steps invokes the in-house Data Applications.
            </li>
            <li>
                Data Manager creates airflow DAG for me based on the steps I entered in Web UI, Data Manager also allows me to set the schedule for the pipeline, so I can create our daily trading data processing pipeline easily, and launch it quickly.
            </li>
        </ul>
    </td>
</tr>
</table>
</html>

# [Data Manager Server](server)
# [Data Applications](data-apps)

Feel free to contact me at [stonezhong@hotmail.com](mailto:stonezhong@hotmail.com) if you have any questions.
