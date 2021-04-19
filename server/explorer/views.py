import os
import json
from datetime import datetime, timedelta

from django.shortcuts import render, redirect
from django.http import  HttpResponseBadRequest, HttpResponseRedirect, JsonResponse, \
    HttpResponseNotFound
from django.contrib.auth import logout as do_logout, \
    authenticate as do_authenticate, login as do_login
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.urls import reverse
from django.http import HttpResponse, HttpResponseForbidden
from django.contrib.auth.models import User

from django.core.exceptions import ObjectDoesNotExist, ValidationError

from main.models import Dataset, Pipeline, PipelineGroup, PipelineInstance, \
    Application, Asset, DataRepo, Tenant, UserTenantSubscription, \
    AccessToken, do_signup_user
from main.serializers import PipelineSerializer, DatasetSerializer, \
    ApplicationSerializer, PipelineGroupDetailsSerializer, \
    AssetSerializer, DataRepoSerializer, UserTenantSubscriptionSerializer

from rest_framework.renderers import JSONRenderer

from django.conf import settings
import explorer.airflow_lib as airflow_lib

import jinja2
from graphviz import Digraph

from email_tools import send_signup_validate_email

def get_app_config():
    config = {
        'AIRFLOW_BASE_URL': settings.AIRFLOW_BASE_URL
    }
    return json.dumps(config)

# test page is for testing UI components
def test(request):
    app_context = {
        'classname': request.GET.get("classname", None)
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
    if not request.user.is_authenticated:
        return redirect(reverse('login'))
    return redirect(reverse('datalakes'))

def datasets(request, tenant_id):
    if not request.user.is_authenticated:
        return redirect(reverse('login'))

    return render(
        request,
        'common_page.html',
        context={
            'user': request.user,
            'sub_title': "Datasets",
            'scripts':[
                '/static/js-bundle/datasets.js'
            ],
            'nav_item_role': 'datasets',
            'app_config': get_app_config(),
            'tenant_id': tenant_id,
        }
    )

def dataset(request, tenant_id):
    if not request.user.is_authenticated:
        return redirect(reverse('login'))

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
            'app_context': JSONRenderer().render(app_context).decode("utf-8"),
            'tenant_id': tenant_id,
        }
    )

def logout(request):
    do_logout(request)
    return HttpResponseRedirect(f'/explorer/login')


def login(request):
    if request.method == 'GET':
        return render(
            request,
            'common_page.html',
            context={
                'user': request.user,
                'sub_title': "Login",
                'scripts':[
                    '/static/js-bundle/login.js'
                ],
                'nav_item_role': 'login',
            }
        )
    if request.method == 'POST':
        if request.user.is_authenticated:
            return HttpResponseForbidden()

        username = request.POST['username']
        password = request.POST['password']
        user = do_authenticate(username=username, password=password)
        if user is not None:
            do_login(request, user)
            return HttpResponseRedirect('/explorer/datalakes')
        # must be wrong
        app_context = {
            'msg': "Wrong username or password!"
        }

        return render(
            request,
            'common_page.html',
            context={
                'user': request.user,
                'sub_title': "Login",
                'scripts':[
                    '/static/js-bundle/login.js'
                ],
                'nav_item_role': 'login',
                'app_context': JSONRenderer().render(app_context).decode("utf-8"),
            },

        )


def signup(request):
    if request.method == 'GET':
        return render(
            request,
            'common_page.html',
            context={
                'user': request.user,
                'sub_title': "Signup",
                'scripts':[
                    '/static/js-bundle/signup.js'
                ],
                'nav_item_role': 'signup',
            }
        )

    if request.method == 'POST':
        if request.user.is_authenticated:
            return HttpResponseForbidden()

        username    = request.POST.get('username', '').strip()
        password    = request.POST.get('password', '').strip()
        password1   = request.POST.get('password1', '').strip()
        first_name  = request.POST.get('first_name', '').strip()
        last_name   = request.POST.get('last_name', '').strip()
        email       = request.POST.get('email', '').strip()

        result = do_signup_user(username, password, password1, first_name, last_name, email)
        if result.get('send_email'):
            send_signup_validate_email(result['user'], result['token'])

        app_context = {
            'success': result['success'],
            'msg': result['msg']
        }
        return render(
            request,
            'common_page.html',
            context={
                'user': request.user,
                'sub_title': "Signup",
                'scripts':[
                    '/static/js-bundle/signup.js'
                ],
                'nav_item_role': 'signup',
                'app_context': JSONRenderer().render(app_context).decode("utf-8"),
            }
        )


def signup_validate(request):
    if request.method != 'GET':
        # only work for GET
        return HttpResponseForbidden()

    username    = request.GET.get('username', '').strip()
    token       = request.GET.get('token', '').strip()

    users = User.objects.filter(username=username)
    if len(users) == 0:
        return HttpResponseForbidden()

    user = users[0]
    if not AccessToken.authenticate(
        user, token, AccessToken.Purpose.SIGNUP_VALIDATE
    ):
        return HttpResponseForbidden()

    if user.is_active:
        # already activated
        return HttpResponseForbidden()

    user.is_active = True
    user.save()
    if request.user.is_authenticated:
        do_logout(request)
    do_login(request, user)
    return HttpResponseRedirect('/explorer/datalakes')


def pipelines(request, tenant_id):
    if not request.user.is_authenticated:
        return redirect(reverse('login'))

    applications = Application.objects.filter(retired=False, sys_app_id__isnull=True, tenant__id=tenant_id)

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
            'app_context': JSONRenderer().render(app_context).decode("utf-8"),
            'tenant_id': tenant_id,
        }
    )

# Input a pipeline
# return a SVG based on task dependency
def get_task_dep_svg(pipeline):
    context = json.loads(pipeline.context)

    g = Digraph('G', format='svg')
    for task in context['tasks']:
        g.attr('node', URL=f"#task-{task['name']}")
        g.node(task['name'], task['name'])

    for dep in context['dependencies']:
        g.edge(dep['dst'], dep['src'])

    r = g.pipe().decode("utf-8")
    return r


def pipeline(request, tenant_id):
    if not request.user.is_authenticated:
        return redirect(reverse('login'))

    pipeline_id = request.GET['id']

    pipeline = Pipeline.objects.get(pk=pipeline_id)
    s = PipelineSerializer(pipeline, context={"request": request})

    # Get all application referenced in this pipeline and retrun those application
    # as well
    application_ids = []
    ctx = json.loads(pipeline.context)
    for task in ctx['tasks']:
        if task['type']=='other':
            application_ids.append(task['application_id'])
    applications = Application.objects.filter(id__in=application_ids)
    s_apps = ApplicationSerializer(applications, many=True, context={"request": request})

    active_apps = Application.objects.filter(retired=False, sys_app_id__isnull=True, tenant__id=tenant_id)
    s_active_apps = ApplicationSerializer(active_apps, many=True, context={"request": request})

    app_context = {
        'pipeline': s.data,
        'applications': s_apps.data,
        'active_applications': s_active_apps.data,
        "dag_svg": get_task_dep_svg(pipeline),
    }

    return render(
        request,
        'common_page.html',
        context={
            'user': request.user,
            'sub_title': "Pipeline",
            'scripts':[
                '/static/js-bundle/pipeline.js'
            ],
            'nav_item_role': 'pipelines',
            'app_config': get_app_config(),
            'app_context': JSONRenderer().render(app_context).decode("utf-8"),
            'tenant_id': tenant_id,
        }
    )

def pipeline_groups(request, tenant_id):
    if not request.user.is_authenticated:
        return redirect(reverse('login'))

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
            'app_config': get_app_config(),
            'tenant_id': tenant_id,
        }
    )

def pipeline_group(request, tenant_id):
    if not request.user.is_authenticated:
        return redirect(reverse('login'))

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
            'app_context': JSONRenderer().render(app_context).decode("utf-8"),
            'tenant_id': tenant_id,
        }
    )


def applications(request, tenant_id):
    if not request.user.is_authenticated:
        return redirect(reverse('login'))

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
            'app_config': get_app_config(),
            'tenant_id': tenant_id,
        }
    )


def dataset_instance(request, tenant_id):
    if not request.user.is_authenticated:
        return redirect(reverse('login'))

    dsi_path = request.GET['dsi_path']

    if dsi_path is None:
        return HttpResponseBadRequest()

    execute_sql_app = Application.get_execute_sql_app(request.user)

    dsi_list = Asset.revisions_from_dsi_path(tenant_id, dsi_path)
    ds = dsi_list[0].dataset

    dsi_list_rendered = AssetSerializer(dsi_list, many=True, context={"request": request})
    ds_rendered = DatasetSerializer(ds, context={"request": request})

    app_context = {
        'dsi_list': dsi_list_rendered.data,
        'ds': ds_rendered.data,
        'dsi_path': dsi_path,
        'execute_sql_app_id': str(execute_sql_app.id),
    }

    return render(
        request,
        'common_page.html',
        context={
            'user': request.user,
            'sub_title': "Dataset",
            'scripts':[
                '/static/js-bundle/dataset_instance.js'
            ],
            'nav_item_role': 'Asset',
            'app_config': get_app_config(),
            'app_context': JSONRenderer().render(app_context).decode('utf-8'),
            'tenant_id': tenant_id,
        }
    )

def schedulers(request, tenant_id):
    if not request.user.is_authenticated:
        return redirect(reverse('login'))

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
            'app_config': get_app_config(),
            'tenant_id': tenant_id,
        }
    )

def application(request, tenant_id):
    if not request.user.is_authenticated:
        return redirect(reverse('login'))

    application_id = request.GET['id']

    application = Application.objects.get(pk=application_id)
    s = ApplicationSerializer(application, many=False, context={"request": request})

    app_context = {
        'application': s.data
    }

    return render(
        request,
        'common_page.html',
        context={
            'user': request.user,
            'sub_title': "Application",
            'scripts':[
                '/static/js-bundle/application.js'
            ],
            'nav_item_role': 'applications',
            'app_config': get_app_config(),
            'app_context': JSONRenderer().render(app_context).decode("utf-8"),
            'tenant_id': tenant_id,
        }
    )

def datarepos(request, tenant_id):
    if not request.user.is_authenticated:
        return redirect(reverse('login'))

    return render(
        request,
        'common_page.html',
        context={
            'user': request.user,
            'sub_title': "Data Repositories",
            'scripts':[
                '/static/js-bundle/datarepos.js'
            ],
            'nav_item_role': 'datarepos',
            'app_config': get_app_config(),
            'tenant_id': tenant_id,
        }
    )

def datarepo(request, tenant_id):
    if not request.user.is_authenticated:
        return redirect(reverse('login'))

    try:
        datarepo_id = request.GET['id']
        datarepo = DataRepo.objects.get(pk=datarepo_id)
        s = DataRepoSerializer(datarepo, many=False, context={"request": request})

        app_context = {
            'datarepo': s.data
        }

        return render(
            request,
            'common_page.html',
            context={
                'user': request.user,
                'sub_title': "Data Repositorie",
                'scripts':[
                    '/static/js-bundle/datarepo.js'
                ],
                'nav_item_role': 'datarepos',
                'app_config': get_app_config(),
                'app_context': JSONRenderer().render(app_context).decode("utf-8"),
                'tenant_id': tenant_id,
            }
        )
    except (ObjectDoesNotExist, ValidationError, ):
        return HttpResponseNotFound("Page not found")

def datalakes(request, tenant_id=None):
    if not request.user.is_authenticated:
        return redirect(reverse('login'))

    return render(
        request,
        'common_page.html',
        context={
            'user': request.user,
            'sub_title': "Datalakes",
            'scripts':[
                '/static/js-bundle/datalakes.js'
            ],
            'nav_item_role': 'datalakes',
            'app_config': get_app_config(),
        }
    )

