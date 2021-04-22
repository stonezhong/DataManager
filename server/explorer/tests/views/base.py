from django.test import TestCase, Client
from django.contrib.auth.models import User
from main.models import Tenant

PASSWORD="12345"

class BaseTestCase(TestCase):
    def setUp(self):
        # Tenant: name='DL1'           v = tenant1
        #     User: name='user1a'      v = user1b
        #     User: name='user1b'      v = user1a
        # Tenant: name='DL2'           v = tenant2
        #     User: name='user2a'      v = user2a
        #     User: name='user2b'      v = user2b
        self.client     = Client()

        self.user1a     = User.objects.create_user(username="user1a", password=PASSWORD)
        self.tenant1    = Tenant.create(self.user1a, "DL1", "DL1-desc", "{}", False)
        self.user1b     = User.objects.create_user(username="user1b", password=PASSWORD)
        self.tenant1.subscribe_user(self.user1b)

        self.user2a     = User.objects.create_user(username="user2a", password=PASSWORD)
        self.tenant2    = Tenant.create(self.user2a, "DL2", "DL2-desc", "{}", False)
        self.user2b     = User.objects.create_user(username="user2b", password=PASSWORD)
        self.tenant2.subscribe_user(self.user2b)


    def login_client(self, *, username, password=PASSWORD):
        self.client.login(username = username, password=password)
