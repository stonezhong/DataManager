import os
import json
import logging
import importlib
from datetime import datetime
import uuid

from airflow import DAG
from airflow.operators.python_operator import PythonOperator

from jinja2 import Template
import MySQLdb
import pytz

from dc_client import DataCatalogClient, dc_job_handler
from dm_job_lib import Loader

AIRFLOW_HOME = os.environ["AIRFLOW_HOME"]
ENV_HOME = os.environ["ENV_HOME"]

logger = logging.getLogger(__name__)

def load_dmapps_config(name):
    config_filename = os.path.join(ENV_HOME, "configs", "dmapps", name)
    with open(config_filename, "r") as f:
        return json.load(f)


def load_dm_config(name):
    config_filename = os.path.join(ENV_HOME, "configs", "dm", name)
    with open(config_filename, "r") as f:
        return json.load(f)


def get_mysql_connection():
    mysql_cfg = load_dm_config("db.json")['dm']

    conn = MySQLdb.connect(
        host    = mysql_cfg['server'],
        port    = mysql_cfg['port'],
        user    = mysql_cfg['username'],
        passwd  = mysql_cfg['password'],
        db      = mysql_cfg['db_name'],
        charset = mysql_cfg['charset'],
    )

    return conn


def get_application_location(application_id):
    # Get application location
    # application_id is UUID string, can have "-" in it
    # return application location or None if application not found
    app_id = application_id.replace("-", "")
    app_location = None

    with get_mysql_connection() as cur:
        cur.execute("SELECT app_location, name FROM main_application WHERE id='%s'" % (app_id))
        for row in cur:
            return row[0], row[1]

    return None, None


def get_execute_sql_app_location():
    # Get system app for execute SQL application location
    app_location = None

    with get_mysql_connection() as cur:
        cur.execute("SELECT id, app_location, name FROM main_application WHERE sys_app_id=1")
        for row in cur:
            return row[0], row[1], row[2]

    return None, None, None


def get_pipeline_details(pipeline_id):
    # Get pipeline context, version and dag_version
    with get_mysql_connection() as cur:
        cur.execute("SELECT context, version, dag_version, team FROM main_pipeline WHERE id='%s'" % (pipeline_id))
        for row in cur:
            pipeline_context = json.loads(row[0])
            pipeline_version = row[1]
            dag_version = row[2]
            team = row[3]
            return pipeline_context, pipeline_version, dag_version, team

    return None, None, None


def update_pipeline_version(pipeline_id, version):
    # update individual pipeline's version field in db
    with get_mysql_connection() as cur:
        cur.execute("UPDATE main_pipeline SET dag_version=%s WHERE id='%s'" % (version, pipeline_id))
        cur.connection.commit()
        # TODO: check rows updated


def update_pipeline_instance_status(pipeline_instance_id, status):
    # status is either "failed" or "finished"
    # update individual pipeline instance status
    with get_mysql_connection() as cur:
        now = datetime.utcnow().replace(tzinfo=pytz.UTC)
        if status == "failed":
            cur.execute("UPDATE main_pipelineinstance SET status='%s', failed_time='%s'   WHERE id='%s'" % (status, now, pipeline_instance_id))
        elif status == "finished":
            cur.execute("UPDATE main_pipelineinstance SET status='%s', finished_time='%s' WHERE id='%s'" % (status, now, pipeline_instance_id))
        cur.connection.commit()
        # TODO: check rows updated


def get_pipeline_group_context(pipeline_instance_id):
    # get individual pipeline group's context
    # return json or None if not found
    with get_mysql_connection() as cur:
        sql = """
            SELECT
                main_pipelinegroup.context
            FROM main_pipelineinstance
            LEFT JOIN main_pipelinegroup
                ON main_pipelineinstance.group_id = main_pipelinegroup.id
            WHERE
                main_pipelineinstance.id = '%s'
        """ % (pipeline_instance_id)
        cur.execute(sql)
        for row in cur:
            pipeline_group_context = json.loads(row[0])
            return pipeline_group_context
    return None

def pretty_json(payload):
    return json.dumps(payload, indent=4, separators=(',', ': '))


def log_info_with_title(title, payload):
    logger.info(f"{title}:\n{pretty_json(payload)}\n")


def get_job_submitter(job_submitter_config):
    class_name  = job_submitter_config['class']
    module      = importlib.import_module('.'.join(class_name.split(".")[:-1]))
    klass       = getattr(module, class_name.split('.')[-1])

    args    = job_submitter_config.get("args", [])
    kwargs  = job_submitter_config.get("kwargs", {})
    return klass(*args, **kwargs)

def get_job_submitter_for_tenancy(tenant_id):

    config = None
    with get_mysql_connection() as cur:
        cur.execute("SELECT config FROM main_tenant WHERE id='%s'" % (tenant_id))
        for row in cur:
            config = json.loads(row[0])
            break

    if config is None:
        raise Exception(f"Missing configuration for tenant {tenant_id}")

    # print(json.dumps(config, indent=4))
    if config['type'] == 'aws-emr':
        # print(json.dumps(config, indent=4))
        aws_emr_cfg = config['aws_emr']
        master_node = aws_emr_cfg['master_node']
        run_dir = aws_emr_cfg['run_dir']

        livy_submitter_cfg = {
            "livy": {
                "host"      : "127.0.0.1",
                "port"      : 8998,
                "protocol"  : "http",
                'via_tunnel': True,
            },
            "bridge"        : master_node,
            "stage_dir"     : "/home/hadoop/.stage",
            "run_dir"       : run_dir,
            "ssh_config"    : aws_emr_cfg['ssh_config']
        }

        job_submitter_config = {
            "class": "spark_etl.job_submitters.livy_job_submitter.LivyJobSubmitter",
            "args": [livy_submitter_cfg]
        }
        return get_job_submitter(job_submitter_config)

    if config['type'] == 'on-premise':
        # print(json.dumps(config, indent=4))
        on_premise_cfg = config['on_premise']

        livy_submitter_cfg = {
            "livy": {
                "host"      : on_premise_cfg['livy_host'],
                "port"      : on_premise_cfg['livy_port'],
                "protocol"  : on_premise_cfg['livy_protocol'],
                'via_tunnel': on_premise_cfg['livy_via_tunnel'],
            },
            "bridge"        : on_premise_cfg['bridge'],
            "stage_dir"     : on_premise_cfg['stage_dir'],
            "run_dir"       : on_premise_cfg['run_dir'],
            "ssh_config"    : on_premise_cfg['ssh_config']
        }
        if len(on_premise_cfg['livy_username']) > 0:
            livy_submitter_cfg['livy']['username'] = on_premise_cfg['livy_username']
            livy_submitter_cfg['livy']['password'] = on_premise_cfg['livy_password']


        job_submitter_config = {
            "class": "spark_etl.job_submitters.livy_job_submitter.LivyJobSubmitter",
            "args": [livy_submitter_cfg]
        }
        return get_job_submitter(job_submitter_config)

    raise Exception(f"{config['type']} is not supported")


class ExecuteTask:
    def __init__(self, task_ctx, team):
        self.task_ctx = task_ctx
        self.team = team

    def __call__(self, ds, **kwargs):
        # task_ctx is json stored in context field in pipeline model
        task = kwargs['task']
        dag = task.dag
        ti = kwargs['ti']

        # for each dag run, user will pass in a pipeline group
        config = kwargs['dag_run'].conf
        log_info_with_title("Runtime config", config)
        log_info_with_title("Task context", self.task_ctx)

        dm_username = config['dm_username']
        dm_token    = config['dm_token']

        tenant_id = config['tenant_id']
        pipeline_instance_id = config['pipeline_instance_id']
        pipeline_group_context = get_pipeline_group_context(pipeline_instance_id)
        log_info_with_title("pipeline group context context", pipeline_group_context)

        # inject XCOM into pipeline group context
        pipeline_group_context['xcom'] = {}
        for task in dag.tasks:
            pipeline_group_context['xcom'][task.task_id] = ti.xcom_pull(task_ids=task.task_id)
        log_info_with_title("pipeline group context context after xcom", pipeline_group_context)

        spark_etl_cfg = load_dmapps_config("config.json")
        dm_offline = spark_etl_cfg.get("dm_offline")

        dc_config = load_dm_config("dc_config.json")
        dc_config['dm_username'] = dm_username
        dc_config['dm_token']    = dm_token
        print(f"dm_offline = {dm_offline}")

        task_spark_options = None

        if self.task_ctx['type'] == 'other':
            task_args_str = Template(self.task_ctx['args']).render(pipeline_group_context)
            task_args = json.loads(task_args_str)
            args = {
                "pipeline_group_context": pipeline_group_context,
                "tenant_id": tenant_id,
                "application_id": self.task_ctx['application_id'],
                "app_args": task_args,
                "team": self.team,
            }
            if dm_offline:
                args['dm_offline'] = True
                # When data manager is off-line from spark-job, then it is useless
                # to inject dc_config to the job
            else:
                args['dc_config'] = dc_config

            appLocation, appName = get_application_location(self.task_ctx['application_id'])
            log_info_with_title("app_args", args['app_args'])

            task_spark_options_str = self.task_ctx.get("spark_opts")
            if task_spark_options_str:
                task_spark_options = json.loads(task_spark_options_str)
        elif self.task_ctx['type'] == 'dummy':
            logger.info("Dummy task")
            logger.info("Done")
            return
        else:
            application_id, appLocation, appName = get_execute_sql_app_location()
            if appLocation is None:
                logger.error("Unable to find Execute SQL system app")
                raise Exception(f"Unable to find Execute SQL system app")
            task_ctx_str = Template(json.dumps(self.task_ctx)).render(pipeline_group_context)
            task_ctx = json.loads(task_ctx_str)
            args = {
                "pipeline_group_context": pipeline_group_context,
                "tenant_id": tenant_id,
                "application_id":application_id,
                "app_args": {
                    "steps": task_ctx['steps'],
                },
                "team": self.team
            }
            if dm_offline:
                args['dm_offline'] = True
            else:
                args['dc_config'] = dc_config

            log_info_with_title("app_args", args['app_args'])

            task_spark_options_str = self.task_ctx.get("spark_opts")
            if task_spark_options_str:
                task_spark_options = json.loads(task_spark_options_str)

        job_submitter = get_job_submitter_for_tenancy(tenant_id)
        options=spark_etl_cfg.get("job_run_options", {})
        options['display_name'] = appName

        if task_spark_options:
            options.update(task_spark_options)

        if dm_offline:
            dcc = DataCatalogClient(
                url_base = dc_config['url_base'],
                dm_username = dm_username,
                dm_token = dm_token
            )
            handlers = [lambda content: dc_job_handler(content, dcc)]
        else:
            handlers = None
        ret = job_submitter.run(appLocation, options=options, args=args, handlers=handlers)

        logger.info("Done")
        return ret

def on_dag_run_success(context):
    try:
        logger.info("on_dag_run_success: enter")
        config = context['dag_run'].conf
        pipeline_instance_id = config['pipeline_instance_id']
        logger.info(f"pipeline_instance_id = {pipeline_instance_id}")
        update_pipeline_instance_status(pipeline_instance_id, 'finished')
        logger.info("on_dag_run_success: exit")
    except:
        logger.exception("on_dag_run_success")
        raise


def on_dag_run_failure(context):
    try:
        logger.info("on_dag_run_failure: enter")
        config = context['dag_run'].conf
        pipeline_instance_id = config['pipeline_instance_id']
        logger.info(f"pipeline_instance_id = {pipeline_instance_id}")
        update_pipeline_instance_status(pipeline_instance_id, 'failed')
        logger.info("on_dag_run_failure: exit")
    except:
        logger.exception("on_dag_run_failure")
        raise

def create_dag_info_file(dag_info_filename, tenant_id, pipeline_id, dag_id):
    with open(dag_info_filename, "wt") as dag_info_f:
        pipeline_context, pipeline_version, dag_version, team = get_pipeline_details(pipeline_id)
        dag_info = {
            "pipeline_context": pipeline_context,
            "pipeline_version": pipeline_version,
            "dag_version": dag_version,
            "team": team
        }
        dag_info_f.write(json.dumps(dag_info, indent=4))


def create_simple_flow_dag(tenant_id, pipeline_id, dag_id):
    # logger.info(f"Creating dag, pipeline_id={pipeline_id}, dag_id={dag_id}")

    update_dag_version = False
    # too bad we are not importing airflow_lib, so we are computing dag_info_filename
    dag_info_filename = os.path.join(AIRFLOW_HOME, "dags", str(tenant_id), f"{uuid.UUID(pipeline_id)}.json")
    if True or not os.path.exists(dag_info_filename):
        create_dag_info_file(dag_info_filename, tenant_id, pipeline_id, dag_id)
        update_dag_version = True
    with open(dag_info_filename, "rt") as dag_info_f:
        dag_info = json.load(dag_info_f)

    pipeline_context = dag_info['pipeline_context']
    pipeline_version = dag_info['pipeline_version']
    dag_version      = dag_info['dag_version']
    team             = dag_info['team']

    if pipeline_context is None:
        raise Exception(f"Pipeline {pipeline_id} does not exist!")

    # log_info_with_title("Pipeline context", pipeline_context)
    # logger.info(f"Pipeline version: {pipeline_version}")
    # logger.info(f"DAG version     : {dag_version}")
    # logger.info(f"team            : {team}")

    task_dict = {}

    args = {
        'owner': 'airflow',
        'depends_on_past': False,
        'wait_for_downstream': False,
         # We do not rely on airflow to schedule job anyway
         # We always trigger job manually
        'start_date': datetime(2000, 1, 1),
        'retries': 0,
    }

    dag = DAG(
        dag_id,
        default_args      = args,
        schedule_interval = None,
        on_success_callback = on_dag_run_success,
        on_failure_callback = on_dag_run_failure,
        catchup=False
    )
    for task_ctx in pipeline_context['tasks']:
        job_task = PythonOperator(
            task_id = task_ctx['name'],
            provide_context = True,
            python_callable = ExecuteTask(task_ctx, team),
            dag=dag,
        )
        task_dict[task_ctx['name']] = job_task

    # wire dependencies
    for dependency in pipeline_context['dependencies']:
        src_task = task_dict[dependency['src']]
        dst_task = task_dict[dependency['dst']]
        src_task << dst_task

    if update_dag_version:
        update_pipeline_version(pipeline_id, pipeline_version)
        logger.info(f"DAG(tenant={tenant_id}, pipeline={pipeline_id}, dag_id={dag_id}) created from DB")
    else:
        logger.info(f"DAG(tenant={tenant_id}, pipeline={pipeline_id}, dag_id={dag_id}) created from cache")

    return dag
