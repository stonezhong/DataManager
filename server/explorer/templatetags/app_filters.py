from django import template
from datetime import date, timedelta

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
