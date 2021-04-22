from django.test import TestCase, Client
from django.urls import reverse
from django.template.loader import render_to_string

from .base import BaseTestCase

class LoginTestCase(BaseTestCase):
    def setUp(self):
        super(LoginTestCase, self).setUp()

    def test_get_authenticated(self):
        # an authenticated user access login page
        self.login_client(username="user1a")
        response = self.client.get(reverse('login'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'common_page.html')
        self.assertEqual(response.context['user'].id, self.user1a.id)
        self.assertEqual(response.context['sub_title'], 'Login')
        self.assertEqual(
            response.context['scripts'],
            ['/static/js-bundle/login.js']
        )
        self.assertEqual(response.context['nav_item_role'], 'login')


    def test_get_anonymous(self):
        # an anonymous user access login page
        response = self.client.get(reverse('login'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'common_page.html')
        self.assertFalse(response.context['user'].is_authenticated)
        self.assertEqual(response.context['sub_title'], 'Login')
        self.assertEqual(
            response.context['scripts'],
            ['/static/js-bundle/login.js']
        )
        self.assertEqual(response.context['nav_item_role'], 'login')


    def test_login_failed(self):
        response = self.client.post(reverse('login'), {
            'username': 'user1a',
            'password': '12345!'
        })
        # when authenticate failed, you stay on the login page
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'common_page.html')
        self.assertFalse(response.context['user'].is_authenticated)
        self.assertEqual(response.context['sub_title'], 'Login')
        self.assertEqual(
            response.context['scripts'],
            ['/static/js-bundle/login.js']
        )
        self.assertEqual(response.context['nav_item_role'], 'login')
        self.assertEqual(response.context['app_context'], '{"msg":"Wrong username or password!"}')

    def test_login_success(self):
        response = self.client.post(reverse('login'), {
            'username': 'user1a',
            'password': '12345'
        })
        # when authenticate successful, you will be redirected to datalake page
        self.assertRedirects(response, reverse('datalakes'), status_code=302)

