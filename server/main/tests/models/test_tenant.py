from django.contrib.auth.models import User
from main.models import Tenant, Application, UserTenantSubscription, Dataset, DataRepo, Asset
from datetime import datetime, timedelta
import pytz

from django.test import TestCase
from django.core.exceptions import ValidationError, PermissionDenied

from main.api_input import CreateAssetInput

class TenantTestCase1(TestCase):
    def setUp(self):
        # simple setup, only a user is created
        self.now = datetime.utcnow().replace(tzinfo=pytz.UTC)
        self.user = User.objects.create_user(
            username='testuser',
            password='12345'
        )


    def test_create(self):
        tenant = Tenant.create(
            self.user,
            "datalake name",
            "datalake description",
            "{}",
            False
        )

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
        self.now = datetime.utcnow().replace(tzinfo=pytz.UTC)
        self.user = User.objects.create_user(
            username='testuser',
            password='12345'
        )
        self.tenant = Tenant.create(
            self.user,
            "datalake name",
            "datalake description",
            "{}",
            False
        )
        self.user2 = User.objects.create_user(
            username='testuser2',
            password='12345'
        )
        self.user3 = User.objects.create_user(
            username='testuser3',
            password='12345'
        )
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

    def test_create_dataset(self):
        dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1,
            self.now,
            "test-description",
            self.user,
            "test-team"
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
                "test-name", "1.0", 1,
                self.now,
                "test-description",
                self.user2,
                "test-team"
            )
        self.assertEqual(cm.exception.args[0], "User is not subscribed to the tenant")

    def test_get_dataset(self):
        dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1,
            self.now,
            "test-description",
            self.user,
            "test-team"
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
            self.user,
            "test-app",
            "test-app-description",
            "admins",
            "s3://data-manager-apps/test/1.0.0.0",
        )
        self.assertEqual(application, Application.objects.get(pk=application.id))
        self.assertEqual(application.tenant.id, self.tenant.id)
        self.assertEqual(application.name, "test-app")
        self.assertEqual(application.description, "test-app-description")
        self.assertEqual(application.author.id, self.user.id)
        self.assertEqual(application.team, "admins")
        self.assertFalse(application.retired)
        self.assertEqual(application.app_location, "s3://data-manager-apps/test/1.0.0.0")

    def test_get_application_by_sys_app_id(self):
        execute_sql_app = self.tenant.get_application_by_sys_app_id(
            Application.SysAppID.EXECUTE_SQL
        )
        self.assertIsNotNone(execute_sql_app)
        self.assertEqual(execute_sql_app.tenant.id, self.tenant.id)

    def test_create_data_repo(self):
        data_repo = self.tenant.create_data_repo(
            "data-repo-name",
            "data-repo-description",
            DataRepo.RepoType.HDFS,
            "{}"
        )
        self.assertEqual(data_repo, DataRepo.objects.get(pk=data_repo.id))
        self.assertEqual(data_repo.tenant.id, self.tenant.id)
        self.assertEqual(data_repo.name, "data-repo-name")
        self.assertEqual(data_repo.description, "data-repo-description")
        self.assertEqual(data_repo.type, DataRepo.RepoType.HDFS.value)
        self.assertEqual(data_repo.context, "{}")


class TenantTestCase3(TestCase):
    def setUp(self):
        # we have a tenant created
        # we have an application added to the tenant
        # we have a repo added to tenant
        # we have a dataset added to tenant
        # we have an asset added to the dataset
        self.now = datetime.utcnow().replace(tzinfo=pytz.UTC)
        self.user = User.objects.create_user(
            username='testuser',
            password='12345'
        )
        self.tenant = Tenant.create(
            self.user,
            "datalake name",
            "datalake description",
            "{}",
            False
        )
        self.tenant.create_data_repo(
            "main-repo",
            "data-repo-description",
            DataRepo.RepoType.HDFS,
            "{}"
        )
        self.application = self.tenant.create_application(
            self.user,
            "test-app",
            "test-app-description",
            "admins",
            "s3://data-manager-apps/test/1.0.0.0",
        )
        self.dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1,
            self.now,
            "test-description",
            self.user,
            "test-team"
        )
        self.other_asset = self.dataset.create_asset(
            "asset-other", 10,
            self.now,
            self.now,
            [
                CreateAssetInput._BriefLocation(
                    "parquet", "/data/foo1.parquet", 100, "main-repo"
                ),
                CreateAssetInput._BriefLocation(
                    "json", "/data/foo2.json", 150, "main-repo"
                ),
            ],
            loader='{"type": "union"}',
            application=self.application,
            application_args="{}"
        )

    def test_get_data_repo_by_name(self):
        data_repo = self.tenant.create_data_repo(
            "data-repo-name",
            "data-repo-description",
            DataRepo.RepoType.HDFS,
            "{}"
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
        self.assertEqual(
            cm.exception.args[0],
            "Invalid asset path"
        )

        # bad asset path
        with self.assertRaises(ValidationError) as cm:
            self.tenant.get_asset_revisions_from_path("test-name:1.0:a:asset-other")
        self.assertEqual(
            cm.exception.args[0],
            "Invalid asset path"
        )

        # dataset not found
        ret = self.tenant.get_asset_revisions_from_path("test-nameX:1.0:0:asset-other")
        self.assertEqual(ret, None)

        # dataset instance not found
        ret = self.tenant.get_asset_revisions_from_path("test-name:1.0:0:asset-otherX")
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
        self.assertEqual(cm.exception.args[0], "Invalid asset path")

        # bad asset path
        with self.assertRaises(ValidationError) as cm:
            self.tenant.get_asset_from_path("test-name:1.0:a:asset-other:0")
        self.assertEqual(cm.exception.args[0], "Invalid asset path")

        # bad asset path
        with self.assertRaises(ValidationError) as cm:
            self.tenant.get_asset_from_path("test-name:1.0:1:asset-other:a")
        self.assertEqual(cm.exception.args[0], "Invalid asset path")

        # dataset not found
        asset = self.tenant.get_asset_from_path("test-nameX:1.0:1:asset-other:0")
        self.assertEqual(asset, None)

        # asset not found
        asset = self.tenant.get_asset_from_path("test-name:1.0:1:asset-otherX:0")
        self.assertEqual(asset, None)

        # asset not found
        asset = self.tenant.get_asset_from_path("test-name:1.0:1:asset-other:1")
        self.assertEqual(asset, None)

