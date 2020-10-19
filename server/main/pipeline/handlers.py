import json
from datetime import datetime

from main.models import PipelineInstance, Pipeline, PipelineContext
from jinja2 import Template


# All the functions here are for creating PipelineInstance

# Create a PipelineInstance that will
# 1) Invoke a airflow DAG called execute_sql_xxx where xxx is the name of the pipeline
# 2) Will drop a config file to $AIRFLOW/dag_configs/execute_sql_xxx.json
# 3) The DAG config will have following fields
#        spark_config, see config.json in the example of spark_etl project
#        jobs: an array of job description, each job will be a DAG task and will
#        submit a spark job to execute_sql
# 4) jobs is a json array, taken from Pipeline's args as JINJA template
#

def execute_sql_handler(pipeline_context, pipeline):
    pipeline_instance = PipelineInstance()
    pipeline_instance.pipeline = pipeline
    pipeline_instance.context = pipeline_context

    pipeline_ctx = json.loads(pipeline_context.context)

    template = Template(pipeline.on_context_created_args)

    pipeline_instance.instance_context = template.render(**pipeline_ctx)
    pipeline_instance.create_time = datetime.utcnow()
    pipeline_instance.status = "created"

    pipeline_instance.airflow_context = json.dumps("{}")
    pipeline_instance.save()

    return pipeline_instance











