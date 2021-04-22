from django.test import TestCase, Client
from django.urls import reverse
from django.template.loader import render_to_string

from .base import BaseTestCase

class IndexTestCase(BaseTestCase):
    def setUp(self):
        super(IndexTestCase, self).setUp()


    def test_index_anonymous_user(self):
        # if not logged in, we will let user to login
        response = self.client.get(reverse('index'))
        self.assertRedirects(response, reverse('login'), status_code=302)


    def test_index_authenticated_user(self):
        # if user is already logged in, we will show data lakes
        self.login_client(username="user1a")
        response = self.client.get(reverse('index'))
        self.assertRedirects(response, reverse('datalakes'), status_code=302)

