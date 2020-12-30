from pyspark.sql import SparkSession, SQLContext, Row
import oci
from oci_core import get_os_client, get_df_client, os_upload, os_upload_json, dfapp_get_os_client

def main(spark, args):
    # dummy code to load dataframe
    Student = Row("id", "name")
    df = spark.createDataFrame([
        Student(1, 'foo'),
        Student(3, 'bar'),
        Student(2, 'tar')
    ])
    df.show()

    # list objects for problems
    client = dfapp_get_os_client(spark, "https://objectstorage.us-ashburn-1.oraclecloud.com")


    # print("oci is imported")
    # conf = spark.sparkContext.getConf()
    # token_path = conf.get("spark.hadoop.fs.oci.client.auth.delegationTokenPath")

    # # read in token
    # with open(token_path) as fd:
    #     delegation_token = fd.read()
    #     print("delegation_token = {}".format(delegation_token))

    # signer = oci.auth.signers.InstancePrincipalsDelegationTokenSigner(delegation_token=delegation_token)
    # print("signer created")

    # client = oci.object_storage.ObjectStorageClient(
    #     {}, signer=signer, service_endpoint='https://objectstorage.us-ashburn-1.oraclecloud.com', timeout=60.0
    # )
    # print("object storage client created")

    r = client.list_objects("oci-pulse-prod", "problems")
    for object_sumary in r.data.objects:
        print(">> {}".format(object_sumary.name))
    print("list object done")





