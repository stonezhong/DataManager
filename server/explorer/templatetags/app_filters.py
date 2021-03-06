from django import template
from datetime import date, timedelta
import json

register = template.Library()

@register.filter(name='filesize')
def filesize(value):
    if value is None:
        return ""

    if value < 1000:
        return str(value) + "B"

    if value < 1000000:
        return '{:.2f}'.format(round(value / 1000.0, 2)) + " KB"

    if value < 1000000000:
        return '{:.2f}'.format(round(value / 1000000.0, 2)) + " MB"

    if value < 1000000000000:
        return '{:.2f}'.format(round(value / 1000000000.0, 2)) + " GB"

    return '{:.2f}'.format(round(value / 1000000000000.0, 2)) + " TB"

# convert object to json
@register.filter(name='user_to_json')
def user_to_json(user):
    return json.dumps({
        'name': user.username,
        'id': user.id,
        'is_superuser': user.is_superuser
    })
