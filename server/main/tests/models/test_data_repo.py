from django.contrib.auth.models import User
from main.models import Tenant, DataRepo

from django.test import TestCase
from django.db.utils import IntegrityError

class DataRepoTestCase(TestCase):
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

