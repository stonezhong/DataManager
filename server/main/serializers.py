from rest_framework import serializers
from django.contrib.auth.models import User

from .models import Dataset, DatasetInstance, DataLocation, Pipeline, \
    PipelineGroup, PipelineInstance, Application, Timer, ScheduledEvent, \
    DatasetInstanceDep, DataRepo

class ApplicationSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source='author.username')

    class Meta:
        model = Application
        fields = [
            'url',
            'id', 'name', 'description', 'author', 'team',
            'retired', 'app_location', 'sys_app_id'
        ]

class NestDatasetInstanceDepSerializer(serializers.ModelSerializer):
    src_dsi_path = serializers.ReadOnlyField(source='src_dsi.dsi_path')
    dst_dsi_path = serializers.ReadOnlyField(source='dst_dsi.dsi_path')

    class Meta:
        model = DatasetInstanceDep
        fields = [
            'src_dsi_path',
            'dst_dsi_path',
        ]

class DatasetSerializer(serializers.ModelSerializer):
    publish_time = serializers.DateTimeField(
        allow_null=False,
        format='%Y-%m-%d %H:%M:%S',
        input_formats=['%Y-%m-%d %H:%M:%S']
    )
    expiration_time = serializers.DateTimeField(
        allow_null=True,
        format='%Y-%m-%d %H:%M:%S',
        input_formats=['%Y-%m-%d %H:%M:%S']
    )

    author = serializers.ReadOnlyField(source='author.username')

    class Meta:
        model = Dataset
        fields = [
            'url',
            'id', 'name', 'major_version', 'minor_version',
            'publish_time', 'expiration_time', 'description',
            'author', 'team', 'schema', 'sample_data'
        ]

class DataRepoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataRepo
        fields = [
            'url',
            'id', 'name', 'description', 'type', 'context'
        ]

class DataLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataLocation
        fields = [
            'url',
            'id', 'dataset_instance', 'type', 'repo', 'location', 'size', 'offset'
        ]

class NestDataLocationSerializer(serializers.ModelSerializer):
    repo = DataRepoSerializer(
        many=False,
        read_only=True
    )

    class Meta:
        model = DataLocation
        fields = [
            'repo', 'location', 'type', 'size', 'offset'
        ]

class DatasetInstanceSerializer(serializers.ModelSerializer):
    publish_time = serializers.DateTimeField(
        format='%Y-%m-%d %H:%M:%S',
        input_formats=['%Y-%m-%d %H:%M:%S']
    )
    deleted_time = serializers.DateTimeField(
        allow_null=True,
        format='%Y-%m-%d %H:%M:%S',
        input_formats=['%Y-%m-%d %H:%M:%S']
    )
    data_time = serializers.DateTimeField(
        allow_null=True,
        format='%Y-%m-%d %H:%M:%S',
        input_formats=['%Y-%m-%d %H:%M:%S']
    )
    locations = NestDataLocationSerializer(
        many=True,
        read_only=False
    )
    application = ApplicationSerializer(many=False, read_only=True)

    class Meta:
        model = DatasetInstance
        fields = [
            'url',
            'id', 'dataset', 'parent_instance', 'name', 'path',
            'publish_time', 'deleted_time', 'data_time', 'revision', 'row_count', 'loader',
            'locations', 'src_dataset_instances', 'dst_dataset_instances',
            'application', 'application_args'
        ]


class PipelineSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source='author.username')

    class Meta:
        model = Pipeline
        fields = [
            'url',
            'id', 'name', 'description', 'author', 'team', 'retired',
            'category', 'context', 'paused', 'version', 'dag_version'
        ]

# class NestedPipelineSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Pipeline
#         fields = [
#             'id', 'name',
#         ]

class PipelineInstanceSerializer(serializers.ModelSerializer):
    created_time = serializers.DateTimeField(
        allow_null=False,
        format='%Y-%m-%d %H:%M:%S',
        input_formats=['%Y-%m-%d %H:%M:%S']
    )

    class Meta:
        model = PipelineInstance
        fields = [
            'url',
            'id', 'pipeline', 'group', 'context', 'status',
            'created_time', 'started_time', 'finished_time', 'failed_time',
        ]

class PipelineInstanceDetailsSerializer(serializers.ModelSerializer):
    created_time = serializers.DateTimeField(
        allow_null=False,
        format='%Y-%m-%d %H:%M:%S',
        input_formats=['%Y-%m-%d %H:%M:%S']
    )
    pipeline = PipelineSerializer(many=False, read_only=True)

    class Meta:
        model = PipelineInstance
        fields = [
            'url',
            'id', 'pipeline', 'group', 'context', 'status',
            'created_time', 'started_time', 'finished_time', 'failed_time',
        ]

class PipelineGroupSerializer(serializers.ModelSerializer):
    created_time = serializers.DateTimeField(
        allow_null=False,
        format='%Y-%m-%d %H:%M:%S',
        input_formats=['%Y-%m-%d %H:%M:%S']
    )

    class Meta:
        model = PipelineGroup
        fields = [
            'url',
            'id', 'name', 'created_time', 'category', 'context', 'finished', 'manual',
        ]

class PipelineGroupDetailsSerializer(serializers.ModelSerializer):
    created_time = serializers.DateTimeField(
        allow_null=False,
        format='%Y-%m-%d %H:%M:%S',
        input_formats=['%Y-%m-%d %H:%M:%S']
    )
    pis = PipelineInstanceDetailsSerializer(many=True, read_only=True)

    class Meta:
        model = PipelineGroup
        fields = [
            'url',
            'id', 'name', 'created_time', 'category', 'context', 'finished', 'manual',
            'pis'
        ]

class TimerSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source='author.username')
    start_from = serializers.DateTimeField(
        allow_null=False,
        read_only=True,
        format='%Y-%m-%d %H:%M:%S',
        input_formats=['%Y-%m-%d %H:%M:%S']
    )
    last_due = serializers.DateTimeField(
        allow_null=False,
        read_only=True,
        format='%Y-%m-%d %H:%M:%S',
        input_formats=['%Y-%m-%d %H:%M:%S']
    )

    class Meta:
        model = Timer
        fields = [
            'url',
            'id', 'name', 'description', 'author', 'team',
            'paused',
            'interval_unit', 'interval_amount',
            'start_from', 'end_at', 'last_due',
            'topic', 'context', 'category'
        ]

class ScheduledEventSerializer(serializers.ModelSerializer):
    # due should be read-only field, otherwise it is dangerous
    due = serializers.DateTimeField(
        allow_null=False,
        read_only=True,
        format='%Y-%m-%d %H:%M:%S',
        input_formats=['%Y-%m-%d %H:%M:%S']
    )
    timer = TimerSerializer(many=False, read_only=True)

    class Meta:
        model = ScheduledEvent
        fields = [
            'url',
            'id', 'timer', 'due', 'acked', 'topic', 'context', 'category'
        ]
