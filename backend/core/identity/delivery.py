"""Explicit WhatsApp authentication template / SMTP adapters. Never log codes."""

import json
import re
from urllib.request import Request, urlopen
from django.conf import settings
from django.core.mail import send_mail
from core.common.domain import require


def deliver_otp(destination, code):
    if "@" in destination:
        delivered = send_mail(
            "Souq Phone verification",
            f"رمز التحقق / Verification code: {code}\nExpires in 5 minutes.",
            settings.DEFAULT_FROM_EMAIL,
            [destination],
            fail_silently=False,
        )
        require(delivered == 1, "DELIVERY_UNAVAILABLE", 503)
        return
    require(
        all(
            [
                settings.WHATSAPP_ACCESS_TOKEN,
                settings.WHATSAPP_PHONE_NUMBER_ID,
                settings.WHATSAPP_API_VERSION,
                settings.WHATSAPP_OTP_TEMPLATE,
            ]
        ),
        "DELIVERY_UNAVAILABLE",
        503,
    )
    require(
        re.fullmatch(r"v[0-9]+\.[0-9]+", settings.WHATSAPP_API_VERSION)
        and settings.WHATSAPP_PHONE_NUMBER_ID.isdigit(),
        "DELIVERY_UNAVAILABLE",
        503,
    )
    body = {
        "messaging_product": "whatsapp",
        "to": destination.lstrip("+"),
        "type": "template",
        "template": {
            "name": settings.WHATSAPP_OTP_TEMPLATE,
            "language": {"code": settings.WHATSAPP_TEMPLATE_LANGUAGE},
            "components": [
                {"type": "body", "parameters": [{"type": "text", "text": code}]},
                {
                    "type": "button",
                    "sub_type": "url",
                    "index": "0",
                    "parameters": [{"type": "text", "text": code}],
                },
            ],
        },
    }
    request = Request(
        f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": "Bearer " + settings.WHATSAPP_ACCESS_TOKEN,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(request, timeout=10) as response:
        result = json.loads(response.read(65536))
    require(bool(result.get("messages")), "DELIVERY_UNAVAILABLE", 503)
