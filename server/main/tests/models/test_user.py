from django.contrib.auth.models import User
from main.models import Tenant

from django.test import TestCase
from django.db.utils import IntegrityError

class UserTestCase(TestCase):
    def setUp(self):
        pass


    def test_uniqueness(self):
        # we assume username is unique
        user1 = User.objects.create_user(
            username='testuser',
            password='12345'
        )
        user1.save()

        with self.assertRaises(IntegrityError) as cm:
            user2 = User.objects.create_user(
                username='testuser',
                password='12345'
            )
            user2.save()
        self.assertRegex(cm.exception.args[1], r"^Duplicate entry.*$")


