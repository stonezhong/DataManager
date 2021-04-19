from django.contrib.auth.models import User
from main.models import Tenant, AssetDep, DataRepo
from datetime import datetime, timedelta
import pytz

from django.test import TestCase
from django.db.utils import IntegrityError

from main.api_input import CreateAssetInput

class AssetDepTestCase(TestCase):
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
        self.asset = self.dataset.create_asset(
            "asset-name", 10,
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
            src_dsi_paths=[
                "test-name:1.0:1:asset-other:0"   # bad asset path
            ],
            application=self.application,
            application_args="{}"
        )



    def test_uniqueness(self):
        with self.assertRaises(IntegrityError) as cm:
            # self.other_asset --> self.asset, already tracked
            # adding new one should cause dup row
            asset_dep1 = AssetDep(
                tenant=self.tenant,
                src_dsi=self.other_asset,
                dst_dsi=self.asset,
            )
            asset_dep1.save()
        self.assertRegex(cm.exception.args[1], r"^Duplicate entry.*$")

