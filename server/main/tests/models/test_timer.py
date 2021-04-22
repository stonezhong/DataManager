from datetime import datetime, timedelta
import pytz
import mock

from django.contrib.auth.models import User
from django.test import TestCase
from django.db.utils import IntegrityError
from django.core.exceptions import ValidationError

from main.models import Tenant, Timer, \
    TIME_UNIT_YEAR, TIME_UNIT_MONTH, TIME_UNIT_DAY, \
    TIME_UNIT_HOUR, TIME_UNIT_MINUTE, TIME_UNIT_SECOND, \
    adjust_time
from main.tests.models.tools import create_test_user, create_test_tenant, now_utc

class TimerTestCase(TestCase):
    def setUp(self):
        self.now = now_utc()
        self.user = create_test_user(name='testuser')
        self.tenant = create_test_tenant(user=self.user, name="DL")
        self.user2 = create_test_user(name='testuser2')
        self.tenant.subscribe_user(self.user2)


    def test_next_due_dry_run_first_time(self):
        start_time = datetime(2021, 1, 1).replace(tzinfo=pytz.UTC)
        timer = self.tenant.create_timer(
            self.user,
            "foo-timer", "foo-timer-desc",
            "admins", False,
            TIME_UNIT_DAY, 1,
            start_time,
            "pipeline", "{}"
        )

        due = timer.next_due(dryrun=True)
        self.assertEqual(due, start_time)
        self.assertEqual(timer.last_due, None)


    def test_next_due_dry_run_non_first_time(self):
        start_time = datetime(2021, 1, 1).replace(tzinfo=pytz.UTC)
        timer = self.tenant.create_timer(
            self.user,
            "foo-timer", "foo-timer-desc",
            "admins", False,
            TIME_UNIT_DAY, 1,
            start_time,
            "pipeline", "{}"
        )

        due = timer.next_due(dryrun=False)
        due = timer.next_due(dryrun=True)
        self.assertEqual(due, datetime(2021, 1, 2).replace(tzinfo=pytz.UTC))
        # it does not change the due
        self.assertEqual(timer.last_due, datetime(2021, 1, 1).replace(tzinfo=pytz.UTC))

    def test_next_due_first_time_no_cb(self):
        start_time = datetime(2021, 1, 1).replace(tzinfo=pytz.UTC)
        timer = self.tenant.create_timer(
            self.user,
            "foo-timer", "foo-timer-desc",
            "admins", False,
            TIME_UNIT_DAY, 1,
            start_time,
            "pipeline", "{}"
        )

        due = timer.next_due(dryrun=False)
        self.assertEqual(due, start_time)
        self.assertEqual(timer.last_due, due)


    def test_next_due_first_time(self):
        ctx = {}
        def test_event_handler(se):
            ctx['se'] = se

        start_time = datetime(2021, 1, 1).replace(tzinfo=pytz.UTC)
        timer = self.tenant.create_timer(
            self.user,
            "foo-timer", "foo-timer-desc",
            "admins", False,
            TIME_UNIT_DAY, 1,
            start_time,
            "pipeline", "{}"
        )

        due = timer.next_due(dryrun=False, event_handler=test_event_handler)
        self.assertEqual(due, start_time)
        self.assertEqual(timer.last_due, due)
        self.assertEqual(ctx['se'].timer.id, timer.id)
        self.assertEqual(ctx['se'].tenant.id, self.tenant.id)
        self.assertEqual(ctx['se'].due, due)
        self.assertEqual(ctx['se'].acked, False)
        self.assertEqual(ctx['se'].topic, "pipeline")
        self.assertEqual(ctx['se'].context, "{}")
        self.assertEqual(ctx['se'].category, "")


    def test_uniqueness(self):
        timer1 = Timer(
            tenant=self.tenant,
            name="timer1",
            description="timer1-desc",
            author=self.user,
            team="team1",
            paused=True,
            interval_unit=TIME_UNIT_DAY,
            interval_amount=1,
            start_from=datetime(2021, 1, 1).replace(tzinfo=pytz.UTC),
            end_at=None,
            last_due=None,
            topic="pipeline",
            context="{}",
            category="cat1"
        )
        timer1.save()


        with self.assertRaises(IntegrityError) as cm:
            timer2 = Timer(
                tenant=self.tenant,
                name="timer1",
                description="timer2-desc",
                author=self.user2,
                team="team2",
                paused=False,
                interval_unit=TIME_UNIT_HOUR,
                interval_amount=2,
                start_from=datetime(2021, 2, 1).replace(tzinfo=pytz.UTC),
                end_at=None,
                last_due=None,
                topic="pipeline2",
                context="{}",
                category="cat2"
            )
            timer2.save()
        self.assertRegex(cm.exception.args[1], r"^Duplicate entry.*$")


    def test_adjust_time(self):
        dt = datetime(2021, 1, 1).replace(tzinfo=pytz.UTC)
        self.assertEqual(
            adjust_time(dt, TIME_UNIT_YEAR, 1),
            datetime(2022, 1, 1).replace(tzinfo=pytz.UTC)
        )
        self.assertEqual(
            adjust_time(dt, TIME_UNIT_MONTH, 1),
            datetime(2021, 2, 1).replace(tzinfo=pytz.UTC)
        )
        self.assertEqual(
            adjust_time(dt, TIME_UNIT_MONTH, -1),
            datetime(2020, 12, 1).replace(tzinfo=pytz.UTC)
        )
        self.assertEqual(
            adjust_time(dt, TIME_UNIT_DAY, 1),
            datetime(2021, 1, 2).replace(tzinfo=pytz.UTC)
        )
        self.assertEqual(
            adjust_time(dt, TIME_UNIT_HOUR, 1),
            datetime(2021, 1, 1, 1, 0, 0).replace(tzinfo=pytz.UTC)
        )
        self.assertEqual(
            adjust_time(dt, TIME_UNIT_MINUTE, 1),
            datetime(2021, 1, 1, 0, 1, 0).replace(tzinfo=pytz.UTC)
        )
        self.assertEqual(
            adjust_time(dt, TIME_UNIT_SECOND, 1),
            datetime(2021, 1, 1, 0, 0, 1).replace(tzinfo=pytz.UTC)
        )


    @mock.patch('main.models.datetime')
    def test_produce_next_due_too_early(self, mock_dt):
        start_time = datetime(2021, 1, 1).replace(tzinfo=pytz.UTC)
        timer1 = self.tenant.create_timer(
            self.user,
            "foo-timer1", "foo-timer1-desc",
            "admins", False,
            TIME_UNIT_HOUR, 1,
            start_time,
            "pipeline", "{}"
        )
        timer1.next_due(dryrun=False)
        timer1.next_due(dryrun=False)

        timer2 = self.tenant.create_timer(
            self.user,
            "foo-timer2", "foo-timer2-desc",
            "admins", False,
            TIME_UNIT_HOUR, 1,
            start_time,
            "pipeline", "{}"
        )
        timer2.next_due(dryrun=False)

        ctx = {}
        def test_event_handler(se):
            ctx['se'] = se

        # no timer should be triggered
        mock_dt.utcnow = mock.Mock(
            return_value=datetime(2021, 1, 1)
        )
        last_due1 = timer1.last_due
        last_due2 = timer2.last_due

        Timer.produce_next_due("pipeline", event_handler=test_event_handler)
        timer1.refresh_from_db()
        timer2.refresh_from_db()
        self.assertEqual(timer1.last_due, last_due1)
        self.assertEqual(timer2.last_due, last_due2)
        self.assertIsNone(ctx.get('se'))



    @mock.patch('main.models.datetime')
    def test_produce_next_due(self, mock_dt):
        start_time = datetime(2021, 1, 1).replace(tzinfo=pytz.UTC)
        timer1 = self.tenant.create_timer(
            self.user,
            "foo-timer1", "foo-timer1-desc",
            "admins", False,
            TIME_UNIT_HOUR, 1,
            start_time,
            "pipeline", "{}"
        )
        timer1.next_due(dryrun=False)
        timer1.next_due(dryrun=False)

        timer2 = self.tenant.create_timer(
            self.user,
            "foo-timer2", "foo-timer2-desc",
            "admins", False,
            TIME_UNIT_HOUR, 1,
            start_time,
            "pipeline", "{}"
        )
        timer2.next_due(dryrun=False)


        ctx = {}
        def test_event_handler(se):
            ctx['se'] = se

        # now timer2 should be triggered
        mock_dt.utcnow = mock.Mock(
            return_value=datetime(2021, 1, 1, 2, 30, 0)
        )
        last_due1 = timer1.last_due
        last_due2 = timer2.last_due

        Timer.produce_next_due("pipeline", event_handler=test_event_handler)
        timer1.refresh_from_db()
        timer2.refresh_from_db()
        self.assertEqual(timer1.last_due, last_due1)
        self.assertEqual(
            timer2.last_due, datetime(2021, 1, 1, 1).replace(tzinfo=pytz.UTC)
        )
        self.assertEqual(ctx['se'].timer.id, timer2.id)
        self.assertEqual(ctx['se'].tenant.id, self.tenant.id)
        self.assertEqual(ctx['se'].due, datetime(2021, 1, 1, 1).replace(tzinfo=pytz.UTC))
        self.assertEqual(ctx['se'].acked, False)
        self.assertEqual(ctx['se'].topic, "pipeline")
        self.assertEqual(ctx['se'].context, "{}")
        self.assertEqual(ctx['se'].category, "")
