from datetime import datetime, timedelta
import pytz
from django.contrib.auth.models import User

from main.models import Tenant

# Useful test tools, so we do not repeat it again and again
def create_test_user(name=None):
    return User.objects.create_user(username=name, password='12345')

def create_tenant(user=None, name=None, description=None):
    return Tenant.create(user, name, description, "{}", False)

def now_utc():
    return datetime.utcnow().replace(tzinfo=pytz.UTC)

