from datetime import datetime, timedelta
import pytz

from django.test import TestCase

from main.models import Tenant, Pipeline, PipelineInstance, PipelineGroup
from main.tests.models.tools import create_test_user, create_test_tenant, now_utc

class PipelineInstanceTestCase(TestCase):
    def setUp(self):
        self.now = now_utc()
        self.user = create_test_user(name='testuser')
        self.tenant = create_test_tenant(user=self.user)

    def test_get_prior_instance(self):
        due1 = datetime(2020, 1, 1).replace(tzinfo=pytz.UTC)
        due2 = datetime(2020, 1, 2).replace(tzinfo=pytz.UTC)

        pipeline = self.tenant.create_pipeline(
            self.user, "foo-pipeline", "description", "team", "category", ""
        )

        pg1 = self.tenant.create_pipeline_group(
            "foo-pipeline-group", "category", "", due=due1
        )
        pi1 = pg1.attach(pipeline)

        pg2 = self.tenant.create_pipeline_group(
            "bar-pipeline-group", "category", "", due=due2
        )
        pi2 = pg2.attach(pipeline)

        t = pi2.get_prior_instance()
        self.assertEqual(t.id, pi1.id)

    def test_get_prior_instance_no_prior(self):
        due1 = datetime(2020, 1, 1).replace(tzinfo=pytz.UTC)

        pipeline = self.tenant.create_pipeline(
            self.user, "foo-pipeline", "description", "team", "category", ""
        )

        pg1 = self.tenant.create_pipeline_group(
            "foo-pipeline-group", "category", "", due=due1
        )
        pi1 = pg1.attach(pipeline)


        t = pi1.get_prior_instance()
        self.assertIsNone(t)
