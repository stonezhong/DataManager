import uuid
from datetime import datetime, timedelta
from enum import Enum

from django.db import models
from django.contrib.auth.models import User
import pytz
from django.core.exceptions import ValidationError, PermissionDenied

from DataCatalog.settings import TOKEN_KEY
from cryptography.fernet import Fernet

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
    def __init__(self, message=""):
        self.message = message

class InvalidOperationException(AppException):
    pass

class PermissionDeniedException(AppException):
    pass

class DataCorruptionException(AppException):
    pass

class Tenant(models.Model):
    # public tenant: allow every to read
    id                  = models.AutoField(primary_key=True)
    name                = models.CharField(max_length=255, blank=False, unique=True)     # required
    description         = models.TextField(blank=True)
    is_public           = models.BooleanField(null=False)
    config              = models.TextField(null=False)

    # create a tenant
    @classmethod
    def create(cls, creator, name, description, config, is_public):
        tenant = Tenant(
            name = name,
            description = description,
            config = config,
            is_public = is_public,
        )
        tenant.save()

        user_tenant_subscription = UserTenantSubscription(
            user = creator,
            tenant = tenant,
            is_admin = True,
        )
        user_tenant_subscription.save()

        # let's create system application
        app = Application(
            tenant = tenant,
            name = "Execute SQL",
            description = "System Application for Executing SQL statements",
            author = creator,
            team = "admins",
            retired = False,
            app_location = "s3://data-manager-apps/execute_sql/1.0.0.0",
            sys_app_id = Application.SysAppID.EXECUTE_SQL.value
        )
        app.save()

        return tenant

    def is_user_subscribed(self, user, admin_only=False):
        user_tenant_subscriptions = UserTenantSubscription.objects.filter(
            tenant=self,
            user=user,
        ).all()
        if len(user_tenant_subscriptions)==0:
            return False
        assert len(user_tenant_subscriptions)==1
        if not admin_only:
            return True

        return user_tenant_subscriptions[0].is_admin

    def subscribe_user(self, user, is_admin=False):
        user_tenant_subscriptions = UserTenantSubscription.objects.filter(
            tenant=self,
            user=user,
        ).all()
        if len(user_tenant_subscriptions)==0:
            user_tenant_subscription = UserTenantSubscription(
                user=user,
                tenant=self,
                is_admin=is_admin
            )
            user_tenant_subscription.save()
            return

        assert len(user_tenant_subscriptions)==1
        user_tenant_subscription = user_tenant_subscriptions[0]
        if is_admin and not user_tenant_subscription.is_admin:
            user_tenant_subscription.is_admin = True
            user_tenant_subscription.save()
        return


    def create_dataset(self, name, major_version, minor_version, publish_time, description, author, team):
        if not self.is_user_subscribed(author):
            raise PermissionDenied("User is not subscribed to the tenant")

        dataset = Dataset(tenant = self,
                          name = name,
                          major_version = major_version,
                          minor_version = minor_version,
                          publish_time = publish_time,
                          expiration_time = None,
                          description = description,
                          author = author,
                          team = team)
        dataset.save()
        return dataset


    def get_dataset(self, name, major_version, minor_version):
        ds_list = Dataset.objects.filter(
            tenant = self,
            name = name,
            major_version = major_version,
            minor_version = minor_version
        )
        if len(ds_list) == 0:
            return None
        assert len(ds_list) == 1
        return ds_list[0]


    def create_application(self, author, name, description, team, app_location):
        if not self.is_user_subscribed(author):
            raise PermissionDenied("User is not subscribed to the tenant")

        application = Application(tenant = self,
                                  name = name,
                                  description = description,
                                  author = author,
                                  team = team,
                                  retired = False,
                                  app_location = app_location)
        application.save()
        return application


    def get_application_by_sys_app_id(self, sys_app_id):
        applications = Application.objects.filter(
            tenant      = self,
            sys_app_id  = sys_app_id.value,
            retired     = False
        ).all()
        if len(applications) == 0:
            return None
        assert len(applications) == 1
        return applications[0]

    def create_data_repo(self, name, description, type, context):
        data_repo = DataRepo(
            tenant = self,
            name = name,
            description = description,
            type = type.value,
            context = context
        )
        data_repo.save()
        return data_repo

    def get_data_repo_by_name(self, data_repo_name):
        repos = DataRepo.objects.filter(tenant=self, name=data_repo_name)
        if len(repos) == 0:
            return None
        assert len(repos)==1
        return repos[0]


    def get_asset_revisions_from_path(self, asset_path):
        """
        Return all revisions of a given asset
        """
        # all the asset belongs to the same dataset, having the same name, all revision
        # if return is not None, it MUST be a non-empty list
        segs = asset_path.split(':')
        if len(segs) < 4:
            raise ValidationError("Invalid asset path")

        dataset_name, major_version, minor_version_str, name = segs[:4]
        try:
            minor_version = int(minor_version_str)
        except ValueError:
            raise ValidationError("Invalid asset path")

        dataset = self.get_dataset(dataset_name, major_version, minor_version)
        if dataset is None:
            return None

        asset_list = Asset.objects.filter(
            tenant = self,
            dataset = dataset,
            name = name,
        ).order_by('-revision')

        if len(asset_list) == 0:
            return None

        return asset_list


    def get_asset_from_path(self, asset_path):
        segs = asset_path.split(':')
        if len(segs) != 5:
            raise ValidationError("Invalid asset path")

        dataset_name, major_version, minor_version_str, name, revision_str = segs
        try:
            minor_version = int(minor_version_str)
            revision = int(revision_str)
        except ValueError:
            raise ValidationError("Invalid asset path")

        dataset = self.get_dataset(dataset_name, major_version, minor_version)
        if dataset is None:
            return None

        assets = Asset.objects.filter(
            tenant = self,
            dataset = dataset,
            name = name,
            revision = revision,
        )
        if len(assets) == 0:
            return None
        assert len(assets)==1
        asset = assets[0]
        if asset.deleted_time is not None:
            return None
        return asset


    def create_pipeline(self, author, name, description, team, category, context):
        if not self.is_user_subscribed(author):
            raise PermissionDenied("User is not subscribed to the tenant")

        pipeline = Pipeline(
            tenant = self,
            name = name,
            description = description,
            author = author,
            team = team,
            retired = False,
            paused = True,
            category = category,
            context = context,
        )
        pipeline.save()
        return pipeline

    def get_active_pipelines(self):
        # get all active pipelines
        return Pipeline.objects.filter(tenant = self, retired__exact=False).all()



class UserTenantSubscription(models.Model):
    id                  = models.AutoField(primary_key=True)
    user                = models.ForeignKey(User,
                            on_delete = models.PROTECT,
                            null=False,
                            related_name='subscription')
    tenant              = models.ForeignKey(Tenant,
                            on_delete = models.PROTECT,
                            null=False,
                            related_name='subscription')
    is_admin            = models.BooleanField(null=False)

    class Meta:
        unique_together = [
            ['tenant', 'user']
        ]

    # list all my subscriptions
    @classmethod
    def get_subscriptions_for_user(cls, user):
        subscriptions = UserTenantSubscription.objects.filter(
            user=user
        ).select_related('tenant').order_by('id')
        return subscriptions

class Application(models.Model):

    class SysAppID(Enum):
        EXECUTE_SQL = 1

    # For now, assuming it is a spark app.
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant              = models.ForeignKey(Tenant, on_delete = models.PROTECT, null=False)
    name                = models.CharField(max_length=255, blank=False)     # required
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

    class Meta:
        unique_together = [
            ['tenant', 'name'],
            ['tenant', 'sys_app_id'],
        ]




class Dataset(models.Model):
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant          = models.ForeignKey(Tenant, on_delete=models.PROTECT, null=False)
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
    schema          = models.TextField(blank=True)                      # schema from dataframe
    sample_data     = models.TextField(blank=True)
    schema_ext      = models.TextField(blank=True)                      # extended schema

    class Meta:
        unique_together = [
            ['tenant', 'name', 'major_version', 'minor_version']
        ]

    # is this dataset active at given time?
    def is_active_at(self, dt):
        return self.expiration_time is None or self.expiration_time > dt


    def get_assets(self):
        """
        Return all direct child dataset instances
        Deleted dataset instance is ignored.
        """
        return Asset.objects.filter(
            tenant=self.tenant,
            dataset = self,
            deleted_time = None            # still active
        ).order_by('-data_time', "name").all()

    def get_asset_by_name(self, name):
        """
        Return direct child dataset instance that match the name
        Deleted dataset instance is ignored.
        """
        dataset_instances = Asset.objects.filter(
            tenant=self.tenant,
            dataset = self,
            name = name,                                # the instance name
            deleted_time = None                         # still active
        ).order_by('-revision').all()[:1]
        if len(dataset_instances) == 0:
            return None
        assert len(dataset_instances) == 1
        return dataset_instances[0]

    def set_schema_and_sample_data(self, schema, sample_data=""):
        if not schema:
            # you cannot specify blank schema
            raise ValidationError("schema missing")

        if not self.schema:
            self.schema = schema
            self.sample_data = sample_data
            self.save()
            return

        if self.schema != schema:
            raise ValidationError("cannot change schema")

        if sample_data:
            self.sample_data = sample_data
        self.save()


    def create_asset(self, name, row_count, publish_time, data_time, locations,
                     loader=None, src_dsi_paths=[], application=None,
                     application_args=None):

        if not self.is_active_at(data_time):
            raise ValidationError("Dataset is not active")

        if application is not None and application.tenant.id != self.tenant.id:
            raise ValidationError("Application not in the tenant")

        if len(locations)==0:
            raise ValidationError("No location specified")

        tenant = self.tenant

        assets = Asset.objects.filter(
            tenant=tenant,
            dataset=self,
            name=name,
        ).order_by('-revision')[:1]
        old_asset = None
        if len(assets)>0:
            # we are re-publishing an asset
            assert len(assets) == 1

            # You need to expire the old onw, the new one should have a bumped revision
            old_asset = assets[0]

            if len(old_asset.dst_assets) > 0:
                raise ValidationError(message="Cannot delete an asset while there are other asset depend on it")

            # re-publish should happen after the previous revision
            if old_asset.publish_time > publish_time:
                raise ValidationError(message="Publish time is too early")

            if old_asset.deleted_time is None:
                # still active
                old_asset.deleted_time=publish_time
                old_asset.save(update_fields=['deleted_time'])
            else:
                # old one is already deleted, re-publish should happen after that
                if old_asset.deleted_time > publish_time:
                    raise ValidationError(message="Publish time is too early")
            revision = old_asset.revision + 1
        else:
            revision = 0

        # save asset
        asset = Asset(
            tenant = tenant,
            dataset = self,
            name = name,
            row_count = row_count,
            loader = loader,
            publish_time = publish_time,
            data_time = data_time,
            deleted_time = None,
            application = application,
            application_args = application_args,
            revision = revision
        )
        asset.save()

        repo_dict = {} # key is repo name
        # save locations
        for offset, location in enumerate(locations):
            repo_name = location.repo_name
            if repo_name is None:
                repo = None
            else:
                if repo_name not in repo_dict:
                    repo = tenant.get_data_repo_by_name(repo_name)
                    if repo is None:
                        raise ValidationError("Invalid repo name")
                    repo_dict[repo_name] = repo
                repo = repo_dict[repo_name]
            dl = DataLocation(
                tenant = tenant,
                asset = asset,
                type = location.type,
                repo = repo,
                location = location.location,
                offset = offset,
                size = location.size,
            )
            dl.save()

        # save dependencies
        for src_dsi_path in src_dsi_paths:
            src_dsi = tenant.get_asset_from_path(src_dsi_path)
            if src_dsi is None:
                raise ValidationError(f"Source asset does not exist")
            dsi_dep = AssetDep(
                tenant = tenant,
                src_dsi = src_dsi,
                dst_dsi = asset
            )
            dsi_dep.save()

        return asset


class Asset(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant              = models.ForeignKey(Tenant, on_delete=models.PROTECT, null=False)
    dataset             = models.ForeignKey(Dataset, on_delete = models.PROTECT, null=False)       # non NULL field
    name                = models.CharField(max_length=255, blank=False)                            # required
    publish_time        = models.DateTimeField(blank=False, null=False)                            # non NULL field
    data_time           = models.DateTimeField(blank=False, null=False)                            # non NULL field
    deleted_time        = models.DateTimeField(null=True)                                          # NULLable, when not NULL, mean it is deleted
    revision            = models.IntegerField()
    row_count           = models.BigIntegerField(null=True)
    # If loader is true, then this asset is virtual, the loeader will need to load this table
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
            ['tenant', 'dataset', 'name', 'revision'],
        ]

    # return all asset path this dataset depend on (aka lead to this dataset)
    @property
    def src_assets(self):
        dsi_path = []
        for dep in self.dst_dsideps.all():
            if dep.src_dsi.deleted_time is None:
                dsi_path.append(dep.src_dsi.dsi_path)
        return dsi_path

    # return all asset path depend on this dataset (aka this dataset leads to)
    @property
    def dst_assets(self):
        dsi_path = []
        for dep in self.src_dsideps.all():
            if dep.dst_dsi.deleted_time is None:
                dsi_path.append(dep.dst_dsi.dsi_path)
        return dsi_path

    @property
    def dsi_path(self):
        return f"{self.dataset.name}:{self.dataset.major_version}:{self.dataset.minor_version}:{self.name}:{self.revision}"


    def soft_delete(self):
        if self.deleted_time is not None:
            # easy, already deleted
            return

        if len(self.dst_assets) > 0:
            # There are other dataset depend on this one
            raise ValidationError(message="Cannot delete an asset while there are other asset depend on it")

        now = datetime.utcnow().replace(tzinfo=pytz.UTC)
        self.deleted_time = now
        self.save(update_fields=['deleted_time'])




class AssetDep(models.Model):
    # each row represent src dsi generates dst dsi. (aka dst depened on src)
    id                  = models.AutoField(primary_key=True)
    tenant              = models.ForeignKey(Tenant, on_delete=models.PROTECT, null=False)
    src_dsi             = models.ForeignKey(Asset,
                                            on_delete = models.PROTECT,
                                            related_name = 'src_dsideps',
                                            null=False)       # non NULL field
    dst_dsi             = models.ForeignKey(Asset,
                                            on_delete = models.PROTECT,
                                            related_name = 'dst_dsideps',
                                            null=False)       # non NULL field

    class Meta:
        unique_together = [
            ['tenant', 'src_dsi', 'dst_dsi']
        ]


class DataRepo(models.Model):

    class RepoType(Enum):
        LFS     = 1     # Local file system
        HDFS    = 2     # HDFS and all connectors supported by HDFS, such as S3, oci, etc
        JDBC    = 3     # via JDBC connector

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant      = models.ForeignKey(Tenant, on_delete=models.PROTECT, null=False)
    name        = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    type        = models.IntegerField(null=False)
    context     = models.TextField(blank=True)

    class Meta:
        unique_together = [
            ['tenant', 'name']
        ]



class DataLocation(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant              = models.ForeignKey(Tenant, on_delete=models.PROTECT, null=False)
    asset               = models.ForeignKey(
        Asset,
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

    class Meta:
        unique_together = [
            ['tenant', 'asset', 'offset'],
        ]

class PipelineGroup(models.Model):
    # A pipeline group stores shared context for multiple interested pipelines
    # category describe the category, e.g., "daily" or "pulse-daily"
    # Pipeline can listen on new context and generate PipelineInstance
    # context is usually a JSON object containing the context of the pipeline context
    # A pipeline context is finished if all pipeline in the context is finished
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant              = models.ForeignKey(Tenant, on_delete=models.PROTECT, null=False)
    name                = models.CharField(max_length=255, blank=False)                            # required
    created_time        = models.DateTimeField(null=False)                                         # required
    category            = models.CharField(max_length=255, blank=False)                            # required
    context             = models.TextField(blank=False)
    finished            = models.BooleanField(null=False)
    manual              = models.BooleanField(null=False)  # is this manually created?

    # only non-manual pipeline group has due, it is the due for the timer
    due                 = models.DateTimeField(null=True)                                         # required

    class Meta:
        unique_together = [
            ['tenant', 'name']
        ]

    # attach bunch of pipelines to this pipeline group
    def attach(self, pipeline):
        if pipeline.tenant.id != self.tenant.id:
            raise ValidationError("Invalid tenant")

        now = datetime.utcnow().replace(tzinfo=pytz.UTC)
        pi = PipelineInstance(
            tenant=self.tenant,
            pipeline = pipeline,
            group = self,
            context = "{}",
            status = PipelineInstance.CREATED_STATUS,
            created_time = now
        )
        pi.save()
        return pi

class Pipeline(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant              = models.ForeignKey(Tenant, on_delete=models.PROTECT, null=False)
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
    tenant              = models.ForeignKey(Tenant, on_delete=models.PROTECT, null=False)
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
            tenant=self.tenant,
            pipeline=self.pipeline,
            group__due__lt = self.group.due
        ).order_by("-group__due")[:1]


        if len(q) == 0:
            return None
        return q[0]


class Timer(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant              = models.ForeignKey(Tenant, on_delete=models.PROTECT, null=False)
    name                = models.CharField(max_length=255, blank=False)     # required
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

    class Meta:
        unique_together = [
            ['tenant', 'name']
        ]

    # create a timer
    @classmethod
    def create(cls, requester, tenant_id, name, description, team, paused,
               interval_unit, interval_amount,
               start_from, topic, context, category="", end_at=None):

        if not requester.is_authenticated:
            raise PermissionDeniedException()

        # TODO: validate arguments
        timer = Timer(tenant_id = tenant_id,
                      name = name,
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
            tenant      = self.tenant,
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
    tenant              = models.ForeignKey(Tenant, on_delete=models.PROTECT, null=False)
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


class AccessToken(models.Model):
    class Purpose(Enum):
        SIGNUP_VALIDATE         = 1   # verify user upon signup
        RESET_PASSWORD          = 2   # for user to reset password
        API_TOKEN               = 3   # for accessing DM from spark job

    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content             = models.TextField(blank=True)
    tenant              = models.ForeignKey(Tenant, on_delete=models.PROTECT, null=True)
    user                = models.ForeignKey(User,
                            on_delete = models.PROTECT,
                            null=False)
    create_time         = models.DateTimeField(null=False)
    expire_time         = models.DateTimeField(null=False)
    purpose             = models.IntegerField(null=False)

    @classmethod
    def create_token(cls, user, duration, purpose, tenant=None):
        now = datetime.utcnow().replace(tzinfo=pytz.UTC)

        access_token = AccessToken(
            tenant = tenant,
            user = user,
            create_time = now,
            expire_time = now + duration,
            purpose = purpose.value
        )
        access_token.save()

        f = Fernet(TOKEN_KEY.encode('utf-8'))
        msg = str(access_token.id).encode('utf-8')
        raw_content = f.encrypt(msg)
        content = raw_content.decode('utf-8')
        access_token.content = content
        access_token.save()
        return content

    @classmethod
    def authenticate(cls, user, token, purpose, tenant=None):
        access_tokens = AccessToken.objects.filter(content=token, user=user, purpose=purpose.value)
        if len(access_tokens) == 0:
            return False
        if len(access_tokens) > 1:
            raise DataCorruptionException(f"Found duplicate auth token for {user.username}")

        access_token = access_tokens[0]
        now = datetime.utcnow().replace(tzinfo=pytz.UTC)

        if access_token.expire_time < now:
            # token is expired
            return False

        if purpose == AccessToken.Purpose.SIGNUP_VALIDATE:
            return True

        if purpose == AccessToken.Purpose.API_TOKEN:
            if access_token.tenant.id == tenant.id:
                return True
            else:
                return False

        # TODO: validate for other tokens
        raise Exception("Unrecognized purpose")


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
    if len(users) > 1:
        raise DataCorruptionException(f"More than 1 user has name {username}")
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

