from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework import serializers
from rest_framework.response import Response
from datetime import datetime
from django.db import transaction
from django.core.exceptions import SuspiciousOperation
import uuid
from django.forms.models import model_to_dict
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from django.http import Http404
from django.conf import settings
import os
from django.http import JsonResponse
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied, APIException

import jinja2
import json

from .models import Dataset, Asset, DataLocation, Pipeline, \
    PipelineGroup, PipelineInstance, Application, Timer, ScheduledEvent, \
    DataRepo, Tenant, UserTenantSubscription, AccessToken, PermissionDeniedException
from .serializers import DatasetSerializer, AssetSerializer, \
    DataLocationSerializer, PipelineSerializer, PipelineGroupSerializer, \
    PipelineInstanceSerializer, ApplicationSerializer, PipelineGroupDetailsSerializer, \
    TimerSerializer, ScheduledEventSerializer, DataRepoSerializer, TenantSerializer, \
    UserTenantSubscriptionSerializer
from .api_input import CreateDatasetInput, CreateAssetInput, \
    CreatePipelineInput, CreateApplicationInput, CreateTimerInput, \
    SetSchemaAndSampleDataInput, CreateTenantInput, CreateDataRepoInput

import explorer.airflow_lib as airflow_lib

from tools.view_tools import get_model_by_pk

def get_offset(request):
    try:
        offset_str = request.GET.get('offset', '0')
        offset = int(offset_str)
        return max(offset, 0)
    except ValueError:
        return 0

# if limit is specified and valid, return it's value
# otherwise, return as if limit is not set
def get_limit(request):
    try:
        limit_str = request.GET.get('limit')
        if limit_str is None:
            return None
        limit = int(limit_str)
        if limit < 0:
            return None
        return limit
    except ValueError:
        return None


def get_model_page_response(request, model_list, serlaizer_class):
    offset = get_offset(request)
    limit = get_limit(request)
    if limit is None:
        page = model_list[offset:]
    else:
        page = model_list[offset:offset+limit]

    serializer = serlaizer_class(page, many=True)
    return Response({
        'count': len(model_list),
        'results': serializer.data
    })


def check_api_permission(request, tenant_id):
    can_access = False

    tenant = None
    user = None
    if request.user.is_authenticated:
        subscriptions = UserTenantSubscription.objects.filter(
            user=request.user,
            tenant__id=tenant_id
        )
        can_access = (len(subscriptions) > 0)
        if can_access:
            assert len(subscriptions)==1
            subscription = subscriptions[0]
            tenant = subscription.tenant
            user = request.user
    else:
        if request.method in ["GET", "DELETE"]:
            dm_username = request.GET.get('dm_username', None)
            dm_token    = request.GET.get('dm_token', None)
        elif request.method in ["POST", "PATCH"]:
            dm_username = request.data.get('dm_username', None)
            dm_token    = request.data.get('dm_token', None)

        if dm_username is None or dm_token is None:
            dm_token = None
            dm_username = None

        if dm_username is not None:
            subscriptions = UserTenantSubscription.objects.filter(
                user__username=dm_username,
                tenant__id=tenant_id
            )
            if len(subscriptions) > 0:
                subscription = subscriptions[0]
                assert len(subscriptions)==1
                can_access = AccessToken.authenticate(
                    subscription.user, dm_token,
                    AccessToken.Purpose.API_TOKEN,
                    tenant=subscription.tenant
                )
                if can_access:
                    tenant = subscription.tenant
                    user = subscription.user

    if not can_access:
        raise PermissionDenied({"message": f"You are not subscribed to this datalake: {tenant_id}"})

    return user, tenant


class APIBaseView(viewsets.ModelViewSet):
    # override a method from ListModeMixin
    def list(self, request, tenant_id_str=None, *args, **kwargs):
        tenant_id = int(tenant_id_str)
        check_api_permission(request, tenant_id)
        return super(APIBaseView, self).list(request, *args, **kwargs)


    # override a method from RetrieveModelMixin
    def retrieve(self, request, tenant_id_str=None, *args, **kwargs):
        tenant_id = int(tenant_id_str)
        check_api_permission(request, tenant_id)
        instance = self.get_object()
        if instance.tenant_id != tenant_id:
            # user asks to get an object which does not belong to the
            # tenant user claimed to be
            # It is proper to tell user the object does not exist
            raise Http404
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


    # override a method from DestroyModelMixin
    def destroy(self, request, tenant_id_str=None, *args, **kwargs):
        tenant_id = int(tenant_id_str)
        check_api_permission(request, tenant_id)
        return super(APIBaseView, self).destroy(request, *args, **kwargs)

    # override a method from UpdateModelMixin
    def update(self, request, tenant_id_str=None, *args, **kwargs):
        tenant_id = int(tenant_id_str)
        check_api_permission(request, tenant_id)

        # User cannot change tenant_id
        if 'tenant_id' in request.data:
            raise PermissionDenied({"message":"Change tenant is not allowed"})

        return super(APIBaseView, self).update(request, *args, **kwargs)

    # override a method from CreateModelMixin
    def create(self, request, tenant_id_str=None, *args, **kwargs):
        tenant_id = int(tenant_id_str)
        check_api_permission(request, tenant_id)
        return super(APIBaseView, self).create(request, *args, **kwargs)



class DatasetViewSet(APIBaseView):
    permission_classes = []

    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = {
        'tenant_id'         : ['exact'],
        'name'              : ['exact'],
        'major_version'     : ['exact'],
        'minor_version'     : ['exact'],
        'expiration_time'   : ['isnull', 'exact']
    }
    ordering_fields = ['name', 'major_version', 'minor_version', 'publish_time']


    @transaction.atomic
    def create(self, request, tenant_id_str=None):
        """
        Create a dataset
        Deleted dataset instance is ignored.
        """

        # TODO: Need to make sure minor version is the largest for
        #       the same dataset name and major version
        tenant_id = int(tenant_id_str)
        user, tenant = check_api_permission(request, tenant_id)

        data = request.data
        create_dataset_input = CreateDatasetInput.from_json(data, tenant_id)

        ds = tenant.create_dataset(
            create_dataset_input.name,
            create_dataset_input.major_version, create_dataset_input.minor_version,
            create_dataset_input.publish_time,
            create_dataset_input.description,
            user,
            create_dataset_input.team
        )
        response = DatasetSerializer(instance=ds).data
        return Response(response)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def set_schema_and_sample_data(self, request, pk=None, tenant_id_str=None):
        """
        Update schema and/or sample data
        """
        tenant_id = int(tenant_id_str)
        check_api_permission(request, tenant_id)
        ds = get_model_by_pk(Dataset, pk, tenant_id)
        data = request.data
        ssasd_input = SetSchemaAndSampleDataInput.from_json(data, tenant_id)
        ds.set_schema_and_sample_data(
            request.user,
            ssasd_input.schema,
            ssasd_input.sample_data
        )
        response = DatasetSerializer(instance=ds).data
        return Response(response)

    @transaction.atomic
    def create_asset(self, request, tenant_id_str=None):
        """
        Create a dataset
        Deleted dataset instance is ignored.
        """

        # TODO: Need to make sure minor version is the largest for
        #       the same dataset name and major version
        tenant_id = int(tenant_id_str)
        user, tenant = check_api_permission(request, tenant_id)

        data = request.data
        cdii = CreateAssetInput.from_json(data, tenant_id)

        asset = cdii.dataset.create_asset(
            cdii.name,
            cdii.row_count,
            cdii.publish_time,
            cdii.data_time,
            cdii.locations,
            loader = cdii.loader,
            src_dsi_paths = cdii.src_dsi_paths,
            application = cdii.application,
            application_args = cdii.application_args,
        )

        response = AssetSerializer(instance=asset).data
        return Response(response)

class AssetViewSet(APIBaseView):
    permission_classes = []

    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = {
        'tenant_id'         : ['exact'],
        'dataset'           : ['exact'],
        'name'              : ['exact'],
        'revision'          : ['exact'],
    }


    @transaction.atomic
    def destroy(self, request, pk=None, tenant_id_str=None):
        try:
            tenant_id = int(tenant_id_str)
            user, tenant = check_api_permission(request, tenant_id)
            this_instance = get_model_by_pk(Asset, pk, tenant_id)
            this_instance.soft_delete()

            response = AssetSerializer(instance=this_instance, context={'request': request}).data
            return Response(response)
        except PermissionDeniedException as e:
            raise PermissionDenied({"message": e.message})


class DataLocationViewSet(viewsets.ModelViewSet):
    queryset = DataLocation.objects.all()
    serializer_class = DataLocationSerializer


class PipelineViewSet(APIBaseView):
    permission_classes = []

    queryset = Pipeline.objects.all()
    serializer_class = PipelineSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'retired'           : ['exact'],
        'tenant_id'         : ['exact'],
    }

    @transaction.atomic
    def create(self, request, tenant_id_str=None):
        """
        Create a pipeline
        """
        tenant_id = int(tenant_id_str)
        user, tenant = check_api_permission(request, tenant_id)

        data = request.data
        create_pipeline_input = CreatePipelineInput.from_json(data)

        pipeline = tenant.create_pipeline(
            request.user,
            create_pipeline_input.name,
            create_pipeline_input.description,
            create_pipeline_input.team,
            create_pipeline_input.category,
            create_pipeline_input.context,
        )
        response = PipelineSerializer(
            instance=pipeline,
            context={'request': request}
        ).data
        return Response(response)


    @transaction.atomic
    def update(self, request, *args, **kwargs):
        # TODO: do not delete the dag cache if we are just pause the dag
        pk = kwargs.get('pk', None)

        ret = super(PipelineViewSet, self).update(request, *args, **kwargs)

        if pk is not None:
            pipeline = Pipeline.objects.get(pk=uuid.UUID(pk))
            tenant_id = pipeline.tenant_id
            pipeline_id = pipeline.id
            if not airflow_lib.has_dag_py_file(tenant_id, pipeline_id):
                self.do_create_dag(pipeline)
            else:
                airflow_lib.delete_dag_info(tenant_id, pipeline_id)

        return ret


    @transaction.atomic
    @action(detail=False, methods=['get'])
    def active(self, request, pk=None):
        """
        Return all pipelines that is active
        """
        pipelines = Pipeline.get_active_pipelines(request.user)
        response = PipelineSerializer(
            pipelines,
            many=True,
            context={'request': request}
        ).data
        return Response(response)

    def do_create_dag(self, pipeline):
        context = json.loads(pipeline.context)
        template_name = None

        tenant_id = pipeline.tenant.id
        pipeline_id = pipeline.id

        if context['type'] == 'simple-flow':
            template_name = 'simple-flow'
        if template_name is not None:
            template_file = os.path.join(
                settings.BASE_DIR,
                "dag-templates",
                f"{template_name}.py"
            )
            with open(template_file, "rt") as f:
                content = f.read()
            template = jinja2.Template(content)
            to_write = template.render({
                'tenant_id': tenant_id,
                'pipeline_id': str(pipeline_id).replace("-", ""),
                'dag_id': pipeline.name,
            })
            airflow_lib.delete_dag_info(tenant_id, pipeline_id)
            airflow_lib.create_dag_py(tenant_id, pipeline_id, to_write)


    # Create the airflow DAG
    @action(detail=True, methods=['post'])
    def create_dag(self, request, tenant_id_str=None, pk=None):
        tenant_id = int(tenant_id_str)
        user, tenant = check_api_permission(request, tenant_id)
        pipeline = get_model_by_pk(Pipeline, pk, tenant_id)
        self.do_create_dag(pipeline)
        return Response({})

class PipelineGroupViewSet(viewsets.ModelViewSet):
    queryset = PipelineGroup.objects.all()
    serializer_class = PipelineGroupSerializer

    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = {
        'tenant_id'         : ['exact'],
    }
    ordering_fields = ['created_time']

    @action(detail=True, methods=['post'])
    def attach(self, request, pk=None):
        pg = PipelineGroup.objects.get(pk=pk)
        pipeline_ids = request.data['pipeline_ids']
        pg.attach(pipeline_ids)
        return Response({})

    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        pg = PipelineGroup.objects.get(pk=pk)
        response = PipelineGroupDetailsSerializer(pg, context={"request": request}).data
        return Response(response)


class PipelineInstanceViewSet(viewsets.ModelViewSet):
    queryset = PipelineInstance.objects.all()
    serializer_class = PipelineInstanceSerializer

    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['group']
    ordering_fields = ['created_time']


class ApplicationViewSet(APIBaseView):
    permission_classes = []

    queryset = Application.objects.all()
    serializer_class = ApplicationSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = {
        'tenant_id'         : ['exact'],
        'name'              : ['exact'],
        'sys_app_id'        : ['isnull', 'exact']
    }
    ordering_fields = ['name']

    @transaction.atomic
    def create(self, request, tenant_id_str=None):
        """
        Create an Application
        """
        tenant_id = int(tenant_id_str)
        user, tenant = check_api_permission(request, tenant_id)

        data = request.data
        create_application_input = CreateApplicationInput.from_json(data)

        app = tenant.create_application(
            user,
            create_application_input.name,
            create_application_input.description,
            create_application_input.team,
            create_application_input.app_location
        )
        response = ApplicationSerializer(instance=app, context={'request': request}).data
        return Response(response)

class TimerViewSet(APIBaseView):
    permission_classes = []

    queryset = Timer.objects.all()
    serializer_class = TimerSerializer

    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = {
        'tenant_id'         : ['exact'],
        'topic'             : ['exact'],
    }
    ordering_fields = ['name']

    @transaction.atomic
    def create(self, request, tenant_id_str=None):
        """
        Create a Timer
        """
        tenant_id = int(tenant_id_str)
        user, tenant = check_api_permission(request, tenant_id)

        data = request.data
        create_timer_input = CreateTimerInput.from_json(data)

        timer = tenant.create_timer(
            request.user,
            create_timer_input.name,
            create_timer_input.description,
            create_timer_input.team,
            create_timer_input.paused,
            create_timer_input.interval_unit,
            create_timer_input.interval_amount,
            create_timer_input.start_from,
            create_timer_input.topic,
            create_timer_input.context,
            category = create_timer_input.category,
            end_at   = create_timer_input.end_at
        )
        response = TimerSerializer(instance=timer, context={'request': request}).data
        return Response(response)

class ScheduledEventViewSet(viewsets.ModelViewSet):
    queryset = ScheduledEvent.objects.all()
    serializer_class = ScheduledEventSerializer

    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['acked']
    ordering_fields = ['due']

class DataRepoViewSet(APIBaseView):
    permission_classes = []

    queryset = DataRepo.objects.all()
    serializer_class = DataRepoSerializer

    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'tenant_id'         : ['exact'],
        'name'              : ['exact'],
    }

    @transaction.atomic
    def create(self, request, tenant_id_str=None):
        """
        Create a DataRepo
        """
        tenant_id = int(tenant_id_str)
        user, tenant = check_api_permission(request, tenant_id)

        data = request.data
        create_datarepo_input = CreateDataRepoInput.from_json(data, tenant_id)

        data_repo = tenant.create_data_repo(
            create_datarepo_input.name,
            create_datarepo_input.description,
            create_datarepo_input.type,
            create_datarepo_input.context
        )
        response = DataRepoSerializer(instance=data_repo, context={'request': request}).data
        return Response(response)


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer

    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'name'              : ['exact'],
    }

    @transaction.atomic
    def create(self, request):
        """
        Create a Tenant
        """

        data = request.data
        create_tenant_input = CreateTenantInput.from_json(data)

        tenant = Tenant.create(
            request.user,
            create_tenant_input.name,
            create_tenant_input.description,
            create_tenant_input.config,
            create_tenant_input.is_public
        )
        response = TenantSerializer(instance=tenant, context={'request': request}).data
        return Response(response)



class UserTenantSubscriptionViewSet(viewsets.ModelViewSet):
    queryset = UserTenantSubscription.objects.all()
    serializer_class = UserTenantSubscriptionSerializer

    @transaction.atomic
    def list(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        queryset = queryset.filter(user=request.user)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)