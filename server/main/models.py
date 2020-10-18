from django.db import models
from django.contrib.auth.models import User
import uuid
import pytz
from datetime import datetime

class AppException(Exception):
    pass

class InvalidOperationException(AppException):
    pass

class PermissionDeniedException(AppException):
    pass

class DataCorruptionException(AppException):
    pass

class Dataset(models.Model):
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name            = models.CharField(max_length=255, blank=False)     # required
    major_version   = models.CharField(max_length=10, blank=False)      # required
    minor_version   = models.IntegerField(null=False)                   # required
    publish_time    = models.DateTimeField(null=False)                  # non NULL field
    expiration_time = models.DateTimeField(null=True)                   # NULLable, set when a dataset is
                                                                        # deprecated so user should not look at it anymore
    description     = models.TextField(blank=True)                      # description is required
    author          = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=False,
        related_name='ds_created'
    )                                                                   # required
    team            = models.CharField(max_length=64, blank=False)      # required
    schema          = models.TextField(blank=True)
    sample_data     = models.TextField(blank=True)

    class Meta:
        unique_together = [
            ['name', 'major_version', 'minor_version']
        ]

    @classmethod
    def get_active_datasets(cls, requester):
        # get all active datasets
        return cls.objects.filter(expiration_time__isnull=True).all()

    # is this dataset active at given time?
    def is_active_at(self, dt):
        if dt < self.publish_time:
            return False
        return self.expiration_time is None or self.expiration_time > dt

    # create a dataset
    @classmethod
    def create(cls, requester, name, major_version, minor_version, publish_time,
               description, team):

        if not requester.is_authenticated:
            raise PermissionDeniedException()

        ds = Dataset(name = name,
                     major_version = major_version,
                     minor_version = minor_version,
                     publish_time = publish_time,
                     expiration_time = None,
                     description = description,
                     author = requester,
                     team = team)
        ds.save()
        return ds

    def get_children(self, requester):
        """
        Return all direct child dataset instances
        Deleted dataset instance is ignored.
        """
        return DatasetInstance.objects.filter(
            dataset = self,
            parent_instance = None,        # top level instance
            deleted_time = None            # still active
        ).order_by('name').all()

    def get_child(self, requester, name):
        """
        Return direct child dataset instance that match the name
        Deleted dataset instance is ignored.
        """
        dataset_instances = DatasetInstance.objects.filter(
            dataset = self,
            parent_instance = None,                     # top level instance
            name = name,                                # the instance name
            deleted_time = None                         # still active
        ).order_by('-revision').all()[:1]
        if len(dataset_instances) == 0:
            return None
        return dataset_instances[0]

    def get_instance_by_path(self, path):
        dataset_instances = DatasetInstance.objects.filter(
            dataset = self,
            path = path,                                # the instance path
            deleted_time = None                         # still active
        ).order_by('-revision').all()[:1]
        if len(dataset_instances) == 0:
            return None
        return dataset_instances[0]


class DatasetInstance(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset             = models.ForeignKey(Dataset, on_delete = models.PROTECT, null=False)       # non NULL field
    parent_instance     = models.ForeignKey('self', on_delete = models.PROTECT, null=True)         # NULLable, if NULL, then it is a top-level instance
    name                = models.CharField(max_length=255, blank=False)                            # required
    path                = models.CharField(max_length=255, blank=False)                            # required
    publish_time        = models.DateTimeField(blank=False, null=False)                            # non NULL field
    data_time           = models.DateTimeField(blank=False, null=False)                            # non NULL field
    deleted_time        = models.DateTimeField(null=True)                                          # NULLable, when not NULL, mean it is deleted
    revision            = models.IntegerField()
    row_count           = models.BigIntegerField(null=True)

    class Meta:
        unique_together = [
            ['dataset', 'parent_instance', 'name', 'revision']
        ]
        unique_together = [
            ['dataset', 'path', 'revision']
        ]

    @classmethod
    def create(cls, requester, dataset, parent_instance, name, row_count, publish_time, data_time, locations):
        if not requester.is_authenticated:
            raise PermissionDeniedException()

        # TODO: Need finer control on who can create dataset instance for a given dataset

        if not dataset.is_active_at(publish_time):
            raise InvalidOperationException("Invalid publish_time")

        instance_path = parent_instance.path if parent_instance is not None else ""

        dis = DatasetInstance.objects.filter(
            dataset=dataset,
            name=name,
            parent_instance=parent_instance
        ).order_by('-revision')[:1]
        old_di = None
        if len(dis)>0:
            # we are re-publishing a dataset instance
            assert len(dis) == 1

            # You need to expire the old onw, the new one should have a bumped revision
            old_di = dis[0]

            # re-publish should happen after the previous revision
            if old_di.publish_time > publish_time:
                raise InvalidOperationException("Invalid publish_time")

            if old_di.deleted_time is None:
                # still active
                old_di.deleted_time=publish_time
                old_di.save(update_fields=['deleted_time'])
            else:
                # old one is already deleted, re-publish should happen after that
                if old_di.deleted_time > publish_time:
                    raise InvalidOperationException("Invalid publish_time")
            revision = old_di.revision + 1
        else:
            revision = 0

        # save data instance
        di = DatasetInstance(
            dataset = dataset,
            parent_instance = parent_instance,
            name = name,
            row_count = row_count,
            path = instance_path + "/" + name,
            publish_time = publish_time,
            data_time = data_time,
            deleted_time = None,
            revision = revision
        )
        di.save()

        # save locations
        for offset, location in enumerate(locations):
            dl = DataLocation(
                dataset_instance = di,
                type = location.type,
                location = location.location,
                offset = offset,
                size = location.size,
            )
            dl.save()

        # move children belong to the old revision to the new revision
        if old_di is not None:
            for child in old_di.get_children(requester):
                child.parent_instance = di
                child.save()

        return di

    def destroy(self, requester):
        if not requester.is_authenticated:
            raise PermissionDeniedException()

        self.locations.all().delete()
        self.delete()

    def get_children(self, requester):
        """
        Return all direct child dataset instances
        Deleted dataset instance is ignored.
        """
        return DatasetInstance.objects.filter(
            dataset = self.dataset,
            parent_instance = self,                 # self's children
            deleted_time = None                     # still active
        ).order_by('name').all()

    def get_child(self, requester, name):
        """
        Return direct child dataset instance that match the name
        Deleted dataset instance is ignored.
        """
        dataset_instances = DatasetInstance.objects.filter(
            dataset = self.dataset,
            parent_instance = self,                     # self's children
            name = name,                       # the instance name
            deleted_time = None                         # still active
        ).order_by('-revision').all()[:1]
        if len(dataset_instances) == 0:
            return None
        return dataset_instances[0]


class DataLocation(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset_instance    = models.ForeignKey(
        DatasetInstance,
        on_delete = models.PROTECT,
        null=False,
        related_name = 'locations'
    )                                                                                       # required
    type                = models.CharField(max_length=64, blank=True)                       # required
    location            = models.CharField(max_length=1024, blank=True)                     # required
    offset              = models.IntegerField(null=False)

    # Storage size of the location, in bytes
    size                = models.BigIntegerField(null=True)

class PipelineGroup(models.Model):
    # A pipeline group stores shared context for multiple interested pipelines
    # category describe the category, e.g., "daily" or "pulse-daily"
    # Pipeline can listen on new context and generate PipelineInstance
    # context is usually a JSON object containing the context of the pipeline context
    # A pipeline context is finished if all pipeline in the context is finished
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name                = models.CharField(max_length=255, blank=False, unique=True)     # required
    created_time        = models.DateTimeField(null=False)                                         # required
    category            = models.CharField(max_length=255, blank=False)                            # required
    context             = models.TextField(blank=False)
    finished            = models.BooleanField(null=False)

    # attach bunch of pipelines to this pipeline group
    def attach(self, pipeline_ids):
        now = datetime.utcnow().replace(tzinfo=pytz.UTC)

        for pipeline_id in pipeline_ids:
            pi = PipelineInstance(
                pipeline_id = pipeline_id,
                group_id = self.id,
                context = "{}",
                status = PipelineInstance.CREATED_STATUS,
                created_time = now
            )
            pi.save()

class Pipeline(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name                = models.CharField(max_length=255, blank=False)     # required
    description         = models.TextField(blank=True)                     # description is required
    author              = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=False,
        related_name='pipeline_created'
    )                                                                       # required
    team                = models.CharField(max_length=64, blank=False)      # required
    retired             = models.BooleanField(null=False)
    category            = models.CharField(max_length=255, blank=False)

    context             = models.TextField(blank=False)
    paused              = models.BooleanField(null=False)

    # When you create a dag or update an existing dag in airflow, airflow will execute the dag file
    # and will bump the dag_version to current
    #
    # When you update a pipeline, you shuld pause it first,
    # and then wait for dag_version to catch up version, then unpause it
    version             = models.IntegerField(null=False, default=1)
    dag_version         = models.IntegerField(null=False, default=0)


    @classmethod
    def get_active_pipelines(cls, requester):
        # get all active datasets
        return cls.objects.filter(retired__exact=False).all()

    # create a pipeline
    @classmethod
    def create(cls, requester, name, description, team, category, context):
        if not requester.is_authenticated:
            raise PermissionDeniedException()

        pipeline = Pipeline(
            name = name,
            description = description,
            author = requester,
            team = team,
            retired = False,
            paused = True,
            category = category,
            context = context,
        )
        pipeline.save()
        return pipeline

class PipelineInstance(models.Model):
    # status
    # created:
    #     DAG has been created, not yet triggered
    # started:
    #     DAG has been triggered, not yet completed
    # finished:
    #     DAG has been triggered and it completed successfully
    # failed:
    #     DAG has been triggered and it completed with failure
    CREATED_STATUS  = "created"
    STARTED_STATUS  = "started"
    FINISHED_STATUS = "finished"
    FAILED_STATUS   = "failed"

    # A pipeline instance lives inside a pipeline context
    # It is generated from a pipeline's on_context_created_method
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pipeline            = models.ForeignKey(Pipeline, on_delete = models.PROTECT, null=False)           # non NULL field

    # the pipeline group this instance belongs to
    group               = models.ForeignKey(
        PipelineGroup,
        on_delete = models.PROTECT,
        null=False,
        related_name="pis"     # pis stands for pipeline instances
    )    # non NULL field

    # Stores invocation history
    context             = models.TextField(blank=True)  # JSON context so the system know how to invoke the pipeline

    status              = models.CharField(max_length=20, blank=False)
    # valid values are 'created', 'started', 'failed', 'finished'
    created_time        = models.DateTimeField(null=True)
    started_time        = models.DateTimeField(null=True)
    finished_time       = models.DateTimeField(null=True)
    failed_time         = models.DateTimeField(null=True)

class Application(models.Model):
    # For now, assuming it is a spark app.
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name                = models.CharField(max_length=255, blank=False, unique=True)     # required
    description         = models.TextField(blank=False)                     # description is required
    author              = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=False,
        related_name='app_created'
    )                                                                       # required
    team                = models.CharField(max_length=64, blank=False)      # required
    # user won't be able to use retired app
    retired             = models.BooleanField(null=False)
    app_location        = models.CharField(max_length=255, blank=False)

    # create an application
    @classmethod
    def create(cls, requester, name, description, team, app_location):
        if not requester.is_authenticated:
            raise PermissionDeniedException()

        application = Application(
            name = name,
            description = description,
            author = requester,
            team = team,
            retired = False,
            app_location = app_location,
        )
        application.save()
        return application
