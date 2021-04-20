from main.models import Tenant, UserTenantSubscription

from django.test import TestCase
from django.db.utils import IntegrityError

from main.tests.models.tools import create_test_user, create_test_tenant, now_utc

class UserTenantSubscriptionTestCase(TestCase):
    def setUp(self):
        self.user1 = create_test_user(name='testuser1')
        self.user2 = create_test_user(name='testuser2')

    def test_uniqueness(self):
        tenant = create_test_tenant(user=self.user1)

        subscription1 = UserTenantSubscription(user = self.user2, tenant=tenant, is_admin=True)
        subscription1.save()

        with self.assertRaises(IntegrityError) as cm:
            subscription2 = UserTenantSubscription(user = self.user2, tenant=tenant, is_admin=True)
            subscription2.save()
        self.assertRegex(cm.exception.args[1], r"^Duplicate entry.*$")

    def test_get_subscriptions_for_user(self):
        tenant1 = create_test_tenant(user=self.user1, name="DL1")
        tenant2 = create_test_tenant(user=self.user1, name="DL2")

        subscriptions = UserTenantSubscription.get_subscriptions_for_user(self.user1)
        self.assertEqual(len(subscriptions), 2)
        self.assertEqual(subscriptions[0].user.id, self.user1.id)
        self.assertEqual(subscriptions[0].tenant.id, tenant1.id)
        self.assertTrue(subscriptions[0].is_admin)

        self.assertEqual(subscriptions[1].user.id, self.user1.id)
        self.assertEqual(subscriptions[1].tenant.id, tenant2.id)
        self.assertTrue(subscriptions[1].is_admin)
