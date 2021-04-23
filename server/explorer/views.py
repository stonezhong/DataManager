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
from django.http import HttpResponse, HttpResponseForbidden, Http404
from django.contrib.auth.models import User

from django.core.exceptions import ObjectDoesNotExist, ValidationError, SuspiciousOperation

from main.models import Dataset, Pipeline, PipelineGroup, PipelineInstance, \
    Application, Asset, DataRepo, Tenant, UserTenantSubscription, \
    AccessToken
from main.serializers import PipelineSerializer, DatasetSerializer, \
    ApplicationSerializer, PipelineGroupDetailsSerializer, \
    AssetSerializer, DataRepoSerializer, UserTenantSubscriptionSerializer

from rest_framework.renderers import JSONRenderer

from django.conf import settings
import explorer.airflow_lib as airflow_lib

import jinja2
from graphviz import Digraph

from tools.email_tools import send_signup_validate_email
from tools.view_tools import get_model_by_pk, tenant_access_check_for_ui

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
    tenant_access_check_for_ui(request, tenant_id)

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
    tenant_access_check_for_ui(request, tenant_id)

    dataset_id = request.GET['id']

    dataset = get_model_by_pk(Dataset, dataset_id, tenant_id)
    s = DatasetSerializer(dataset)

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
    return HttpResponseRedirect(reverse('login'))


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
            return HttpResponseRedirect(reverse('datalakes'))
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
    tenant_access_check_for_ui(request, tenant_id)

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
    tenant_access_check_for_ui(request, tenant_id)

    pipeline_id = request.GET['id']

    pipeline = get_model_by_pk(Pipeline, pipeline_id, tenant_id)
    s = PipelineSerializer(pipeline, context={"request": request})

    # Get all application referenced in this pipeline and retrun those application
    # as well
    application_ids = []
    ctx = json.loads(pipeline.context)
    for task in ctx['tasks']:
        if task['type']=='other':
            application_ids.append(task['application_id'])
    applications = Application.objects.filter(id__in=application_ids)
    s_apps = ApplicationSerializer(applications, many=True)

    active_apps = Application.objects.filter(retired=False, sys_app_id__isnull=True, tenant__id=tenant_id)
    s_active_apps = ApplicationSerializer(active_apps, many=True)

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
    tenant_access_check_for_ui(request, tenant_id)

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
    tenant_access_check_for_ui(request, tenant_id)

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
    tenant_access_check_for_ui(request, tenant_id)

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


def asset(request, tenant_id):
    if not request.user.is_authenticated:
        return redirect(reverse('login'))
    tenant = tenant_access_check_for_ui(request, tenant_id)

    asset_path = request.GET.get('asset_path')

    if asset_path is None:
        raise SuspiciousOperation("asset_path is missing")

    execute_sql_app = tenant.get_application_by_sys_app_id(Application.SysAppID.EXECUTE_SQL)

    assets = tenant.get_asset_revisions_from_path(asset_path)
    dataset = assets[0].dataset

    assets_rendered = AssetSerializer(assets, many=True)
    dataset_rendered = DatasetSerializer(dataset)

    app_context = {
        'assets'        : assets_rendered.data,
        'dataset'       : dataset_rendered.data,
        'asset_path'    : asset_path,
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
    tenant_access_check_for_ui(request, tenant_id)

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
    tenant_access_check_for_ui(request, tenant_id)

    application_id = request.GET['id']

    application = get_model_by_pk(Application, application_id, tenant_id)
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
    tenant_access_check_for_ui(request, tenant_id)

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
    tenant_access_check_for_ui(request, tenant_id)

    try:
        datarepo_id = request.GET['id']
        datarepo = get_model_by_pk(DataRepo, datarepo_id, tenant_id)
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


def do_signup_user(username, password, password1, first_name, last_name, email):
    msg = None
    while True:
        if len(username)==0:
            msg = "Username cannot be empty"
            break
        if len(password)==0:
            msg = "Password cannot be empty"
            break
        if len(password1)==0:
            msg = "Password cannot be empty"
            break
        if len(first_name)==0:
            msg = "First name cannot be empty"
            break
        if len(last_name)==0:
            msg = "Last name cannot be empty"
            break
        if len(email)==0:
            msg = "Email name cannot be empty"
            break
        if password != password1:
            msg = "Password does not match"
            break
        break
    if msg is not None:
        return {
            "success": False,
            "msg": msg
        }

    users = User.objects.filter(username=username)
    found_user = None
    assert len(users) == 1
    if len(users) == 1:
        found_user = users[0]
    if found_user is not None:
        if found_user.is_active:
            return {
                "success": False,
                "msg": "Invalid username or email!"
            }
        if found_user.email != email:
            return {
                "success": False,
                "msg": "Invalid username or email!"
            }

        token = AccessToken.create_token(
            found_user, timedelta(days=1), AccessToken.Purpose.SIGNUP_VALIDATE,
        )

        return {
            "success": True,
            "msg": f"An account validation email has been sent to {email}, please click the link in the email to validate your account",
            "send_email": True,
            "token": token,
            "user": found_user
        }

    users = User.objects.filter(email=email)
    if len(users) > 0:
        return {
            "success": False,
            "msg": "Use a different email!"
        }


    user = User.objects.create_user(
        username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        is_active=False
    )
    user.save()

    token = AccessToken.create_token(
        user, timedelta(days=1), AccessToken.Purpose.SIGNUP_VALIDATE,
    )

    return {
        "success": True,
        "msg": f"An account validation email has been sent to {email}, please click the link in the email to validate your account",
        "send_email": True,
        "token": token,
        "user": user
    }

