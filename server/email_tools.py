import json
import smtplib
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os

import urllib.parse
import jinja2

from django.conf import settings
from config import get_mordor_config_json_template

def send_email(recipients, subject, text_content, html_content):
    smtp_cfg = get_mordor_config_json_template("smtp.json")

    msg = MIMEMultipart("alternative")
    msg['Subject'] = subject
    msg['From'] = smtp_cfg['sender']
    msg['To'] = ', '.join(recipients)

    text_part = MIMEText(text_content, "plain")
    html_part = MIMEText(html_content, "html")
    msg.attach(text_part)
    msg.attach(html_part)

    s = smtplib.SMTP(
        smtp_cfg['smtp_server'],
        smtp_cfg['smtp_port']
    )
    s.ehlo()
    s.starttls()
    s.ehlo()
    s.login(smtp_cfg['login'], smtp_cfg['password'])
    s.send_message(msg)
    s.quit()


def send_signup_validate_email(user, token):
    url = os.path.join(settings.BASE_URL, "explorer", "signup-validate") + "?" + urllib.parse.urlencode({
        'username': user.username,
        'token': token,
    })

    email_content = """\
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <link rel="stylesheet" href="style.css">
    <title>Data Manager Signup</title>
</head>
<body>
    <p>
    Hi {{username}}:
    </p>
    <p>
        Welcome to Data Manager! Please click the <a href="{{url}}">link here</a> to activate your account!
    </p>
</body>
</html>"""

    template = jinja2.Template(email_content)
    rendered_content = template.render({
        "url": url,
        "username": user.username
    })

    send_email(
        [user.email],
        "Data Manager: Please validate your account",
        "Please validate your account",
        rendered_content
    )
