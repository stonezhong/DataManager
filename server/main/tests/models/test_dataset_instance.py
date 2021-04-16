from django.contrib.auth.models import User
from main.models import Tenant, Dataset, DatasetInstance, DataRepo
from datetime import datetime, timedelta
import json

import pytz

from main.api_input import CreateDatasetInstanceInput
from main.models import InvalidOperationException

from django.test import TestCase

class DatasetInstanceTestCase(TestCase):
    def setUp(self):
        self.now = datetime.utcnow().replace(tzinfo=pytz.UTC)
        self.user = User.objects.create_user(
            username='testuser',
            password='12345'
        )
        self.tenant = Tenant.create(
            self.user, "test tenant", "blah...", "{}", False
        )

    def create_dsis(self, repo_name=None):
        if repo_name is not None:
            context = {
                "base_dir": "/beta/data"
            }
            repo = DataRepo(
                tenant=self.tenant,
                name=repo_name,
                description="",
                type=DataRepo.RepoType.LFS.value,
                context=json.dumps(context)
            )
            repo.save()

        ds = Dataset.create(
            self.user,
            self.tenant.id,
            "test-name", "1.0", 1,
            self.now,
            "test-description",
            "test-team"
        )

        dsi1 = DatasetInstance.create(
            self.user,
            ds,
            None,
            "foo",
            100,
            self.now,
            self.now,
            [
                CreateDatasetInstanceInput._BriefLocation(
                    "parquet", "hdfs://data/foo.parquet", 100, repo_name
                )
            ]
        )

        dsi2 = DatasetInstance.create(
            self.user,
            ds,
            None,
            "bar",
            100,
            self.now,
            self.now,
            [
                CreateDatasetInstanceInput._BriefLocation(
                    "parquet", "hdfs://data/bar.parquet", 100, repo_name
                )
            ],
            src_dsi_paths = [
                "test-name:1.0:1:/foo:0"
            ]
        )
        return (ds, dsi1, dsi2, )

    def test_create(self):
        ds, dsi, _ = self.create_dsis()
        self.assertEqual(dsi.tenant.id, self.tenant.id)
        self.assertEqual(dsi.dataset.id, ds.id)
        self.assertEqual(dsi.parent_instance, None)
        self.assertEqual(dsi.name, "foo")
        self.assertEqual(dsi.path, "/foo")
        self.assertEqual(dsi.publish_time, self.now)
        self.assertEqual(dsi.data_time, self.now)
        self.assertEqual(dsi.deleted_time, None)
        self.assertEqual(dsi.revision, 0)
        self.assertEqual(dsi.row_count, 100)
        self.assertEqual(dsi.loader, None)
        for location in dsi.locations.all():
            self.assertIsNone(location.repo)

    def test_create_with_repo(self):
        ds, dsi, _ = self.create_dsis('myrepo')
        self.assertEqual(dsi.tenant.id, self.tenant.id)
        self.assertEqual(dsi.dataset.id, ds.id)
        self.assertEqual(dsi.parent_instance, None)
        self.assertEqual(dsi.name, "foo")
        self.assertEqual(dsi.path, "/foo")
        self.assertEqual(dsi.publish_time, self.now)
        self.assertEqual(dsi.data_time, self.now)
        self.assertEqual(dsi.deleted_time, None)
        self.assertEqual(dsi.revision, 0)
        self.assertEqual(dsi.row_count, 100)
        self.assertEqual(dsi.loader, None)
        for location in dsi.locations.all():
            self.assertEqual(location.repo.name, "myrepo")

    # scenario: create a dataset with the existing path bumps the revision
    def test_create_bump_revision(self):
        ds, dsi1, dsi2 = self.create_dsis()
        dsi2_new = DatasetInstance.create(
            self.user,
            ds,
            None,
            "bar",
            100,
            self.now,
            self.now,
            [
                CreateDatasetInstanceInput._BriefLocation(
                    "parquet", "hdfs://data/bar.parquet", 100, None
                )
            ],
            src_dsi_paths = [
                "test-name:1.0:1:/foo:0"
            ]
        )
        self.assertEqual(dsi2_new.tenant.id, self.tenant.id)
        self.assertEqual(dsi2_new.dataset.id, ds.id)
        self.assertEqual(dsi2_new.parent_instance, None)
        self.assertEqual(dsi2_new.name, "bar")
        self.assertEqual(dsi2_new.path, "/bar")
        self.assertEqual(dsi2_new.publish_time, self.now)
        self.assertEqual(dsi2_new.data_time, self.now)
        self.assertEqual(dsi2_new.deleted_time, None)
        self.assertEqual(dsi2_new.revision, 1)
        self.assertEqual(dsi2_new.row_count, 100)
        self.assertEqual(dsi2_new.loader, None)
        self.assertNotEqual(dsi2_new.id, dsi2.id)


    # scenario: create a dataset with the existing path should fail
    #           if the dataset already leads to other datasets
    def test_create_bump_revision_failure(self):
        ds, dsi1, dsi2 = self.create_dsis()
        with self.assertRaises(InvalidOperationException):
            DatasetInstance.create(
                self.user,
                ds,
                None,
                "foo",
                100,
                self.now,
                self.now,
                [
                    CreateDatasetInstanceInput._BriefLocation(
                        "parquet", "hdfs://data/foo.parquet", 100, None
                    )
                ],
            )

    def test_dsi_path(self):
        ds, dsi, _ = self.create_dsis()
        self.assertEqual(dsi.dsi_path, "test-name:1.0:1:/foo:0")


    def test_src_dataset_instances(self):
        _, dsi1, dsi2 = self.create_dsis()
        self.assertEqual(dsi1.src_dataset_instances, [])
        self.assertEqual(dsi2.src_dataset_instances, ["test-name:1.0:1:/foo:0"])

    def test_dst_dataset_instances(self):
        _, dsi1, dsi2 = self.create_dsis()
        self.assertEqual(dsi1.dst_dataset_instances, ["test-name:1.0:1:/bar:0"])
        self.assertEqual(dsi2.dst_dataset_instances, [])


    def test_from_dsi_path(self):
        _, dsi1, dsi2 = self.create_dsis()
        self.assertEqual(
            DatasetInstance.from_dsi_path(self.tenant.id, "test-name:1.0:1:/foo:0").id,
            dsi1.id
        )
        self.assertIsNone(
            DatasetInstance.from_dsi_path(self.tenant.id, "test-name:1.0:1:/foo:1")
        )
        self.assertIsNone(
            DatasetInstance.from_dsi_path(self.tenant.id, "test-name:1.0:1:/fooX:0")
        )
        self.assertIsNone(
            DatasetInstance.from_dsi_path(self.tenant.id, "test-nameX:1.0:1:/fooX:0")
        )

        # if a dataset instance is deleted, you should not be able to find it
        self.assertEqual(
            DatasetInstance.from_dsi_path(self.tenant.id, "test-name:1.0:1:/bar:0").id,
            dsi2.id
        )
        dsi2.soft_delete(self.user)
        self.assertIsNone(
            DatasetInstance.from_dsi_path(self.tenant.id, "test-name:1.0:1:/bar:0")
        )


    def test_soft_delete(self):
        _, dsi1, dsi2 = self.create_dsis()

        # You won't be able to delete dsi1 since dsi2 depend on it
        try:
            dsi1.soft_delete(self.user)
        except InvalidOperationException as e:
            self.assertEqual(str(e), "Cannot delete")

        # test successful delete case
        dsi2.soft_delete(self.user)
        dsi2.refresh_from_db()
        self.assertIsNotNone(dsi2.deleted_time)


