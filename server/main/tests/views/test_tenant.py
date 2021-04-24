from django.test import TestCase, Client
from django.urls import reverse
from django.template.loader import render_to_string


from .base import BaseTestCase

class TenantTestCase(BaseTestCase):
    def setUp(self):
        super(TenantTestCase, self).setUp()


    def test_create_tenant_anonymous(self):
        response = self.post(
            "/api/Tenants/",
            {
                "name": "foo-tenant",
                "description": "foo-desc",
                "is_public": False,
                "config": "{}"
            }
        )
        # We should get access denied since we have not logged in
        self.assertEqual(response.status_code, 403)

    def test_create_tenant(self):
        self.login_client(username="user1a")
        response = self.post(
            "/api/Tenants/",
            {
                "name": "foo-tenant",
                "description": "foo-desc",
                "is_public": False,
                "config": "{}"
            }
        )
        ret = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ret['name'], 'foo-tenant')
        self.assertEqual(ret['description'], 'foo-desc')
        self.assertEqual(ret['is_public'], False)
        self.assertEqual(ret['config'], "{}")

