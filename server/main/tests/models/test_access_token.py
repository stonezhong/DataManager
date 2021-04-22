from datetime import datetime, timedelta
import pytz
import mock

from django.contrib.auth.models import User
from django.test import TestCase
from django.db.utils import IntegrityError
from django.core.exceptions import ValidationError

from main.models import Tenant, AccessToken
from main.tests.models.tools import create_test_user, create_test_tenant, now_utc

class AccessTokenTestCase(TestCase):
    def setUp(self):
        self.now = now_utc()
        self.user = create_test_user(name='testuser')
        self.tenant = create_test_tenant(user=self.user, name="DL")
        self.tenant2 = create_test_tenant(user=self.user, name="DL2")

    @mock.patch('main.models.datetime')
    def test_create_token(self , mock_dt):
        mock_dt.utcnow = mock.Mock(return_value=datetime(2021, 1, 1))
        token = AccessToken.create_token(
            self.user, timedelta(days=1), AccessToken.Purpose.SIGNUP_VALIDATE
        )

        tokens = AccessToken.objects.filter(
            user=self.user,
            tenant=None,
            purpose=AccessToken.Purpose.SIGNUP_VALIDATE.value,
            create_time = datetime(2021, 1, 1).replace(tzinfo=pytz.UTC)
        )
        self.assertEqual(len(tokens), 1)
        token = tokens[0]
        self.assertEqual(
            token.expire_time,
            datetime(2021, 1, 1).replace(tzinfo=pytz.UTC) + timedelta(days=1)
        )
        self.assertNotEqual(token.content, None)

    @mock.patch('main.models.datetime')
    def test_authenticate_signup(self, mock_dt):
        mock_dt.utcnow = mock.Mock(return_value=datetime(2021, 1, 1))
        token = AccessToken.create_token(
            self.user, timedelta(days=1), AccessToken.Purpose.SIGNUP_VALIDATE
        )

        mock_dt.utcnow = mock.Mock(return_value=datetime(2021, 1, 1, 12, 0))
        self.assertTrue(
            AccessToken.authenticate(self.user, token, AccessToken.Purpose.SIGNUP_VALIDATE)
        )
        # if we mutate the token, authenticate will fail
        self.assertFalse(
            AccessToken.authenticate(self.user, token+"!", AccessToken.Purpose.SIGNUP_VALIDATE)
        )

        # if it expires, authentication will fail
        mock_dt.utcnow = mock.Mock(return_value=datetime(2021, 1, 2, 12, 0))
        self.assertFalse(
            AccessToken.authenticate(self.user, token, AccessToken.Purpose.SIGNUP_VALIDATE)
        )


    @mock.patch('main.models.datetime')
    def test_authenticate_api(self, mock_dt):
        mock_dt.utcnow = mock.Mock(return_value=datetime(2021, 1, 1))
        token = AccessToken.create_token(
            self.user, timedelta(days=1), AccessToken.Purpose.API_TOKEN, tenant=self.tenant
        )

        mock_dt.utcnow = mock.Mock(return_value=datetime(2021, 1, 1, 12, 0))
        self.assertTrue(
            AccessToken.authenticate(self.user, token, AccessToken.Purpose.API_TOKEN, tenant=self.tenant)
        )
        # if we mutate the token, authenticate will fail
        self.assertFalse(
            AccessToken.authenticate(self.user, token+"!", AccessToken.Purpose.API_TOKEN, tenant=self.tenant)
        )
        # fail if we use for wrong tenant
        self.assertFalse(
            AccessToken.authenticate(self.user, token, AccessToken.Purpose.API_TOKEN, tenant=self.tenant2)
        )

        # if it expires, authentication will fail
        mock_dt.utcnow = mock.Mock(return_value=datetime(2021, 1, 2, 12, 0))
        self.assertFalse(
            AccessToken.authenticate(self.user, token, AccessToken.Purpose.API_TOKEN, tenant=self.tenant)
        )

    def test_authenticate_invalid_purpose(self):
        token = AccessToken.create_token(
            self.user, timedelta(days=1), AccessToken.Purpose.RESET_PASSWORD
        )
        with self.assertRaises(ValidationError) as cm:
            AccessToken.authenticate(
                self.user,
                token,
                AccessToken.Purpose.RESET_PASSWORD
            )
        self.assertEqual(cm.exception.message, "Invalid access token purpose")

