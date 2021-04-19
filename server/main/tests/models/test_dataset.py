from django.contrib.auth.models import User
from main.models import Tenant, Dataset, Asset
from datetime import datetime, timedelta
import mock

import pytz

from django.test import TestCase
from django.db.utils import IntegrityError
from django.core.exceptions import ValidationError, PermissionDenied

from main.api_input import CreateAssetInput

class DatasetTestCase(TestCase):
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
        self.user2 = User.objects.create_user(
            username='testuser2',
            password='12345'
        )
        self.tenant.subscribe_user(self.user2)


    def test_uniqueness(self):
        self.tenant.create_dataset(
            "test-name", "1.0", 1,
            self.now,
            "test-description1",
            self.user,
            "test-team1"
        )

        with self.assertRaises(IntegrityError) as cm:
            self.tenant.create_dataset(
                "test-name", "1.0", 1,
                self.now + timedelta(hours=1),
                "test-description2",
                self.user2,
                "test-team2"
            )
        self.assertRegex(cm.exception.args[1], r"^Duplicate entry.*$")

    def test_is_active_at(self):
        dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1,
            self.now,
            "test-description",
            self.user,
            "test-team"
        )
        self.assertTrue(dataset.is_active_at(self.now - timedelta(hours=1)))
        self.assertTrue(dataset.is_active_at(self.now))
        self.assertTrue(dataset.is_active_at(self.now + timedelta(hours=1)))

        dataset.expiration_time = self.now + timedelta(hours=2)
        dataset.save()
        self.assertTrue(dataset.is_active_at(self.now - timedelta(hours=1)))
        self.assertTrue(dataset.is_active_at(self.now))
        self.assertTrue(dataset.is_active_at(self.now + timedelta(hours=1)))
        self.assertFalse(dataset.is_active_at(self.now + timedelta(hours=2)))
        self.assertFalse(dataset.is_active_at(self.now + timedelta(hours=3)))

    def test_get_assets(self):
        dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1,
            self.now,
            "test-description",
            self.user,
            "test-team"
        )

        asset1 = dataset.create_asset(
            "asset1", 10,
            self.now,
            self.now,
            [
                CreateAssetInput._BriefLocation(
                    "parquet", "/data/foo1.parquet", 100, None
                ),
            ],
        )
        asset2 = dataset.create_asset(
            "asset2", 10,
            self.now,
            self.now + timedelta(hours=1),
            [
                CreateAssetInput._BriefLocation(
                    "parquet", "/data/foo2.parquet", 100, None
                ),
            ],
        )
        asset2.soft_delete()

        asset3 = dataset.create_asset(
            "asset3", 10,
            self.now,
            self.now + timedelta(hours=2),
            [
                CreateAssetInput._BriefLocation(
                    "parquet", "/data/foo3.parquet", 100, None
                ),
            ],
        )

        assets = dataset.get_assets()
        self.assertEqual(len(assets), 2)
        self.assertEqual(assets[0].id, asset3.id)
        self.assertEqual(assets[1].id, asset1.id)


    def test_get_asset_by_name(self):
        dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1,
            self.now,
            "test-description",
            self.user,
            "test-team"
        )

        asset = dataset.create_asset(
            "asset", 10,
            self.now,
            self.now,
            [
                CreateAssetInput._BriefLocation(
                    "parquet", "/data/foo1.parquet", 100, None
                ),
            ],
        )

        self.assertEqual(
            dataset.get_asset_by_name("asset").id,
            asset.id
        )

    def test_get_asset_by_name_deleted1(self):
        dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1,
            self.now,
            "test-description",
            self.user,
            "test-team"
        )

        asset1 = dataset.create_asset(
            "asset", 10,
            self.now,
            self.now,
            [
                CreateAssetInput._BriefLocation(
                    "parquet", "/data/foo1.parquet", 100, None
                ),
            ],
        )
        asset2 = dataset.create_asset(
            "asset", 10,
            self.now,
            self.now,
            [
                CreateAssetInput._BriefLocation(
                    "parquet", "/data/foo1.parquet", 100, None
                ),
            ],
        )

        self.assertEqual(
            dataset.get_asset_by_name("asset").id,
            asset2.id
        )

    def test_get_asset_by_name_deleted2(self):
        dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1,
            self.now,
            "test-description",
            self.user,
            "test-team"
        )

        asset1 = dataset.create_asset(
            "asset", 10,
            self.now,
            self.now,
            [
                CreateAssetInput._BriefLocation(
                    "parquet", "/data/foo1.parquet", 100, None
                ),
            ],
        )
        asset1.soft_delete()

        self.assertEqual(
            dataset.get_asset_by_name("asset"),
            None
        )

    def set_schema_and_sample_data(self):
        ds = Dataset.create(
            self.tenant,
            "test-name", "1.0", 1,
            self.now,
            "test-description",
            self.user,
            "test-team"
        )

        # You cannot set schema to None or empty string
        with self.assertRaises(ValidationError) as cm:
            ds.set_schema_and_sample_data(
                None, "{}"
            )
        self.assertEquals(cm.exception.message, "schema missing")

        with self.assertRaises(ValidationError) as cm:
            ds.set_schema_and_sample_data(
                "", "{}"
            )
        self.assertEquals(cm.exception.message, "schema missing")


        # We should be able to set schema successfully
        schema = '{"fields":[{"metadata":{},"name":"x","nullable":true,"type":"long"},{"metadata":{},"name":"y","nullable":true,"type":"long"}],"type":"struct"}'
        ds.set_schema_and_sample_data(
            schema, '{"x": 1, "y": 2}'
        )
        self.assertEqual(ds.schema, schema)
        self.assertEqual(ds.sample_data, '{"x": 1, "y": 2}')

        # We should be able to change sample data if we keep the schema the same
        ds.set_schema_and_sample_data(
            schema, '{"x": 2, "y": 3}'
        )
        self.assertEqual(ds.schema, schema)
        self.assertEqual(ds.sample_data, '{"x": 2, "y": 3}')

        # We cannot change schema
        schema2 = '{"fields":[{"metadata":{},"name":"z","nullable":true,"type":"long"},{"metadata":{},"name":"y","nullable":true,"type":"long"}],"type":"struct"}'
        with self.assertRaises(ValidationError) as cm:
            ds.set_schema_and_sample_data(
                schema2, "{}"
            )
        self.assertEquals(cm.exception.message, "cannot change schema")






class DatasetAssetTestCase(TestCase):
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

    def test_create_asset_expired(self):
        # Try to add asset to a dataset outside it life range
        self.dataset.expiration_time = self.now + timedelta(hours=1)
        self.ds.save()
        with self.assertRaises(ValidationError) as cm:
            self.dataset.create_asset(
                "asset-name", 10,
                self.now,
                self.now + timedelta(hours=1),
                [],
            )
        self.assertEqual(cm.exception.args[0], "Dataset is not active")

    def test_create_asset_bad_application(self):
        # Try to create asset and claim it is created by an application not belong
        # to the dataset's tenant
        tenant2 = Tenant.create(
            self.user,
            "datalake name2",
            "datalake description",
            "{}",
            False
        )
        application = tenant2.create_application(
            self.user, "fooapp", "fooapp description", "admin", "s3://bucket/name"
        )
        with self.assertRaises(ValidationError) as cm:
            self.dataset.create_asset(
                "asset-name", 10,
                self.now,
                self.now,
                [ ],
                application=application
            )
        self.assertEqual(cm.exception.args[0], "Application not in the tenant")

    def test_create_asset_no_locations(self):
        # Try to add asset to a dataset outside it life range
        with self.assertRaises(ValidationError) as cm:
            self.dataset.create_asset(
                "asset-name", 10,
                self.now,
                self.now,
                [],
            )
        self.assertEqual(cm.exception.args[0], "No location specified")

    def test_create_asset_bad_repo_name(self):
        # Try to create asset which points to location in non-exist repo name
        with self.assertRaises(ValidationError) as cm:
            self.dataset.create_asset(
                "asset-name", 10,
                self.now,
                self.now,
                [
                    CreateAssetInput._BriefLocation(
                        "parquet", "hdfs://data/foo.parquet", 100, "main-repo2"
                    )
                ],
            )
        self.assertEqual(cm.exception.args[0], "Invalid repo name")

    def test_create_asset_bad_dependency(self):
        # Try to create asset which we tell it depend on asset whose path does not exist
        with self.assertRaises(ValidationError) as cm:
            self.dataset.create_asset(
                "asset-name", 10,
                self.now,
                self.now,
                [
                    CreateAssetInput._BriefLocation(
                        "parquet", "hdfs://data/foo.parquet", 100, "main-repo"
                    )
                ],
                src_dsi_paths=[
                    "test-name:1.0:1:/asset-other1:0"   # bad asset path
                ]
            )
        self.assertEqual(cm.exception.args[0], "Source asset does not exist")

    def test_create_asset_first_revision(self):
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

        # make sure asset is created with the right attributes
        self.assertEqual(asset, Asset.objects.get(pk=asset.id))
        self.assertEqual(asset.tenant.id, self.ds.tenant.id)
        self.assertEqual(asset.dataset.id, self.ds.id)
        self.assertEqual(asset.name, "asset-name")
        self.assertEqual(asset.publish_time, self.now)
        self.assertEqual(asset.data_time, self.now)
        self.assertEqual(asset.deleted_time, None)
        self.assertEqual(asset.revision, 0)
        self.assertEqual(asset.row_count, 10)
        self.assertEqual(asset.loader, '{"type": "union"}')
        self.assertEqual(asset.application.id, self.application.id)
        self.assertEqual(asset.application_args, "{}")

        locations = [location for location in asset.locations.all()]
        locations.sort(key=lambda loc: loc.offset)
        self.assertEqual(len(locations), 2)

        location0 = locations[0]
        self.assertEqual(location0.tenant.id, self.ds.tenant.id)
        self.assertEqual(location0.asset.id, asset.id)
        self.assertEqual(location0.type, "parquet")
        self.assertEqual(location0.repo.id, self.data_repo.id)
        self.assertEqual(location0.location, "/data/foo1.parquet")
        self.assertEqual(location0.offset, 0)
        self.assertEqual(location0.size, 100)

        location1 = locations[1]
        self.assertEqual(location1.tenant.id, self.ds.tenant.id)
        self.assertEqual(location1.asset.id, asset.id)
        self.assertEqual(location1.type, "json")
        self.assertEqual(location1.repo.id, self.data_repo.id)
        self.assertEqual(location1.location, "/data/foo2.json")
        self.assertEqual(location1.offset, 1)
        self.assertEqual(location1.size, 150)

    def test_create_asset_second_revision_before_first_revision(self):
        # try to re-publish asset, while the 2nd publish's publish time is
        # before 1st publish time, the operation should fail
        self.dataset.create_asset(
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
            Asset.create(
                self.ds,
                "asset-name", 10,
                self.now - timedelta(minutes=1),
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

        self.assertEqual(cm.exception.args[0], "Publish time is too early")

    def test_create_asset_second_revision_before_first_revision2(self):
        # try to re-publish asset, while the 2nd publish time is
        # before 1st deleted time, the operation should fail
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
        asset.deleted_time = self.now + timedelta(hours=1)
        asset.save()

        with self.assertRaises(ValidationError) as cm:
            self.dataset.create_asset(
                "asset-name", 10,
                self.now + timedelta(minutes=30),
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

        self.assertEqual(cm.exception.args[0], "Publish time is too early")

    def test_create_asset_second_revision_first_deleted(self):
        # try to re-publish asset, while latest revision is already deleted
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
        asset.deleted_time = self.now + timedelta(hours=1)
        asset.save()

        asset2 = self.dataset.create_asset(
            "asset-name", 10,
            self.now + timedelta(hours=2),
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

        # make sure the new asset has the right attributes,
        # especially revision should be bumped to 1
        self.assertEqual(asset2, Asset.objects.get(pk=asset2.id))
        self.assertEqual(asset2.tenant.id, self.ds.tenant.id)
        self.assertEqual(asset2.dataset.id, self.ds.id)
        self.assertEqual(asset2.name, "asset-name")
        self.assertEqual(asset2.publish_time, self.now+timedelta(hours=2))
        self.assertEqual(asset2.data_time, self.now)
        self.assertEqual(asset2.deleted_time, None)
        self.assertEqual(asset2.revision, 1)
        self.assertEqual(asset2.row_count, 10)
        self.assertEqual(asset2.loader, '{"type": "union"}')
        self.assertEqual(asset2.application.id, self.application.id)
        self.assertEqual(asset2.application_args, "{}")


    def test_create_asset_second_revision_first_alive(self):
        # try to re-publish asset, while latest revision is alive
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

        asset2 = self.dataset.create_asset(
            "asset-name", 10,
            self.now + timedelta(hours=2),
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

        # make sure the latest revision is deleted
        asset.refresh_from_db(fields=['deleted_time'])
        self.assertEqual(asset.deleted_time, self.now+timedelta(hours=2))

        # make sure the new asset has the right attributes,
        # especially revision should be bumped to 1
        self.assertEqual(asset2, Asset.objects.get(pk=asset2.id))
        self.assertEqual(asset2.tenant.id, self.ds.tenant.id)
        self.assertEqual(asset2.dataset.id, self.ds.id)
        self.assertEqual(asset2.name, "asset-name")
        self.assertEqual(asset2.publish_time, self.now+timedelta(hours=2))
        self.assertEqual(asset2.data_time, self.now)
        self.assertEqual(asset2.deleted_time, None)
        self.assertEqual(asset2.revision, 1)
        self.assertEqual(asset2.row_count, 10)
        self.assertEqual(asset2.loader, '{"type": "union"}')
        self.assertEqual(asset2.application.id, self.application.id)
        self.assertEqual(asset2.application_args, "{}")

