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
from django.urls import reverse

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

# test page is for testing UI components
def test(request):
    app_context = {
        'component': request.GET.get("component", None)
    }

    return render(
        request,
        'common_page.html',
        context={
            'user': request.user,
            'sub_title': "UI Test",
            'scripts':[
                '/static/js-bundle/test.js'
            ],
            'nav_item_role': '',
            'app_config': get_app_config(),
            'app_context': json.dumps(app_context),
        }
    )

def index(request):
    return redirect(reverse('datasets'))

def datasets(request):
    return render(
        request,
        'common_page.html',
        context={
            'user': request.user,
            'sub_title': "Datasets",
            'scripts':[
                '/static/js-bundle/datasets.js'
            ],
            'csses': [
                '/static/css/pages/datasets.css'
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
        'common_page.html',
        context={
            'user': request.user,
            'sub_title': "Dataset",
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
        'common_page.html',
        context={
            'user': request.user,
            'sub_title': "Pipelines",
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
        'common_page.html',
        context={
            'user': request.user,
            'sub_title': "Pipeline",
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
        'common_page.html',
        context={
            'user': request.user,
            'sub_title': "Executions",
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
        'common_page.html',
        context={
            'user': request.user,
            'sub_title': "Execution",
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
        'common_page.html',
        context={
            'user': request.user,
            'sub_title': "Applications",
            'scripts':[
                '/static/js-bundle/applications.js'
            ],
            'nav_item_role': 'applications',
            'app_config': get_app_config()
        }
    )


def schedulers(request):
    return render(
        request,
        'common_page.html',
        context={
            'user': request.user,
            'sub_title': "Schedulers",
            'scripts':[
                '/static/js-bundle/schedulers.js'
            ],
            'nav_item_role': 'schedulers',
            'app_config': get_app_config()
        }
    )

