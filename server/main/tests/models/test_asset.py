from datetime import datetime, timedelta
import pytz
import mock

from django.contrib.auth.models import User
from django.test import TestCase
from django.db.utils import IntegrityError
from django.core.exceptions import ValidationError

from main.models import Tenant, Dataset, Asset, DataRepo, Application
from main.api_input import CreateAssetInput
from main.tests.models.tools import create_test_user, create_test_tenant, now_utc

LOC = CreateAssetInput._BriefLocation

class AssetTestCase(TestCase):
    def setUp(self):
        self.now = now_utc()
        self.user = create_test_user(name='testuser')
        self.tenant = create_test_tenant(user=self.user, name="DL")
        self.dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1, self.now, "test-description", self.user, "test-team"
        )
        self.data_repo = self.tenant.create_data_repo(
            "main-repo", "data-repo-description", DataRepo.RepoType.HDFS, "{}"
        )
        self.application = self.tenant.create_application(
            self.user, "demoapp", "demoapp description", "admin", "s3://bucket/demoapp"
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


    @mock.patch('main.models.datetime')
    def test_soft_delete_alive(self, mock_dt):
        # try to soft-delete an asset, while the asset is alive
        asset = self.dataset.create_asset(
            "asset-name", 10, self.now, self.now,
            [
                LOC("parquet", "/data/foo1.parquet", 100, "main-repo"),
                LOC("json", "/data/foo2.json", 150, "main-repo"),
            ],
            loader='{"type": "union"}',
            src_dsi_paths=["test-name:1.0:1:asset-other:0"],
            application=self.application,
            application_args="{}"
        )
        mock_dt.utcnow = mock.Mock(return_value=self.now + timedelta(hours=1))
        asset.soft_delete()
        asset.refresh_from_db()
        self.assertEqual(asset.deleted_time, self.now + timedelta(hours=1))

        # now let's try to delete it again
        mock_dt.utcnow = mock.Mock(return_value=self.now + timedelta(hours=2))
        asset.soft_delete()
        asset.refresh_from_db()
        # deleted_time should not change
        self.assertEqual(asset.deleted_time, self.now + timedelta(hours=1))


    def test_soft_delete_with_dependency(self):
        # try to soft-delete an asset, while the asset is alive and has dependency
        # it should fail
        asset = self.dataset.create_asset(
            "asset-name", 10, self.now, self.now,
            [
                LOC("parquet", "/data/foo1.parquet", 100, "main-repo"),
                LOC("json", "/data/foo2.json", 150, "main-repo"),
            ],
            loader='{"type": "union"}',
            src_dsi_paths=["test-name:1.0:1:asset-other:0"],
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
            "asset-name", 10, self.now, self.now,
            [
                LOC("parquet", "/data/foo1.parquet", 100, "main-repo"),
                LOC("json", "/data/foo2.json", 150, "main-repo"),
            ],
            loader='{"type": "union"}',
            src_dsi_paths=["test-name:1.0:1:asset-other:0"],
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
