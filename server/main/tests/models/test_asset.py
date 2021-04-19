from django.contrib.auth.models import User
from main.models import Tenant, Dataset, Asset, DataRepo, Application
from datetime import datetime, timedelta
import mock

import pytz

from django.test import TestCase
from django.db.utils import IntegrityError
from django.core.exceptions import ValidationError

from main.api_input import CreateAssetInput

class AssetTestCase(TestCase):
    def setUp(self):
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
        self.dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1,
            self.now,
            "test-description",
            self.user,
            "test-team"
        )
        self.data_repo = self.tenant.create_data_repo(
            "main-repo",
            "data-repo-description",
            DataRepo.RepoType.HDFS,
            "{}"
        )
        self.application = self.tenant.create_application(
            self.user,
            "demoapp", "demoapp description", "admin", "s3://bucket/demoapp"
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


    @mock.patch('main.models.datetime')
    def test_soft_delete_alive(self, mock_dt):
        # try to soft-delete an asset, while the asset is alive
        asset = self.dataset.create_asset(
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
        mock_dt.utcnow = mock.Mock(return_value=self.now + timedelta(hours=1))
        asset.soft_delete()
        asset.refresh_from_db()
        self.assertEqual(asset.deleted_time, self.now + timedelta(hours=1))



    def test_soft_delete_with_dependency(self):
        # try to soft-delete an asset, while the asset is alive and has dependency
        # it should fail
        asset = self.dataset.create_asset(
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


        with self.assertRaises(ValidationError) as cm:
            self.other_asset.soft_delete()
        self.assertEqual(
            cm.exception.args[0],
            "Cannot delete an asset while there are other asset depend on it"
        )


    def test_asset_dependency(self):
        asset = self.dataset.create_asset(
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

        self.assertEqual(asset.src_assets, ["test-name:1.0:1:asset-other:0"])
        self.assertEqual(asset.dst_assets, [])

        self.assertEqual(self.other_asset.src_assets, [])
        self.assertEqual(self.other_asset.dst_assets, ["test-name:1.0:1:asset-name:0"])

    def test_uniqueness(self):
        asset1 = Asset(
            tenant=self.tenant,
            dataset=self.dataset,
            name="foo",
            publish_time = datetime(2021, 1, 1).replace(tzinfo=pytz.UTC),
            data_time = datetime(2021, 1, 1).replace(tzinfo=pytz.UTC),
            revision = 0,
        )
        asset1.save()


        with self.assertRaises(IntegrityError) as cm:
            asset2 = Asset(
                tenant=self.tenant,
                dataset=self.dataset,
                name="foo",
                publish_time = datetime(2021, 1, 2).replace(tzinfo=pytz.UTC),
                data_time = datetime(2021, 1, 2).replace(tzinfo=pytz.UTC),
                revision = 0,
            )
            asset2.save()
        self.assertRegex(cm.exception.args[1], r"^Duplicate entry.*$")

