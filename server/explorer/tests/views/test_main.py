from django.test import TestCase, Client
from django.urls import reverse
from django.template.loader import render_to_string
from django.contrib.auth.models import User
from main.models import Tenant

##########################################################################
# Test all the views under /explorer/
##########################################################################

class IndexTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            password='12345'
        )
        self.tenant = Tenant.create(
            self.user, "test tenant", "blah...", "{}", False
        )


    def login_client(self):
        self.client.login(username = 'testuser', password='12345')


    def test_main_anonymous_user(self):
        response = self.client.get('/explorer/')
        self.assertRedirects(response, reverse('login'), status_code=302)


    def test_main_authenticated_user(self):
        self.login_client()
        response = self.client.get('/explorer/')
        self.assertRedirects(response, reverse('datalakes'), status_code=302)


class DatasetsTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            password='12345'
        )
        self.tenant = Tenant.create(
            self.user, "test tenant", "blah...", "{}", False
        )


    def login_client(self):
        self.client.login(username = 'testuser', password='12345')


    def test_main_anonymous_user(self):
        response = self.client.get(reverse('datasets', kwargs={"tenant_id": self.tenant.id}))
        self.assertRedirects(response, reverse('login'), status_code=302)


    def test_main_authenticated_user(self):
        self.login_client()
        response = self.client.get(reverse('datasets', kwargs={"tenant_id": self.tenant.id}))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'common_page.html')

        self.assertEqual(
            response.context['scripts'],
            ['/static/js-bundle/datasets.js']
        )
        self.assertEqual(response.context['sub_title'], 'Datasets')
        self.assertEqual(response.context['nav_item_role'], 'datasets')
