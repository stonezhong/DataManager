# Generated by Django 3.0.4 on 2020-12-05 04:58

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Dataset',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('major_version', models.CharField(max_length=10)),
                ('minor_version', models.IntegerField()),
                ('publish_time', models.DateTimeField()),
                ('expiration_time', models.DateTimeField(null=True)),
                ('description', models.TextField(blank=True)),
                ('team', models.CharField(max_length=64)),
                ('schema', models.TextField(blank=True)),
                ('sample_data', models.TextField(blank=True)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='ds_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('name', 'major_version', 'minor_version')},
            },
        ),
        migrations.CreateModel(
            name='DatasetInstance',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('path', models.CharField(max_length=255)),
                ('publish_time', models.DateTimeField()),
                ('data_time', models.DateTimeField()),
                ('deleted_time', models.DateTimeField(null=True)),
                ('revision', models.IntegerField()),
                ('row_count', models.BigIntegerField(null=True)),
                ('loader', models.TextField(null=True)),
                ('dataset', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='main.Dataset')),
                ('parent_instance', models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, to='main.DatasetInstance')),
            ],
            options={
                'unique_together': {('dataset', 'parent_instance', 'name', 'revision'), ('dataset', 'path', 'revision')},
            },
        ),
        migrations.CreateModel(
            name='Pipeline',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('team', models.CharField(max_length=64)),
                ('retired', models.BooleanField()),
                ('category', models.CharField(max_length=255)),
                ('context', models.TextField()),
                ('paused', models.BooleanField()),
                ('version', models.IntegerField(default=1)),
                ('dag_version', models.IntegerField(default=0)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='pipeline_created', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='PipelineGroup',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255, unique=True)),
                ('created_time', models.DateTimeField()),
                ('category', models.CharField(max_length=255)),
                ('context', models.TextField()),
                ('finished', models.BooleanField()),
                ('manual', models.BooleanField()),
            ],
        ),
        migrations.CreateModel(
            name='Timer',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255, unique=True)),
                ('description', models.TextField(blank=True)),
                ('team', models.CharField(max_length=64)),
                ('paused', models.BooleanField()),
                ('interval_unit', models.CharField(max_length=20)),
                ('interval_amount', models.IntegerField()),
                ('start_from', models.DateTimeField()),
                ('end_at', models.DateTimeField(null=True)),
                ('last_due', models.DateTimeField(null=True)),
                ('topic', models.CharField(blank=True, max_length=1024)),
                ('context', models.TextField(blank=True)),
                ('category', models.CharField(blank=True, max_length=255)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='timer_created', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='ScheduledEvent',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('due', models.DateTimeField()),
                ('acked', models.BooleanField()),
                ('topic', models.CharField(blank=True, max_length=1024)),
                ('context', models.TextField(blank=True)),
                ('category', models.CharField(blank=True, max_length=255)),
                ('timer', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='events', to='main.Timer')),
            ],
        ),
        migrations.CreateModel(
            name='PipelineInstance',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('context', models.TextField(blank=True)),
                ('status', models.CharField(max_length=20)),
                ('created_time', models.DateTimeField(null=True)),
                ('started_time', models.DateTimeField(null=True)),
                ('finished_time', models.DateTimeField(null=True)),
                ('failed_time', models.DateTimeField(null=True)),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='pis', to='main.PipelineGroup')),
                ('pipeline', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='main.Pipeline')),
            ],
        ),
        migrations.CreateModel(
            name='DataLocation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('type', models.CharField(blank=True, max_length=64)),
                ('location', models.CharField(blank=True, max_length=1024)),
                ('offset', models.IntegerField()),
                ('size', models.BigIntegerField(null=True)),
                ('dataset_instance', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='locations', to='main.DatasetInstance')),
            ],
        ),
        migrations.CreateModel(
            name='Application',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255, unique=True)),
                ('description', models.TextField()),
                ('team', models.CharField(max_length=64)),
                ('retired', models.BooleanField()),
                ('app_location', models.CharField(max_length=255)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='app_created', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='DatasetInstanceDep',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('dst_dsi', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='dst_dsideps', to='main.DatasetInstance')),
                ('src_dsi', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='src_dsideps', to='main.DatasetInstance')),
            ],
            options={
                'unique_together': {('src_dsi', 'dst_dsi')},
            },
        ),
    ]
