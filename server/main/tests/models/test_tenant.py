from datetime import datetime, timedelta
import pytz
import mock

from django.test import TestCase
from django.core.exceptions import ValidationError, PermissionDenied

from main.models import Tenant, Application, UserTenantSubscription, Dataset, \
    DataRepo, Asset, Pipeline, PipelineGroup, TIME_UNIT_YEAR
from main.api_input import CreateAssetInput
from main.tests.models.tools import create_test_user, create_test_tenant, now_utc

LOC = CreateAssetInput._BriefLocation

class TenantTestCase1(TestCase):
    def setUp(self):
        # simple setup, only a user is created
        self.now = now_utc()
        self.user = create_test_user(name="testuser")


    def test_create(self):
        tenant = Tenant.create(self.user, "datalake name", "datalake description", "{}", False)

        # make sure tenant is created with the right attributes
        self.assertEqual(tenant, Tenant.objects.get(pk=tenant.id))
        self.assertEqual(tenant.name, "datalake name")
        self.assertEqual(tenant.description, "datalake description")
        self.assertEqual(tenant.config, "{}")
        self.assertFalse(tenant.is_public)

        # make sure creator is subscribed as admin
        ut_subscriptions = UserTenantSubscription.objects.filter(
            user=self.user,
            tenant=tenant
        )
        self.assertEqual(len(ut_subscriptions), 1)
        ut_subscription = ut_subscriptions[0]
        self.assertTrue(ut_subscription.is_admin)

        # make sure default application is created
        apps = Application.objects.filter(
            tenant=tenant,
            name="Execute SQL",
        )
        self.assertEqual(len(apps), 1)
        app = apps[0]
        self.assertEqual(app.tenant.id, tenant.id)
        self.assertEqual(app.name, "Execute SQL")
        self.assertEqual(app.description, "System Application for Executing SQL statements")
        self.assertEqual(app.author.id, self.user.id)
        self.assertEqual(app.team, "admins")
        self.assertFalse(app.retired)
        self.assertEqual(app.app_location, "s3://data-manager-apps/execute_sql/1.0.0.0")
        self.assertEqual(app.sys_app_id, Application.SysAppID.EXECUTE_SQL.value)

class TenantTestCase2(TestCase):
    def setUp(self):
        # simple setup, we have a tenant created
        # we have self.user1 subscribed to the tenant as admin
        #         self.user2 not subscribed to the tenant
        #         self.user3 subscribed to the tenant as non-admin
        self.now = now_utc()
        self.user = create_test_user(name="testuser")
        self.tenant = create_test_tenant(
            user=self.user,
            name="DL",

        )
        self.user2 = create_test_user(name='testuser2')
        self.user3 = create_test_user(name='testuser3')
        self.tenant.subscribe_user(self.user3, is_admin=False)

    def test_is_user_subscribed(self):
        self.assertTrue(self.tenant.is_user_subscribed(self.user, admin_only=True))
        self.assertFalse(self.tenant.is_user_subscribed(self.user2, admin_only=True))
        self.assertFalse(self.tenant.is_user_subscribed(self.user3, admin_only=True))
        self.assertTrue(self.tenant.is_user_subscribed(self.user, admin_only=False))
        self.assertFalse(self.tenant.is_user_subscribed(self.user2, admin_only=False))
        self.assertTrue(self.tenant.is_user_subscribed(self.user3, admin_only=False))

    def test_subscribe_user(self):
        # it does not demote user permission
        self.tenant.subscribe_user(self.user, is_admin=False)
        self.assertTrue(
            UserTenantSubscription.objects.filter(
                tenant=self.tenant,
                user=self.user,
            ).all()[0].is_admin
        )

        # still have admin permission if user ask for it
        self.tenant.subscribe_user(self.user, is_admin=True)
        self.assertTrue(
            UserTenantSubscription.objects.filter(
                tenant=self.tenant,
                user=self.user,
            ).all()[0].is_admin
        )

        self.tenant.subscribe_user(self.user2, is_admin=False)
        self.assertFalse(
            UserTenantSubscription.objects.filter(
                tenant=self.tenant,
                user=self.user2,
            ).all()[0].is_admin
        )
        self.tenant.subscribe_user(self.user2, is_admin=True)
        self.assertTrue(
            UserTenantSubscription.objects.filter(
                tenant=self.tenant,
                user=self.user2,
            ).all()[0].is_admin
        )

    @mock.patch('main.models.datetime')
    def test_create_dataset(self, mock_dt):
        mock_dt.utcnow = mock.Mock(return_value=self.now)
        dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1, "test-description", self.user, "test-team"
        )

        # make sure dataset is created with the right attributes
        self.assertEqual(dataset, Dataset.objects.get(pk=dataset.id))
        self.assertEqual(dataset.tenant.id, self.tenant.id)
        self.assertEqual(dataset.name, "test-name")
        self.assertEqual(dataset.major_version, "1.0")
        self.assertEqual(dataset.minor_version, 1)
        self.assertEqual(dataset.publish_time, self.now)
        self.assertEqual(dataset.expiration_time, None)
        self.assertEqual(dataset.description, "test-description")
        self.assertEqual(dataset.author.id, self.user.id)
        self.assertEqual(dataset.team, "test-team")
        self.assertEqual(dataset.schema, "")
        self.assertEqual(dataset.sample_data, "")

    def test_create_dataset_no_permission(self):
        with self.assertRaises(PermissionDenied) as cm:
            self.tenant.create_dataset(
                "test-name", "1.0", 1, "test-description", self.user2, "test-team"
            )
        self.assertEqual(cm.exception.args[0], "User is not subscribed to the tenant")

    def test_get_dataset(self):
        dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1, "test-description", self.user, "test-team"
        )

        dataset_found = self.tenant.get_dataset("test-name", "1.0", 1)
        self.assertEqual(dataset.id, dataset_found.id)

        dataset_found = self.tenant.get_dataset("test-nameX", "1.0", 1)
        self.assertEqual(dataset_found, None)

        dataset_found = self.tenant.get_dataset("test-name", "2.0", 1)
        self.assertEqual(dataset_found, None)

        dataset_found = self.tenant.get_dataset("test-name", "1.0", 2)
        self.assertEqual(dataset_found, None)

    def test_create_application(self):
        application = self.tenant.create_application(
            self.user, "test-app", "test-app-description", "admins", "s3://data-manager-apps/test/1.0.0.0",
        )
        self.assertEqual(application, Application.objects.get(pk=application.id))
        self.assertEqual(application.tenant.id, self.tenant.id)
        self.assertEqual(application.name, "test-app")
        self.assertEqual(application.description, "test-app-description")
        self.assertEqual(application.author.id, self.user.id)
        self.assertEqual(application.team, "admins")
        self.assertFalse(application.retired)
        self.assertEqual(application.app_location, "s3://data-manager-apps/test/1.0.0.0")

    def test_create_application_no_permission(self):
        with self.assertRaises(PermissionDenied) as cm:
            application = self.tenant.create_application(
                self.user2, "test-app", "test-app-description", "admins", "s3://data-manager-apps/test/1.0.0.0",
            )
        self.assertEqual(cm.exception.args[0], "User is not subscribed to the tenant")

    def test_get_application_by_sys_app_id(self):
        execute_sql_app = self.tenant.get_application_by_sys_app_id(
            Application.SysAppID.EXECUTE_SQL
        )
        self.assertIsNotNone(execute_sql_app)
        self.assertEqual(execute_sql_app.tenant.id, self.tenant.id)

    def test_get_application_by_sys_app_id_not_found(self):
        execute_sql_app = self.tenant.get_application_by_sys_app_id(
            Application.SysAppID.EXECUTE_SQL
        )
        execute_sql_app.delete()

        execute_sql_app = self.tenant.get_application_by_sys_app_id(
            Application.SysAppID.EXECUTE_SQL
        )
        self.assertIsNone(execute_sql_app)

    def test_create_data_repo(self):
        data_repo = self.tenant.create_data_repo(
            "data-repo-name", "data-repo-description", DataRepo.RepoType.HDFS, "{}"
        )
        self.assertEqual(data_repo, DataRepo.objects.get(pk=data_repo.id))
        self.assertEqual(data_repo.tenant.id, self.tenant.id)
        self.assertEqual(data_repo.name, "data-repo-name")
        self.assertEqual(data_repo.description, "data-repo-description")
        self.assertEqual(data_repo.type, DataRepo.RepoType.HDFS.value)
        self.assertEqual(data_repo.context, "{}")

    def test_create_timer_without_subscription(self):
        with self.assertRaises(PermissionDenied) as cm:
            self.tenant.create_timer(
                self.user2, "foo", "foo-desc", "admins", True, TIME_UNIT_YEAR, 1,
                self.now, "pipeline", "{}", category="test"
            )
        self.assertEqual(cm.exception.args[0], "User is not subscribed to the tenant")


class TenantTestCase3(TestCase):
    def setUp(self):
        # we have a tenant created
        # we have an application added to the tenant
        # we have a repo added to tenant
        # we have a dataset added to tenant
        # we have an asset added to the dataset
        self.now = now_utc()
        self.user = create_test_user(name='testuser',)
        self.tenant = create_test_tenant(user=self.user, name="datalake name", description="datalake description")
        self.tenant.create_data_repo("main-repo", "data-repo-description", DataRepo.RepoType.HDFS, "{}")
        self.application = self.tenant.create_application(
            self.user, "test-app", "test-app-description", "admins", "s3://data-manager-apps/test/1.0.0.0"
        )
        self.dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1, "test-description", self.user, "test-team"
        )
        self.other_asset = self.dataset.create_asset(
            "asset-other", 10, self.now,
            [
                LOC("parquet", "/data/foo1.parquet", 100, "main-repo"),
                LOC("json", "/data/foo2.json", 150, "main-repo"),
            ],
            loader='{"type": "union"}',
            application=self.application,
            application_args="{}"
        )

    def test_get_data_repo_by_name(self):
        data_repo = self.tenant.create_data_repo(
            "data-repo-name", "data-repo-description", DataRepo.RepoType.HDFS, "{}"
        )

        data_repo_found = self.tenant.get_data_repo_by_name("data-repo-name")
        self.assertEqual(data_repo_found.id, data_repo.id)

        data_repo_found = self.tenant.get_data_repo_by_name("data-repo-nameX")
        self.assertEqual(data_repo_found, None)


    def test_get_asset_revisions_from_path(self):
        # successful case
        ret = self.tenant.get_asset_revisions_from_path("test-name:1.0:1:asset-other")
        self.assertEqual(len(ret), 1)

        # bad asset path
        with self.assertRaises(ValidationError) as cm:
            self.tenant.get_asset_revisions_from_path("foobar")
        self.assertEqual(cm.exception.message, "Invalid asset path")

        # bad asset path
        with self.assertRaises(ValidationError) as cm:
            self.tenant.get_asset_revisions_from_path("test-name:1.0:a:asset-other")
        self.assertEqual(cm.exception.message, "Invalid asset path")

        # dataset not found
        ret = self.tenant.get_asset_revisions_from_path("test-nameX:1.0:1:asset-other")
        self.assertEqual(ret, None)

        # dataset instance not found
        ret = self.tenant.get_asset_revisions_from_path("test-name:1.0:1:asset-otherX")
        self.assertEqual(ret, None)

    def test_get_asset_from_path_deleted(self):
        self.other_asset.soft_delete()
        asset = self.tenant.get_asset_from_path("test-name:1.0:1:asset-other:0")
        self.assertEqual(asset, None)


    def test_get_asset_from_path(self):
        # successful case
        asset = self.tenant.get_asset_from_path("test-name:1.0:1:asset-other:0")
        self.assertEqual(asset.id, self.other_asset.id)

        # bad asset path
        with self.assertRaises(ValidationError) as cm:
            self.tenant.get_asset_from_path("foobar")
        self.assertEqual(cm.exception.message, "Invalid asset path")

        # bad asset path
        with self.assertRaises(ValidationError) as cm:
            self.tenant.get_asset_from_path("test-name:1.0:a:asset-other:0")
        self.assertEqual(cm.exception.message, "Invalid asset path")

        # bad asset path
        with self.assertRaises(ValidationError) as cm:
            self.tenant.get_asset_from_path("test-name:1.0:1:asset-other:a")
        self.assertEqual(cm.exception.message, "Invalid asset path")

        # dataset not found
        asset = self.tenant.get_asset_from_path("test-nameX:1.0:1:asset-other:0")
        self.assertEqual(asset, None)

        # asset not found
        asset = self.tenant.get_asset_from_path("test-name:1.0:1:asset-otherX:0")
        self.assertEqual(asset, None)

        # asset not found
        asset = self.tenant.get_asset_from_path("test-name:1.0:1:asset-other:1")
        self.assertEqual(asset, None)


class TenantTestCase4(TestCase):
    def setUp(self):
        # we have a tenant created
        # we have a pipeline created
        self.now = now_utc()
        self.user = create_test_user(name='testuser')
        self.tenant = create_test_tenant(user=self.user)

    def test_create_pipeline(self):
        pipeline = self.tenant.create_pipeline(
            self.user, "foo-pipeline", "foo-pipeline-description",
            "admins", "test-category", "{}"
        )

        # make sure dataset is created with the right attributes
        self.assertEqual(pipeline, Pipeline.objects.get(pk=pipeline.id))
        self.assertEqual(pipeline.tenant.id, self.tenant.id)
        self.assertEqual(pipeline.name, "foo-pipeline")
        self.assertEqual(pipeline.description, "foo-pipeline-description")
        self.assertEqual(pipeline.author.id, self.user.id)
        self.assertEqual(pipeline.team, "admins")
        self.assertFalse(pipeline.retired)
        self.assertEqual(pipeline.category, "test-category")
        self.assertEqual(pipeline.context, "{}")
        self.assertTrue(pipeline.paused)
        self.assertEqual(pipeline.version, 1)
        self.assertEqual(pipeline.dag_version, 0)

    def test_create_pipeline_no_permission(self):
        # user2 is not subscribed to the tenant
        user2 = create_test_user(name="testuser2")
        with self.assertRaises(PermissionDenied) as cm:
            pipeline = self.tenant.create_pipeline(
                user2, "foo-pipeline", "foo-pipeline-description",
                "admins", "test-category", "{}"
            )
        self.assertEqual(cm.exception.args[0], "User is not subscribed to the tenant")


    def test_get_active_pipelines(self):
        pipeline1 = self.tenant.create_pipeline(
            self.user, "foo-pipeline1", "foo-pipeline1-description",
            "admins", "test-category", "{}"
        )
        pipeline2 = self.tenant.create_pipeline(
            self.user, "foo-pipeline2", "foo-pipeline2-description",
            "admins", "test-category", "{}"
        )
        pipeline1.retired=True
        pipeline1.save()

        pipelines = self.tenant.get_active_pipelines()
        self.assertEqual(len(pipelines), 1)
        self.assertEqual(pipelines[0].id, pipeline2.id)

    @mock.patch('main.models.datetime')
    def test_create_pipeline_group(self, mock_dt):
        due = self.now + timedelta(days=1)
        mock_dt.utcnow = mock.Mock(return_value=self.now)

        pipeline = self.tenant.create_pipeline(
            self.user, "foo-pipeline", "description", "team", "category", "{}"
        )
        pg = self.tenant.create_pipeline_group(
            "foo-pipeline-group", "category", '{"x": 1}', due=due
        )
        self.assertEqual(pg, PipelineGroup.objects.get(pk=pg.id))
        self.assertEqual(pg.tenant.id, self.tenant.id)
        self.assertEqual(pg.name, "foo-pipeline-group")
        self.assertEqual(pg.created_time, self.now)
        self.assertEqual(pg.category, "category")
        self.assertEqual(pg.context, '{"x": 1}')
        self.assertFalse(pg.finished)
        self.assertEqual(pg.due, due)

