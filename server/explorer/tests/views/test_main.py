from django.test import TestCase, Client
from django.urls import reverse
from django.template.loader import render_to_string

##########################################################################
# Test all the views
##########################################################################

class IndexTestCase(TestCase):
    def setUp(self):
        self.client = Client()

    def test_main(self):
        # index page should redirect to datasets page
        response = self.client.get('/')
        self.assertRedirects(response, reverse('datasets'), status_code=302)

class DatasetsTestCase(TestCase):
    def setUp(self):
        self.client = Client()

    def test_main(self):
        # index page should redirect to datasets page
        response = self.client.get(reverse('datasets'))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'common_page.html')

        self.assertEqual(
            response.context['scripts'],
            ['/static/js-bundle/datasets.js']
        )

        self.assertEqual(response.context['sub_title'], 'Datasets')
        self.assertEqual(response.context['nav_item_role'], 'datasets')
