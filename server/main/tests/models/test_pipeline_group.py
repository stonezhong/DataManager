from datetime import datetime, timedelta
import pytz
import mock

from django.test import TestCase
from django.db.utils import IntegrityError
from django.core.exceptions import ValidationError

from main.models import Tenant, PipelineGroup, PipelineInstance
from main.tests.models.tools import create_test_user, create_test_tenant, now_utc


class PipelineGroupTestCase(TestCase):
    def setUp(self):
        self.now = now_utc()
        self.user = create_test_user(name='testuser')
        self.tenant = create_test_tenant(user=self.user)

    @mock.patch('main.models.datetime')
    def test_attach(self, mock_dt):
        pipeline_group = PipelineGroup(
            tenant=self.tenant,
            name="test-pipeline-group",
            created_time = self.now,
            category="test-category",
            context="{}",
            finished=True,
            manual=False
        )
        pipeline_group.save()

        pipeline = self.tenant.create_pipeline(
            self.user, "foo-pipeline", "blah...", "admins", "test-category", "{}"
        )

        mock_dt.utcnow = mock.Mock(return_value=self.now)

        pipeline_instance = pipeline_group.attach(pipeline)
        self.assertEqual(pipeline_instance.tenant.id, self.tenant.id)
        self.assertEqual(pipeline_instance.pipeline.id, pipeline.id)
        self.assertEqual(pipeline_instance.group.id, pipeline_group.id)
        self.assertEqual(pipeline_instance.context, "{}")
        self.assertEqual(pipeline_instance.status, PipelineInstance.CREATED_STATUS)
        self.assertEqual(pipeline_instance.created_time, self.now)

    def test_attach_bad_pipeline(self):
        tenant2 = create_test_tenant(user=self.user, name="DL2")

        pipeline_group = PipelineGroup(
            tenant=self.tenant,
            name="test-pipeline-group",
            created_time = self.now,
            category="test-category",
            context="{}",
            finished=True,
            manual=False
        )
        pipeline_group.save()

        pipeline = tenant2.create_pipeline(
            self.user, "foo-pipeline", "blah...", "admins", "test-category", "{}"
        )

        # it should fail since pipeline belongs to a different tenant
        with self.assertRaises(ValidationError) as cm:
            pipeline_group.attach(pipeline)
        self.assertEqual(cm.exception.message, "Invalid tenant")


    def test_uniqueness(self):
        pipeline_group1 = PipelineGroup(
            tenant=self.tenant,
            name="test-pipeline-group",
            created_time = self.now,
            category="test-category",
            context="{}",
            finished=True,
            manual=False
        )
        pipeline_group1.save()

        with self.assertRaises(IntegrityError) as cm:
            pipeline_group2 = PipelineGroup(
                tenant=self.tenant,
                name="test-pipeline-group",
                created_time = self.now + timedelta(hours=1),
                category="test-category!!!",
                context='{"x": 1}',
                finished=False,
                manual=True
            )
            pipeline_group2.save()

        self.assertRegex(cm.exception.args[1], r"^Duplicate entry.*$")

