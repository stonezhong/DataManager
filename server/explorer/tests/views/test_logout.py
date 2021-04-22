from django.test import TestCase, Client
from django.urls import reverse
from django.template.loader import render_to_string

from .base import BaseTestCase

class LogoutTestCase(BaseTestCase):
    def setUp(self):
        super(LogoutTestCase, self).setUp()

    def test_logoff_anonymous(self):
        # user is not logged in, we redirect to login page
        response = self.client.get(reverse('logout'))
        self.assertRedirects(response, reverse('login'), status_code=302)


    def test_logoff_authenticated(self):
        # user is logged in, we redirect to login page
        self.login_client(username="user1a")
        response = self.client.get(reverse('logout'))
        self.assertRedirects(response, reverse('login'), status_code=302)
