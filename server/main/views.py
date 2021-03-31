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

import jinja2
import json

from .models import Dataset, DatasetInstance, DataLocation, Pipeline, \
    PipelineGroup, PipelineInstance, Application, Timer, ScheduledEvent, \
    DataRepo, Tenant, UserTenantSubscription
from .serializers import DatasetSerializer, DatasetInstanceSerializer, \
    DataLocationSerializer, PipelineSerializer, PipelineGroupSerializer, \
    PipelineInstanceSerializer, ApplicationSerializer, PipelineGroupDetailsSerializer, \
    TimerSerializer, ScheduledEventSerializer, DataRepoSerializer, TenantSerializer, \
    UserTenantSubscriptionSerializer
from .api_input import CreateDatasetInput, CreateDatasetInstanceInput, \
    CreatePipelineInput, CreateApplicationInput, CreateTimerInput, \
    SetSchemaAndSampleDataInput, CreateTenantInput, CreateDataRepoInput

import explorer.airflow_lib as airflow_lib

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
        if limit <= 0:
            return None
        return limit
    except ValueError:
        return None

class DatasetViewSet(viewsets.ModelViewSet):
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

    @action(detail=True, methods=['get'])
    def children(self, request, pk=None):
        """
        Return all direct child dataset instances
        Deleted dataset instance is ignored.
        """
        offset = get_offset(request)
        limit  = get_limit(request)
        dataset = Dataset.objects.get(pk=pk)
        dataset_instances = dataset.get_children(request.user)
        if limit is None:
            dataset_instances_page = dataset_instances[offset:]
        else:
            dataset_instances_page = dataset_instances[offset:offset+limit]
        serializer = DatasetInstanceSerializer(
            dataset_instances_page, many=True,
            context={'request': request}
        )
        # return JsonResponse({'count': len(dataset_instances), 'results': serializer.data})
        return Response({
            'count': len(dataset_instances),
            'results': serializer.data
        })

    @action(detail=True, methods=['get'])
    def child(self, request, pk=None):
        """
        Return direct child dataset instance that match the name
        Deleted dataset instance is ignored.
        """
        dataset = Dataset.objects.get(pk=pk)
        instance_name = request.GET['name']
        dataset_instance = dataset.get_child(request.user, instance_name)
        if dataset_instance is None:
            raise Http404

        serializer = DatasetInstanceSerializer(
            dataset_instance, many=False,
            context={'request': request}
        )
        return Response(serializer.data)

    @transaction.atomic
    def create(self, request):
        """
        Create a dataset
        Deleted dataset instance is ignored.
        """

        # TODO: Need to make sure minor version is the largest for
        #       the same dataset name and major version

        data = request.data
        create_dataset_input = CreateDatasetInput.from_json(data)

        ds = Dataset.create(
            request.user,
            create_dataset_input.tenant_id,
            create_dataset_input.name,
            create_dataset_input.major_version, create_dataset_input.minor_version,
            create_dataset_input.publish_time,
            create_dataset_input.description,
            create_dataset_input.team
        )
        response = DatasetSerializer(instance=ds, context={'request': request}).data
        return Response(response)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def set_schema_and_sample_data(self, request, pk=None):
        """
        Update schema and/or sample data
        """
        ds = Dataset.objects.get(pk=pk)
        data = request.data
        ssasd_input = SetSchemaAndSampleDataInput.from_json(data)
        ds.set_schema_and_sample_data(
            request.user,
            ssasd_input.schema,
            ssasd_input.sample_data
        )
        response = DatasetSerializer(instance=ds, context={'request': request}).data
        return Response(response)


class DatasetInstanceViewSet(viewsets.ModelViewSet):
    queryset = DatasetInstance.objects.all()
    serializer_class = DatasetInstanceSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['dataset', 'path', 'name', 'revision']

    @action(detail=True, methods=['get'])
    def children(self, request, pk=None):
        """
        Return all direct child dataset instances
        Deleted dataset instance is ignored.
        """
        this_instance = DatasetInstance.objects.get(pk=pk)
        dataset_instances = this_instance.get_children(request.user)
        serializer = self.get_serializer(
            dataset_instances, many=True,
            context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def child(self, request, pk=None):
        """
        Return direct child dataset instance that match the name
        Deleted dataset instance is ignored.
        """
        instance_name = request.GET['name']
        this_instance = DatasetInstance.objects.get(pk=pk)
        dataset_instance = this_instance.get_child(request.user, instance_name)
        if dataset_instance is None:
            raise Http404

        serializer = self.get_serializer(
            dataset_instance, many=False,
            context={'request': request}
        )
        return Response(serializer.data)

    @transaction.atomic
    def create(self, request):
        """
        Create a dataset instance
        """
        data = request.data
        # cdii stands for create_dataset_instance_input
        cdii = CreateDatasetInstanceInput.from_json(data)

        di = DatasetInstance.create(
            request.user,
            cdii.dataset,
            cdii.parent_instance,
            cdii.name,
            cdii.row_count,
            cdii.publish_time,
            cdii.data_time,
            cdii.locations,
            loader = cdii.loader,
            src_dsi_paths = cdii.src_dsi_paths,
            application_id = cdii.application_id,
            application_args = cdii.application_args,
        )

        response = DatasetInstanceSerializer(instance=di, context={'request': request}).data
        return Response(response)

    @transaction.atomic
    def destroy(self, request, pk=None):
        this_instance = DatasetInstance.objects.get(pk=pk)
        this_instance.soft_delete(request.user)

        response = DatasetInstanceSerializer(instance=this_instance, context={'request': request}).data
        return Response(response)


class DataLocationViewSet(viewsets.ModelViewSet):
    queryset = DataLocation.objects.all()
    serializer_class = DataLocationSerializer


class PipelineViewSet(viewsets.ModelViewSet):
    queryset = Pipeline.objects.all()
    serializer_class = PipelineSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'retired'           : ['exact'],
        'tenant_id'         : ['exact'],
    }

    @transaction.atomic
    def create(self, request):
        """
        Create a pipeline
        """

        data = request.data
        create_pipeline_input = CreatePipelineInput.from_json(data)

        pipeline = Pipeline.create(
            request.user,
            create_pipeline_input.tenant_id,
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


    # Create the airflow DAG
    @action(detail=True, methods=['post'])
    def create_dag(self, request, pk=None):
        pipeline = Pipeline.objects.get(pk=pk)
        context = json.loads(pipeline.context)
        template_name = None

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
                'pipeline_id': str(pipeline.id).replace("-", ""),
                'dag_id': pipeline.name,
            })
            airflow_lib.create_dag(f"{pipeline.id}.py", pipeline.name, to_write)
        # response = PipelineSerializer(
        #     instance=pipeline,
        #     context={'request': request}
        # ).data
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

class ApplicationViewSet(viewsets.ModelViewSet):
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
    def create(self, request):
        """
        Create an Application
        """

        data = request.data
        create_application_input = CreateApplicationInput.from_json(data)

        app = Application.create(
            request.user,
            create_application_input.tenant_id,
            create_application_input.name,
            create_application_input.description,
            create_application_input.team,
            create_application_input.app_location
        )
        response = ApplicationSerializer(instance=app, context={'request': request}).data
        return Response(response)

class TimerViewSet(viewsets.ModelViewSet):
    queryset = Timer.objects.all()
    serializer_class = TimerSerializer

    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = {
        'tenant_id'         : ['exact'],
        'topic'             : ['exact'],
    }
    ordering_fields = ['name']

    @transaction.atomic
    def create(self, request):
        """
        Create a Timer
        """

        data = request.data
        create_timer_input = CreateTimerInput.from_json(data)

        timer = Timer.create(
            request.user,
            create_timer_input.tenant_id,
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

class DataRepoViewSet(viewsets.ModelViewSet):
    queryset = DataRepo.objects.all()
    serializer_class = DataRepoSerializer

    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'tenant_id'         : ['exact'],
        'name'              : ['exact'],
    }

    @transaction.atomic
    def create(self, request):
        """
        Create a DataRepo
        """

        data = request.data
        create_datarepo_input = CreateDataRepoInput.from_json(data)

        data_repo = DataRepo.create(
            request.user,
            create_datarepo_input.tenant_id,
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
        # non-superuser only can query
        # (1) all users for tenant owned by the requester
        # (2) all tenants requester subscribed
        queryset = self.filter_queryset(self.get_queryset())
        if not request.user.is_superuser:
            queryset = queryset.filter(user=request.user)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)