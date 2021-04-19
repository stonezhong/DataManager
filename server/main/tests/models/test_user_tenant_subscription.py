from django.contrib.auth.models import User
from main.models import Tenant, UserTenantSubscription

from django.test import TestCase
from django.db.utils import IntegrityError

class UserTenantSubscriptionTestCase(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            username='testuser1',
            password='12345'
        )
        self.user2 = User.objects.create_user(
            username='testuser2',
            password='12345'
        )

    def test_uniqueness(self):
        tenant = Tenant.create(
            self.user1,
            "datalake name",
            "datalake description",
            "{}",
            False
        )

        subscription1 = UserTenantSubscription(user = self.user2, tenant=tenant, is_admin=True)
        subscription1.save()

        with self.assertRaises(IntegrityError) as cm:
            subscription2 = UserTenantSubscription(user = self.user2, tenant=tenant, is_admin=True)
            subscription2.save()
        self.assertRegex(cm.exception.args[1], r"^Duplicate entry.*$")

    def test_get_subscriptions_for_user(self):
        tenant1 = Tenant.create(
            self.user1,
            "datalake name1",
            "datalake description1",
            "{}",
            False
        )
        tenant2 = Tenant.create(
            self.user1,
            "datalake name2",
            "datalake description2",
            "{}",
            False
        )

        subscriptions = UserTenantSubscription.get_subscriptions_for_user(self.user1)
        self.assertEqual(len(subscriptions), 2)
        self.assertEqual(subscriptions[0].user.id, self.user1.id)
        self.assertEqual(subscriptions[0].tenant.id, tenant1.id)
        self.assertTrue(subscriptions[0].is_admin)

        self.assertEqual(subscriptions[1].user.id, self.user1.id)
        self.assertEqual(subscriptions[1].tenant.id, tenant2.id)
        self.assertTrue(subscriptions[1].is_admin)






