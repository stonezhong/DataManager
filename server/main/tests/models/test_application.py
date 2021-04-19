from django.contrib.auth.models import User
from main.models import Tenant, Application

from django.test import TestCase
from django.db.utils import IntegrityError

class ApplicationTestCase(TestCase):
    def setUp(self):
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
        self.tenant.subscribe_user(self.user2)


    def test_uniqueness(self):
        self.tenant.create_application(
            self.user,
            "test-app",
            "test-app-description",
            "admins",
            "s3://data-manager-apps/test/1.0.0.0",
        )
        with self.assertRaises(IntegrityError) as cm:
            self.tenant.create_application(
                self.user2,
                "test-app",
                "test-app-description2",
                "admins2",
                "s3://data-manager-apps/test/1.0.0.1",
            )

        self.assertRegex(cm.exception.args[1], r"^Duplicate entry.*$")


    def test_uniqueness2(self):
        # when we create a tenant, default ExecuteSQL app has been created
        with self.assertRaises(IntegrityError) as cm:
            application = Application(
                tenant=self.tenant,
                name = "test-app2",
                description = "test-app-description2",
                author = self.user2,
                team = "admins2",
                retired = False,
                app_location = "s3://data-manager-apps/test/1.0.0.1",
                sys_app_id = Application.SysAppID.EXECUTE_SQL.value
            )
            application.save()

        self.assertRegex(cm.exception.args[1], r"^Duplicate entry.*$")
