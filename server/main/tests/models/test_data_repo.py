from django.test import TestCase
from django.db.utils import IntegrityError

from main.models import Tenant, DataRepo
from main.tests.models.tools import create_test_user, create_test_tenant, now_utc


class DataRepoTestCase(TestCase):
    def setUp(self):
        self.user = create_test_user(name='testuser')
        self.tenant = create_test_tenant(user=self.user)



    def test_uniqueness(self):
        data_repo1 = DataRepo(
            tenant=self.tenant,
            name="data-repo-name",
            description="data-repo-description1",
            type=DataRepo.RepoType.HDFS.value,
            context='{"a":1}'
        )
        data_repo1.save()

        with self.assertRaises(IntegrityError) as cm:
            data_repo2 = DataRepo(
                tenant=self.tenant,
                name="data-repo-name",
                description="data-repo-description2",
                type=DataRepo.RepoType.LFS.value,
                context='{"a":2}'
            )
            data_repo2.save()
        self.assertRegex(cm.exception.args[1], r"^Duplicate entry.*$")

