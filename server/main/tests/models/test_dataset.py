from django.contrib.auth.models import User
from main.models import Tenant, Dataset
from datetime import datetime, timedelta

import pytz

from django.test import TestCase

class DatasetTestCase(TestCase):
    def setUp(self):
        self.now = datetime.utcnow().replace(tzinfo=pytz.UTC)
        self.user = User.objects.create_user(
            username='testuser',
            password='12345'
        )
        self.tenant = Tenant.create(
            self.user, "test tenant", "blah...", "{}", False
        )

    def test_create(self):
        ds = Dataset.create(
            self.user,
            self.tenant.id,
            "test-name", "1.0", 1,
            self.now,
            "test-description",
            "test-team"
        )

        self.assertEqual(ds.tenant.id, self.tenant.id)
        self.assertEqual(ds.name, "test-name")
        self.assertEqual(ds.major_version, "1.0")
        self.assertEqual(ds.minor_version, 1)
        self.assertEqual(ds.publish_time, self.now)
        self.assertEqual(ds.expiration_time, None)
        self.assertEqual(ds.description, "test-description")
        self.assertEqual(ds.author.id, self.user.id)
        self.assertEqual(ds.team, "test-team")
        self.assertEqual(ds.schema, "")
        self.assertEqual(ds.sample_data, "")


    def test_set_schema_and_sample_data(self):
        ds = Dataset.create(
            self.user,
            self.tenant.id,
            "test-name", "1.0", 1,
            self.now,
            "test-description",
            "test-team"
        )
        ds.set_schema_and_sample_data(
            self.user, "{}"
        )
        self.assertEqual(ds.schema, "{}")


    def test_from_name_and_version(self):
        ds1 = Dataset.create(
            self.user,
            self.tenant.id,
            "test-name", "1.0", 1,
            self.now,
            "test-description",
            "test-team"
        )

        ds = Dataset.from_name_and_version(self.tenant.id, "test-name", "1.0", 1)
        self.assertEqual(ds.id, ds1.id)


    def test_is_active_at(self):
        ds = Dataset.create(
            self.user,
            self.tenant.id,
            "test-name", "1.0", 1,
            self.now,
            "test-description",
            "test-team"
        )

        self.assertTrue(ds.is_active_at(self.now))

        ds.expiration_time = self.now + timedelta(days=1)
        ds.save()
        self.assertTrue(ds.is_active_at(self.now))
        self.assertFalse(ds.is_active_at(self.now + timedelta(days=2)))

