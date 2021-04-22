from django.test import TestCase, Client
from django.urls import reverse
from django.template.loader import render_to_string

from .base import BaseTestCase

class DatasetsTestCase(BaseTestCase):
    def setUp(self):
        super(DatasetsTestCase, self).setUp()


    def test_datasets_anonymous_user(self):
        response = self.client.get(reverse('datasets', kwargs={"tenant_id": self.tenant1.id}))
        self.assertRedirects(response, reverse('login'), status_code=302)


    def test_main_authenticated_user(self):
        self.login_client(username="user1a")
        response = self.client.get(reverse('datasets', kwargs={"tenant_id": self.tenant1.id}))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'common_page.html')
        self.assertEqual(
            response.context['scripts'],
            ['/static/js-bundle/datasets.js']
        )
        self.assertEqual(response.context['sub_title'], 'Datasets')
        self.assertEqual(response.context['nav_item_role'], 'datasets')

    def test_main_authenticated_user_bad_tenant_id(self):
        self.login_client(username="user1a")
        response = self.client.get(reverse('datasets', kwargs={"tenant_id": 9999}))
        self.assertEqual(response.status_code, 404)


    def test_main_authenticated_user_not_subscribed(self):
        self.login_client(username="user1a")
        response = self.client.get(reverse('datasets', kwargs={"tenant_id": self.tenant2.id}))
        self.assertEqual(response.status_code, 403)

