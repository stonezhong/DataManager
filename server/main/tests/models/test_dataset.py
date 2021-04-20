from datetime import datetime, timedelta
import pytz

from django.test import TestCase
from django.db.utils import IntegrityError
from django.core.exceptions import ValidationError, PermissionDenied

from main.models import Tenant, Dataset, Asset, DataRepo
from main.api_input import CreateAssetInput
from main.tests.models.tools import create_test_user, create_tenant, now_utc

LOC = CreateAssetInput._BriefLocation

class DatasetTestCase(TestCase):
    def setUp(self):
        self.now = now_utc()
        self.user = create_test_user(name="testuser")
        self.user2 = create_test_user(name="testuser2")
        self.tenant = create_tenant(
            user=self.user, name="datalake name", description="datalake description"
        )
        self.tenant.subscribe_user(self.user2)


    def test_uniqueness(self):
        # tenant + name + major_version + minor_version should be unique
        self.tenant.create_dataset(
            "test-name", "1.0", 1, self.now,
            "test-description1", self.user, "test-team1"
        )

        with self.assertRaises(IntegrityError) as cm:
            self.tenant.create_dataset(
                "test-name", "1.0", 1, self.now + timedelta(hours=1),
                "test-description2", self.user2, "test-team2"
            )
        self.assertRegex(cm.exception.args[1], r"^Duplicate entry.*$")


    def test_is_active_at(self):
        dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1, self.now,
            "test-description", self.user, "test-team"
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
            "test-name", "1.0", 1, self.now,
            "test-description", self.user, "test-team"
        )

        asset1 = dataset.create_asset(
            "asset1", 10, self.now, self.now,
            [ LOC("parquet", "/data/foo1.parquet", 100, None) ],
        )
        asset2 = dataset.create_asset(
            "asset2", 10, self.now, self.now + timedelta(hours=1),
            [ LOC("parquet", "/data/foo2.parquet", 100, None) ],
        )
        asset2.soft_delete()

        asset3 = dataset.create_asset(
            "asset3", 10, self.now, self.now + timedelta(hours=2),
            [ LOC("parquet", "/data/foo3.parquet", 100, None) ],
        )

        assets = dataset.get_assets()
        self.assertEqual(len(assets), 2)
        self.assertEqual(assets[0].id, asset3.id)
        self.assertEqual(assets[1].id, asset1.id)


    def test_get_asset_by_name(self):
        dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1, self.now,
            "test-description", self.user, "test-team"
        )
        asset = dataset.create_asset(
            "asset", 10, self.now, self.now,
            [ LOC("parquet", "/data/foo1.parquet", 100, None) ],
        )
        self.assertEqual(dataset.get_asset_by_name("asset").id, asset.id)

    def test_get_asset_by_name_deleted1(self):
        dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1, self.now,
            "test-description", self.user, "test-team"
        )
        asset1 = dataset.create_asset(
            "asset", 10, self.now, self.now,
            [ LOC("parquet", "/data/foo1.parquet", 100, None) ],
        )
        asset2 = dataset.create_asset(
            "asset", 10, self.now, self.now,
            [ LOC("parquet", "/data/foo1.parquet", 100, None) ],
        )
        # asset2 is a re-publish of asset1
        self.assertEqual(dataset.get_asset_by_name("asset").id, asset2.id)

    def test_get_asset_by_name_deleted2(self):
        dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1, self.now,
            "test-description", self.user, "test-team"
        )
        asset1 = dataset.create_asset(
            "asset", 10, self.now, self.now,
            [ LOC("parquet", "/data/foo1.parquet", 100, None) ],
        )
        asset1.soft_delete()
        self.assertEqual(dataset.get_asset_by_name("asset"), None)

    def test_set_schema_and_sample_data(self):
        dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1, self.now,
            "test-description", self.user, "test-team"
        )

        # We should be able to set schema successfully
        schema = '{"fields":[{"metadata":{},"name":"x","nullable":true,"type":"long"},{"metadata":{},"name":"y","nullable":true,"type":"long"}],"type":"struct"}'
        dataset.set_schema_and_sample_data(schema, '{"x": 1, "y": 2}')
        self.assertEqual(dataset.schema, schema)
        self.assertEqual(dataset.sample_data, '{"x": 1, "y": 2}')

        # We should be able to change sample data if we keep the schema the same
        dataset.set_schema_and_sample_data(schema, '{"x": 2, "y": 3}')
        self.assertEqual(dataset.schema, schema)
        self.assertEqual(dataset.sample_data, '{"x": 2, "y": 3}')

        # We cannot change schema
        schema2 = '{"fields":[{"metadata":{},"name":"z","nullable":true,"type":"long"},{"metadata":{},"name":"y","nullable":true,"type":"long"}],"type":"struct"}'
        with self.assertRaises(ValidationError) as cm:
            dataset.set_schema_and_sample_data(schema2, "{}")
        self.assertEquals(cm.exception.message, "cannot change schema")


    def test_set_schema_and_sample_data_no_schema(self):
        dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1, self.now,
            "test-description", self.user, "test-team"
        )

        for schema in [None, '']:
            with self.assertRaises(ValidationError) as cm:
                dataset.set_schema_and_sample_data(schema, "{}")
            self.assertEquals(cm.exception.message, "schema missing")


class DatasetAssetTestCase(TestCase):
    def setUp(self):
        self.now = now_utc()
        self.user = create_test_user(name="testuser")
        self.tenant = create_tenant(
            user=self.user,
            name="datalake name",
            description="datalake description"
        )

        self.dataset = self.tenant.create_dataset(
            "test-name", "1.0", 1, self.now,
            "test-description", self.user, "test-team"
        )
        self.data_repo = self.tenant.create_data_repo(
            "main-repo", "data-repo-description", DataRepo.RepoType.HDFS, "{}"
        )
        self.application = self.tenant.create_application(self.user,
            "demoapp", "demoapp description", "admin", "s3://bucket/demoapp"
        )
        self.other_asset = self.dataset.create_asset(
            "asset-other", 10, self.now, self.now,
            [
                LOC("parquet", "/data/foo1.parquet", 100, "main-repo"),
                LOC("json", "/data/foo2.json", 150, "main-repo")
            ],
            loader='{"type": "union"}', application=self.application, application_args="{}"
        )


    def test_create_asset_expired(self):
        # Try to add asset to a dataset outside it life range
        self.dataset.expiration_time = self.now + timedelta(hours=1)
        self.dataset.save()
        with self.assertRaises(ValidationError) as cm:
            self.dataset.create_asset("asset-name", 10, self.now, self.now + timedelta(hours=1), [])
        self.assertEqual(cm.exception.message, "Dataset is not active")


    def test_create_asset_bad_application(self):
        # Try to create asset and claim it is created by an application not belong
        # to the dataset's tenant
        tenant2 = create_tenant(
            user=self.user,
            name="datalake name2",
            description="datalake description"
        )
        application = tenant2.create_application(
            self.user, "fooapp", "fooapp description", "admin", "s3://bucket/name"
        )
        with self.assertRaises(ValidationError) as cm:
            self.dataset.create_asset(
                "asset-name", 10, self.now, self.now, [ ], application=application
            )
        self.assertEqual(cm.exception.message, "Application not in the tenant")


    def test_create_asset_no_locations(self):
        # Try to add asset to a dataset outside it life range
        with self.assertRaises(ValidationError) as cm:
            self.dataset.create_asset("asset-name", 10, self.now, self.now, [])
        self.assertEqual(cm.exception.message, "No location specified")


    def test_create_asset_bad_repo_name(self):
        # Try to create asset which points to location in non-exist repo name
        with self.assertRaises(ValidationError) as cm:
            self.dataset.create_asset(
                "asset-name", 10, self.now, self.now,
                [
                    LOC("parquet", "hdfs://data/x", 100, "main-repo2")
                ],
            )
        self.assertEqual(cm.exception.message, "Invalid repo name")


    def test_create_asset_bad_dependency(self):
        # Try to create asset which we tell it depend on asset whose path does not exist
        with self.assertRaises(ValidationError) as cm:
            self.dataset.create_asset(
                "asset-name", 10, self.now, self.now,
                [ LOC("parquet", "hdfs://data/x.parquet", 100, "main-repo") ],
                src_dsi_paths=[
                    "test-name:1.0:1:/asset-other1:0"   # bad asset path
                ]
            )
        self.assertEqual(cm.exception.message, "Source asset does not exist")


    def test_create_asset_first_revision(self):
        asset = self.dataset.create_asset(
            "asset-name", 10, self.now, self.now,
            [
                LOC("parquet", "/x.parquet", 100, "main-repo"),
                LOC("json", "/y.json", 150, "main-repo"),
            ],
            loader='{"type": "union"}',
            src_dsi_paths=[ "test-name:1.0:1:asset-other:0"],
            application=self.application, application_args="{}"
        )

        # make sure asset is created with the right attributes
        self.assertEqual(asset, Asset.objects.get(pk=asset.id))
        self.assertEqual(asset.tenant.id, self.dataset.tenant.id)
        self.assertEqual(asset.dataset.id, self.dataset.id)
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
        self.assertEqual(location0.tenant.id, self.dataset.tenant.id)
        self.assertEqual(location0.asset.id, asset.id)
        self.assertEqual(location0.type, "parquet")
        self.assertEqual(location0.repo.id, self.data_repo.id)
        self.assertEqual(location0.location, "/x.parquet")
        self.assertEqual(location0.offset, 0)
        self.assertEqual(location0.size, 100)

        location1 = locations[1]
        self.assertEqual(location1.tenant.id, self.dataset.tenant.id)
        self.assertEqual(location1.asset.id, asset.id)
        self.assertEqual(location1.type, "json")
        self.assertEqual(location1.repo.id, self.data_repo.id)
        self.assertEqual(location1.location, "/y.json")
        self.assertEqual(location1.offset, 1)
        self.assertEqual(location1.size, 150)

    def test_create_asset_second_revision_before_first_revision(self):
        # try to re-publish asset, while the 2nd publish's publish time is
        # before 1st publish time, the operation should fail
        self.dataset.create_asset(
            "asset-name", 10, self.now, self.now,
            [
                CreateAssetInput._BriefLocation("parquet", "/x.parquet", 100, "main-repo"),
                CreateAssetInput._BriefLocation("json", "/y.json", 150, "main-repo"),
            ],
            loader='{"type": "union"}',
            src_dsi_paths=[ "test-name:1.0:1:asset-other:0" ],
            application=self.application,
            application_args="{}"
        )

        with self.assertRaises(ValidationError) as cm:
            self.dataset.create_asset(
                "asset-name", 10, self.now - timedelta(minutes=1), self.now,
                [
                    CreateAssetInput._BriefLocation("parquet", "/x.parquet", 100, "main-repo"),
                    CreateAssetInput._BriefLocation("json", "/y.json", 150, "main-repo"),
                ],
                loader='{"type": "union"}',
                src_dsi_paths=[ "test-name:1.0:1:asset-other:0" ],
                application=self.application,
                application_args="{}"
            )

        self.assertEqual(cm.exception.message, "Publish time is too early")

    def test_create_asset_second_revision_before_first_revision2(self):
        # try to re-publish asset, while the 2nd publish time is
        # before 1st deleted time, the operation should fail
        asset = self.dataset.create_asset(
            "asset-name", 10, self.now, self.now,
            [
                CreateAssetInput._BriefLocation("parquet", "/x.parquet", 100, "main-repo"),
                CreateAssetInput._BriefLocation("json", "/y.json", 150, "main-repo"),
            ],
            loader='{"type": "union"}',
            src_dsi_paths=["test-name:1.0:1:asset-other:0"],
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
                    CreateAssetInput._BriefLocation("parquet", "/x.parquet", 100, "main-repo"),
                    CreateAssetInput._BriefLocation("json", "/y.json", 150, "main-repo"),
                ],
                loader='{"type": "union"}',
                src_dsi_paths=[ "test-name:1.0:1:asset-other:0" ],
                application=self.application,
                application_args="{}"
            )

        self.assertEqual(cm.exception.message, "Publish time is too early")

    def test_create_asset_second_revision_first_deleted(self):
        # try to re-publish asset, while latest revision is already deleted
        asset = self.dataset.create_asset(
            "asset-name", 10, self.now, self.now,
            [
                CreateAssetInput._BriefLocation("parquet", "/x.parquet", 100, "main-repo"),
                CreateAssetInput._BriefLocation("json", "/y.json", 150, "main-repo"),
            ],
            loader='{"type": "union"}',
            src_dsi_paths=[ "test-name:1.0:1:asset-other:0" ],
            application=self.application,
            application_args="{}"
        )
        asset.deleted_time = self.now + timedelta(hours=1)
        asset.save()

        asset2 = self.dataset.create_asset(
            "asset-name", 10, self.now + timedelta(hours=2), self.now,
            [
                CreateAssetInput._BriefLocation("parquet", "/x.parquet", 100, "main-repo"),
                CreateAssetInput._BriefLocation("json", "/y.json", 150, "main-repo"),
            ],
            loader='{"type": "union"}',
            src_dsi_paths=[ "test-name:1.0:1:asset-other:0" ],
            application=self.application,
            application_args="{}"
        )

        # make sure the new asset has the right attributes,
        # especially revision should be bumped to 1
        self.assertEqual(asset2, Asset.objects.get(pk=asset2.id))
        self.assertEqual(asset2.tenant.id, self.dataset.tenant.id)
        self.assertEqual(asset2.dataset.id, self.dataset.id)
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
            "asset-name", 10, self.now, self.now,
            [
                LOC("parquet", "/x.parquet", 100, "main-repo"),
                LOC("json", "/y.json", 150, "main-repo"),
            ],
            loader='{"type": "union"}',
            src_dsi_paths=[ "test-name:1.0:1:asset-other:0" ],
            application=self.application,
            application_args="{}"
        )

        asset2 = self.dataset.create_asset(
            "asset-name", 10, self.now + timedelta(hours=2), self.now,
            [
                LOC("parquet", "/x.parquet", 100, "main-repo"),
                LOC("json", "/y.json", 150, "main-repo"),
            ],
            loader='{"type": "union"}',
            src_dsi_paths=[ "test-name:1.0:1:asset-other:0"],
            application=self.application,
            application_args="{}"
        )

        # make sure the latest revision is deleted
        asset.refresh_from_db(fields=['deleted_time'])
        self.assertEqual(asset.deleted_time, self.now+timedelta(hours=2))

        # make sure the new asset has the right attributes,
        # especially revision should be bumped to 1
        self.assertEqual(asset2, Asset.objects.get(pk=asset2.id))
        self.assertEqual(asset2.tenant.id, self.dataset.tenant.id)
        self.assertEqual(asset2.dataset.id, self.dataset.id)
        self.assertEqual(asset2.name, "asset-name")
        self.assertEqual(asset2.publish_time, self.now+timedelta(hours=2))
        self.assertEqual(asset2.data_time, self.now)
        self.assertEqual(asset2.deleted_time, None)
        self.assertEqual(asset2.revision, 1)
        self.assertEqual(asset2.row_count, 10)
        self.assertEqual(asset2.loader, '{"type": "union"}')
        self.assertEqual(asset2.application.id, self.application.id)
        self.assertEqual(asset2.application_args, "{}")

    def test_create_asset_second_revision_with_dependency_failure(self):
        # first revision is published, and other asset has been created from it
        # now we try to re-publish it, it should fail since it will put the
        # derived asset in a stale state
        asset = self.dataset.create_asset(
            "asset-name", 10, self.now, self.now,
            [
                LOC("parquet", "/x.parquet", 100, "main-repo"),
                LOC("json", "/y.json", 150, "main-repo"),
            ],
            loader='{"type": "union"}',
            src_dsi_paths=[ "test-name:1.0:1:asset-other:0" ],
            application=self.application,
            application_args="{}"
        )

        # self.other_asset --> asset
        # we will try to re-publish self.other_asset, it should fail
        with self.assertRaises(ValidationError) as cm:
            self.dataset.create_asset(
                "asset-other", 10, self.now, self.now,
                [
                    LOC("parquet", "/data/foo2.parquet", 100, "main-repo"),
                    LOC("json", "/data/foo2.json", 150, "main-repo")
                ],
                loader='{"type": "union"}', application=self.application, application_args="{}"
            )
        self.assertEqual(cm.exception.message, "Cannot delete an asset while there are other asset depend on it")
