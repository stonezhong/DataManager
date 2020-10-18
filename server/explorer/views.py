import os
import json
from datetime import datetime

from django.shortcuts import render, redirect
from django.http import  HttpResponseBadRequest, HttpResponseRedirect, JsonResponse, \
    HttpResponseNotFound
from django.contrib.auth import logout as do_logout, \
    authenticate as do_authenticate, login as do_login
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction

from main.models import Dataset, Pipeline, PipelineGroup, PipelineInstance, \
    Application
from main.serializers import PipelineSerializer, DatasetSerializer, \
    ApplicationSerializer, PipelineGroupDetailsSerializer

from rest_framework.renderers import JSONRenderer

from django.conf import settings
import explorer.airflow_lib as airflow_lib

import jinja2

def get_app_config():
    config = {
        'AIRFLOW_BASE_URL': settings.AIRFLOW_BASE_URL
    }
    return json.dumps(config)

def test(request):
    return render(
        request,
        'test.html',
        context={
            'user': request.user,
            'scripts':[
                '/static/js-bundle/test.js'
            ],
            'nav_item_role': 'home',
        }
    )

def index(request):
    return render(
        request,
        'index.html',
        context={
            'user': request.user,
            'scripts':[
                '/static/js-bundle/home.js'
            ],
            'nav_item_role': 'home',
            'app_config': get_app_config()
        }
    )

def datasets(request):
    # datasets = Dataset.get_active_datasets(request.user)
    return render(
        request,
        'datasets.html',
        context={
            'user': request.user,
            'scripts':[
                '/static/js-bundle/datasets.js'
            ],
            'nav_item_role': 'datasets',
            'app_config': get_app_config()
        }
    )

def dataset(request):
    dataset_id = request.GET['id']

    dataset = Dataset.objects.get(pk=dataset_id)
    s = DatasetSerializer(dataset, context={"request": request})

    app_context = {
        'dataset': s.data
    }

    return render(
        request,
        'dataset.html',
        context={
            'user': request.user,
            'dataset_id': dataset_id,
            'scripts':[
                '/static/js-bundle/dataset.js'
            ],
            'nav_item_role': 'datasets',
            'app_config': get_app_config(),
            'app_context': json.dumps(app_context),
        }
    )

def logout(request):
    do_logout(request)
    return HttpResponseRedirect(f'/explorer')


def login(request):
    if request.method == 'GET':
        return render(
            request,
            'login.html',
            context={
                'user': request.user,
            }
        )
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = do_authenticate(username=username, password=password)
        if user is not None:
            do_login(request, user)
            return HttpResponseRedirect('/explorer')
        # must be wrong
        return render(
            request,
            'login.html',
            context={
                'msg': "Wrong username or password!"
            }
        )

def pipelines(request):
    applications = Application.objects.filter(retired=False)

    s = ApplicationSerializer(applications, many=True, context={"request": request})
    app_context = {
        'applications': s.data
    }

    return render(
        request,
        'pipelines.html',
        context={
            'user': request.user,
            'scripts':[
                '/static/js-bundle/pipelines.js'
            ],
            'nav_item_role': 'pipelines',
            'app_config': get_app_config(),
            'app_context': json.dumps(app_context),
        }
    )

def pipeline(request):
    pipeline_id = request.GET['id']

    pipeline = Pipeline.objects.get(pk=pipeline_id)
    s = PipelineSerializer(pipeline, context={"request": request})

    app_context = {
        'pipeline': s.data
    }

    return render(
        request,
        'pipeline.html',
        context={
            'user': request.user,
            'pipeline_id': pipeline_id,
            'scripts':[
                '/static/js-bundle/pipeline.js'
            ],
            'nav_item_role': 'pipelines',
            'app_config': get_app_config(),
            'app_context': json.dumps(app_context),
        }
    )

def pipeline_groups(request):
    return render(
        request,
        'pipeline_groups.html',
        context={
            'user': request.user,
            'scripts':[
                '/static/js-bundle/pipeline_groups.js'
            ],
            'nav_item_role': 'executions',
            'app_config': get_app_config()
        }
    )

def pipeline_group(request):
    pipeline_group_id = request.GET['id']

    app_context = {
        "pipeline_group_id": pipeline_group_id
    }

    return render(
        request,
        'pipeline_group.html',
        context={
            'user': request.user,
            'pipeline_group_id': pipeline_group_id,
            'scripts':[
                '/static/js-bundle/pipeline_group.js'
            ],
            'nav_item_role': 'executions',
            'app_config': get_app_config(),
            'app_context': JSONRenderer().render(app_context).decode("utf-8")
        }
    )


def applications(request):
    return render(
        request,
        'applications.html',
        context={
            'user': request.user,
            'scripts':[
                '/static/js-bundle/applications.js'
            ],
            'nav_item_role': 'applications',
            'app_config': get_app_config()
        }
    )


def create_dag(request):
    print("Web API: create_dag is requested")
    payload = json.loads(request.body)
    print(f"payload: {payload}")

    dag_template = payload['dag-template']
    dag_name = payload['dag-name']
    pipeline_id = payload['pipeline-id'].replace('-', '')

    template_file = os.path.join(
        settings.BASE_DIR,
        "dag-templates",
        f"{dag_template}.py"
    )

    with open(template_file, "rt") as f:
        content = f.read()

    template = jinja2.Template(content)
    to_write = template.render({
        'pipeline_id': pipeline_id,
        'dag_id': dag_name,
    })

    airflow_lib.create_dag(f"{pipeline_id}.py", dag_name, to_write)

    # do the creation
    return JsonResponse({
    })

