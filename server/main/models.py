import uuid
from datetime import datetime, timedelta
from enum import Enum

from django.db import models
from django.contrib.auth.models import User
import pytz
from django.core.exceptions import ValidationError

TIME_UNIT_YEAR      = "YEAR"
TIME_UNIT_MONTH     = "MONTH"
TIME_UNIT_DAY       = "DAY"
TIME_UNIT_HOUR      = "HOUR"
TIME_UNIT_MINUTE    = "MINUTE"
TIME_UNIT_SECOND    = "SECOND"
VALID_INTERVAL_UNITS = [
    TIME_UNIT_YEAR, TIME_UNIT_MONTH, TIME_UNIT_DAY,
    TIME_UNIT_HOUR, TIME_UNIT_MINUTE, TIME_UNIT_SECOND
]

# adjust datetime
def adjust_time(dt, delta_unit, delta_amount):
    if delta_unit == TIME_UNIT_YEAR:
        year, month, day, hour, minutes, second, microsecond = dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second, dt.microsecond
        year += delta_amount
        return dt.tzinfo.localize(datetime(year, month, day, hour, minute, second, microsecond))

    if delta_unit == TIME_UNIT_MONTH:
        year, month, day, hour, minutes, second, microsecond = dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second, dt.microsecond
        x = month - 1 + delta_amount
        if x >= 0:
            year += x // 12
            month = x % 12 + 1
        else:
            x_year = (-x+11) // 12  # number of years to absorb
            year -= x_year
            month = x + 12*x_year + 1
        return dt.tzinfo.localize(datetime(year, month, day, hour, minute, second, microsecond))

    if delta_unit == TIME_UNIT_DAY:
        return dt + timedelta(days=delta_amount)

    if delta_unit == TIME_UNIT_HOUR:
        return dt + timedelta(hours=delta_amount)

    if delta_unit == TIME_UNIT_MINUTE:
        return dt + timedelta(minutes=delta_amount)

    if delta_unit == TIME_UNIT_SECOND:
        return dt + timedelta(seconds=delta_amount)


class AppException(Exception):
    pass

class InvalidOperationException(AppException):
    pass

class PermissionDeniedException(AppException):
    pass

class DataCorruptionException(AppException):
    pass

class Application(models.Model):

    class SysAppID(Enum):
        EXECUTE_SQL = 1

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

    # If sys_app_id is null, then it is not a system app, otherwise, it is a
    # system app, all system app is defined in SysAppID
    sys_app_id          = models.IntegerField(null=True,)

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

    @classmethod
    def get_execute_sql_app(cls, request):
        apps = cls.objects.filter(sys_app_id=cls.SysAppID.EXECUTE_SQL.value)
        if len(apps) == 0:
            raise DataCorruptionException("Execute SQL Application is not configured")
        return apps[0]



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
        return self.expiration_time is None or self.expiration_time > dt

    @classmethod
    def from_name_and_version(cls, name, major_version, minor_version):
        ds_list = Dataset.objects.filter(
            name = name,
            major_version = major_version,
            minor_version = minor_version
        )
        if len(ds_list) == 0:
            return None
        if len(ds_list) != 1:
            raise DataCorruptionException("Something went wrong")
        return ds_list[0]


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
        ).order_by('-data_time', "path").all()

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

    def set_schema_and_sample_data(self, requester, schema, sample_data=""):
        if not requester.is_authenticated:
            raise PermissionDeniedException()

        if not schema:
            # you cannot specify blank schema
            raise ValidationError("Wrong schema")

        if not self.schema:
            self.schema = schema
            self.sample_data = sample_data
            self.save()
            return

        if self.schema != schema:
            raise ValidationError("Inconsistent schema")

        if sample_data:
            self.sample_data = sample_data
        self.save()


# We call it asset in UI
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
    # Ff loader is true, then this instance is virtual, the loeader will need to load this table
    # loader field is a JSON object that contains loader name and loader args
    loader              = models.TextField(null=True)

    # Most asset are produced by an application, we will capture
    # the application, and arguments passed to the application
    # Those fields are optional, for example, when user do a one-off
    # to back fill the data, they probably do not have application
    # associated, in that case, they can put a note, see note field
    application         = models.ForeignKey(
        Application,
        on_delete=models.PROTECT,
        null=True,
        related_name='dsis'
    )
    application_args    = models.TextField(null=True)

    # Optional, put by producer for anything people need to be aware of
    note = models.TextField(null=True)

    class Meta:
        unique_together = [
            ['dataset', 'parent_instance', 'name', 'revision'],
            ['dataset', 'path', 'revision']
        ]

    # return all dataset instance path this dataset depend on (aka lead to this dataset)
    @property
    def src_dataset_instances(self):
        dsi_path = []
        for dep in self.dst_dsideps.all():
            if dep.src_dsi.deleted_time is None:
                dsi_path.append(dep.src_dsi.dsi_path)
        return dsi_path

    # return all dataset instance path depend on this dataset (aka this dataset leads to)
    @property
    def dst_dataset_instances(self):
        dsi_path = []
        for dep in self.src_dsideps.all():
            if dep.dst_dsi.deleted_time is None:
                dsi_path.append(dep.dst_dsi.dsi_path)
        return dsi_path

    @property
    def dsi_path(self):
        return f"{self.dataset.name}:{self.dataset.major_version}:{self.dataset.minor_version}:{self.path}:{self.revision}"

    @classmethod
    def revisions_from_dsi_path(cls, dsi_path):
        # all the dataset_instance belongs to the same dataset
        # if return is not None, it MUST be a non-empty list
        dataset_name, major_version, minor_version, path = dsi_path.split(':')[:4]
        ds = Dataset.from_name_and_version(dataset_name, major_version, int(minor_version))
        if ds is None:
            return None

        dsi_list = DatasetInstance.objects.filter(
            dataset = ds,
            path = path,
        ).order_by('-revision')

        if len(dsi_list) == 0:
            return None

        return dsi_list

    @classmethod
    def from_dsi_path(cls, dsi_path):
        dataset_name, major_version, minor_version, path, revision = dsi_path.split(':')
        ds = Dataset.from_name_and_version(dataset_name, major_version, int(minor_version))

        dsi_list = DatasetInstance.objects.filter(
            dataset = ds,
            path = path,
            revision = revision,
        )
        if len(dsi_list) == 0:
            return None
        if len(dsi_list) != 1:
            raise DataCorruptionException("Something went wrong")
        dsi = dsi_list[0]
        if dsi.deleted_time is not None:
            return None

        return dsi

    @classmethod
    def create(cls, requester, dataset, parent_instance, name, row_count, publish_time,
               data_time, locations, loader=None, src_dsi_paths=[],
               application_id=None, application_args=None
    ):
        if not requester.is_authenticated:
            raise PermissionDeniedException()

        # TODO: Need finer control on who can create dataset instance for a given dataset

        if not dataset.is_active_at(data_time):
            raise InvalidOperationException("Invalid data_time")

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

            if len(old_di.dst_dataset_instances) > 0:
                raise InvalidOperationException("Cannot create new revision")

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

        if application_id is None:
            application = None
        else:
            application = Application.objects.get(pk=application_id)

        # save data instance
        di = DatasetInstance(
            dataset = dataset,
            parent_instance = parent_instance,
            name = name,
            row_count = row_count,
            loader = loader,
            path = instance_path + "/" + name,
            publish_time = publish_time,
            data_time = data_time,
            deleted_time = None,
            application = application,
            application_args = application_args,
            revision = revision
        )
        di.save()

        repo_dict = {} # key is repo name
        # save locations
        for offset, location in enumerate(locations):
            repo_name = location.repo_name
            if repo_name is None:
                repo = None
            else:
                if repo_name not in repo_dict:
                    repo = DataRepo.get_by_name(repo_name)
                    if repo is None:
                        raise InvalidOperationException("Invalid repo name: {}".format(repo_name))
                    repo_dict[repo_name] = repo
                repo = repo_dict[repo_name]
            dl = DataLocation(
                dataset_instance = di,
                type = location.type,
                repo = repo,
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

        # save dependencies
        for src_dsi_path in src_dsi_paths:
            src_dsi = DatasetInstance.from_dsi_path(src_dsi_path)
            if src_dsi is None:
                raise InvalidOperationException(f"dataset {src_dsi_path} does not exist")
            dsi_dep = DatasetInstanceDep(
                src_dsi = src_dsi,
                dst_dsi = di
            )
            dsi_dep.save()

        return di

    def soft_delete(self, requester):
        if not requester.is_authenticated:
            raise PermissionDeniedException()

        if self.deleted_time is not None:
            raise InvalidOperationException("Already deleted")

        if len(self.dst_dataset_instances) > 0:
            raise InvalidOperationException("Cannot delete")

        now = datetime.utcnow().replace(tzinfo=pytz.UTC)
        self.deleted_time = now
        self.save(update_fields=['deleted_time'])


    def get_children(self, requester):
        """
        Return all direct child dataset instances
        Deleted dataset instance is ignored.
        """
        return DatasetInstance.objects.filter(
            dataset = self.dataset,
            parent_instance = self,                 # self's children
            deleted_time = None                     # still active
        ).order_by('-data_time', 'path').all()

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



class DatasetInstanceDep(models.Model):
    # each row represent src dsi generates dst dsi. (aka dst depened on src)
    id                  = models.AutoField(primary_key=True)
    src_dsi             = models.ForeignKey(DatasetInstance,
                                            on_delete = models.PROTECT,
                                            related_name = 'src_dsideps',
                                            null=False)       # non NULL field
    dst_dsi             = models.ForeignKey(DatasetInstance,
                                            on_delete = models.PROTECT,
                                            related_name = 'dst_dsideps',
                                            null=False)       # non NULL field

    class Meta:
        unique_together = [
            ['src_dsi', 'dst_dsi']
        ]


class DataRepo(models.Model):

    class RepoType(Enum):
        LFS     = 1     # Local file system
        HDFS    = 2     # HDFS and all connectors supported by HDFS, such as S3, oci, etc
        JDBC    = 3     # via JDBC connector

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=255, blank=True, unique=True)
    description = models.TextField(blank=True)
    type        = models.IntegerField(null=False)
    context     = models.TextField(blank=True)

    @classmethod
    def get_by_name(cls, name):
        repos = DataRepo.objects.filter(name=name)
        if len(repos) == 0:
            return None
        return repos[0]


class DataLocation(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset_instance    = models.ForeignKey(
        DatasetInstance,
        on_delete = models.PROTECT,
        null=False,
        related_name = 'locations'
    )                                                                                       # required
    type                = models.CharField(max_length=64, blank=True)                       # required
    repo                = models.ForeignKey(
        DataRepo,
        on_delete=models.PROTECT,
        null=True,
        related_name='locations'
    )
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
    manual              = models.BooleanField(null=False)  # is this manually created?

    # only non-manual pipeline group has due, it is the due for the timer
    due                 = models.DateTimeField(null=True)                                         # required

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

    # get the prior pipeline instance of the same pipeline
    # for the same schedule, same pipeline, we should invoke one at a time
    def get_prior_instance(self):
        q = PipelineInstance.objects.select_related("group").filter(
            pipeline=self.pipeline
        ).filter(
            group__due__lt = self.group.due
        ).order_by("-group__due")[:1]


        if len(q) == 0:
            return None
        return q[0]


class Timer(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name                = models.CharField(max_length=255, blank=False, unique=True)     # required
    description         = models.TextField(blank=True)
    author              = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=False,
        related_name='timer_created'
    )                                                                       # required
    team                = models.CharField(max_length=64, blank=False)      # required
    paused              = models.BooleanField(null=False)

    interval_unit       = models.CharField(max_length=20, blank=False)
    interval_amount     = models.IntegerField(null=False)

    start_from          = models.DateTimeField(null=False)
    end_at              = models.DateTimeField(null=True)

    # The last due we triggered
    last_due            = models.DateTimeField(null=True)

    # when an event is triggered, the topic and context will be copied to the ScheduledEvent
    topic               = models.CharField(max_length=1024, blank=True)

    # A JSON object, entered by user
    context             = models.TextField(blank=True)

    # matters only when the topic is "pipeline"
    category            = models.CharField(max_length=255, blank=True)

    # create a timer
    @classmethod
    def create(cls, requester, name, description, team, paused,
               interval_unit, interval_amount,
               start_from, topic, context, category="", end_at=None):

        if not requester.is_authenticated:
            raise PermissionDeniedException()

        # TODO: validate arguments
        timer = Timer(name = name,
                      description = description,
                      author = requester,
                      team = team,
                      paused = paused,
                      interval_unit = interval_unit,
                      interval_amount = interval_amount,
                      start_from = start_from,
                      last_due = None,
                      topic = topic,
                      context = context,
                      category = category,
                      end_at = end_at
                     )
        timer.save()
        return timer

    def next_due(self, dryrun=True, event_handler=None):
        # if dryrun is True, we only return the next due, but do not
        # write to db

        if self.last_due is None:
            due = self.start_from
        else:
            due = adjust_time(self.last_due, self.interval_unit, self.interval_amount)
        if dryrun:
            return due

        self.last_due = due

        se = ScheduledEvent(
            timer       = self,
            due         = due,
            acked       = False,
            topic       = self.topic,
            context     = self.context,
            category    = self.category,
        )

        self.save()
        se.save()
        if event_handler:
            event_handler(se)
        return due

    @classmethod
    def produce_next_due(cls, topic, event_handler=None):
        # For now, we assume all the timer uses UTC timezone
        now = datetime.utcnow().replace(tzinfo=pytz.UTC)

        picked_timer = None
        picked_due = None
        for timer in Timer.objects.filter(paused=False).filter(topic=topic):
            due = timer.next_due()
            if picked_due is None or due < picked_due:
                picked_due = due
                picked_timer = timer

        if picked_due is None or picked_due > now:
            # no schedule event generated
            return False

        picked_timer.next_due(dryrun=False, event_handler=event_handler)
        return True


class ScheduledEvent(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timer               = models.ForeignKey(
        Timer,
        on_delete=models.PROTECT,
        null=False,
        related_name='events'
    )
    due                 = models.DateTimeField(null=False)
    acked               = models.BooleanField(null=False)
    topic               = models.CharField(max_length=1024, blank=True)
    context             = models.TextField(blank=True)

    # matters only when the topic is "pipeline"
    category            = models.CharField(max_length=255, blank=True)
