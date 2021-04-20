from datetime import datetime, timedelta
import pytz

from django.test import TestCase
from django.db.utils import IntegrityError

from main.models import Tenant, DataRepo, DataLocation
from main.api_input import CreateAssetInput
from main.tests.models.tools import create_test_user, create_test_tenant, now_utc

LOC = CreateAssetInput._BriefLocation

class DataLocationTestCase(TestCase):
    def setUp(self):
        # we have a tenant created
        # we have an application added to the tenant
        # we have a repo added to tenant
        # we have a dataset added to tenant
        # we have an asset added to the dataset
        self.now = now_utc()
        self.user = create_test_user(name='testuser')
        self.tenant = create_test_tenant(user=self.user)
        self.tenant.create_data_repo(
            "main-repo", "data-repo-description", DataRepo.RepoType.HDFS, "{}"
        )
        self.application = self.tenant.create_application(
            self.user, "test-app", "test-app-description", "admins", "s3://data-manager-apps/test/1.0.0.0",
        )
        self.dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1, self.now, "test-description", self.user, "test-team"
        )
        self.other_asset = self.dataset.create_asset(
            "asset-other", 10, self.now, self.now,
            [
                LOC("parquet", "/data/foo1.parquet", 100, "main-repo"),
                LOC("json", "/data/foo2.json", 150, "main-repo"),
            ],
            loader='{"type": "union"}',
            application=self.application,
            application_args="{}"
        )


    def test_uniqueness(self):
        with self.assertRaises(IntegrityError) as cm:
            data_location = DataLocation(
                tenant=self.tenant,
                asset=self.other_asset,
                type="parquet",
                location="foo",
                offset=0,
                size=10
            )
            data_location.save()
        self.assertRegex(cm.exception.args[1], r"^Duplicate entry.*$")

