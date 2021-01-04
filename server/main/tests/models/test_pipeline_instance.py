from django.contrib.auth.models import User
from main.models import Pipeline, PipelineInstance, PipelineGroup
from datetime import datetime, timedelta

import pytz

from django.test import TestCase

class PipelineInstanceTestCase(TestCase):
    def setUp(self):
        self.now = datetime.utcnow().replace(tzinfo=pytz.UTC)
        self.user = User.objects.create_user(
            username='testuser',
            password='12345'
        )

    def test_get_prior_instance(self):
        pipeline = Pipeline(
            name        = "foo-pipeline",
            description = "blah...",
            author      = self.user,
            team        = 'team',
            retired     = False,
            category    = 'misc',
            context     = '',
            paused      = False,
            version     = 1,
            dag_version = 1
        )
        pipeline.save()

        pg1 = PipelineGroup(
            name="foo-pipeline-group",
            created_time = self.now,
            category='test',
            context='',
            finished=False,
            manual=False,
            due=datetime(2020, 1, 1).replace(tzinfo=pytz.UTC)
        )
        pg1.save()

        pi1 = PipelineInstance(
            pipeline = pipeline,
            group = pg1,
            context = '',
            status = PipelineInstance.FINISHED_STATUS,
            created_time = self.now
        )
        pi1.save()

        pg2 = PipelineGroup(
            name="bar-pipeline-group",
            created_time = self.now,
            category='test',
            context='',
            finished=False,
            manual=False,
            due=datetime(2020, 1, 2).replace(tzinfo=pytz.UTC)
        )
        pg2.save()

        pi2 = PipelineInstance(
            pipeline = pipeline,
            group = pg2,
            context = '',
            status = PipelineInstance.FINISHED_STATUS,
            created_time = self.now
        )
        pi2.save()

        t = pi2.get_prior_instance()

        self.assertEqual(t.id, pi1.id)





