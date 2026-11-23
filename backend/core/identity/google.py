"""Google OAuth ID-token verification using stdlib HTTP (zero extra runtime deps)."""

import json
import urllib.error
import urllib.parse
import urllib.request
from django.conf import settings
from core.common.domain import DomainError, require


def verify_google_id_token(id_token: str) -> dict:
    """Verify a Google ID token via Google's tokeninfo endpoint and audience check."""
    client_ids = getattr(settings, "GOOGLE_OAUTH_CLIENT_IDS", [])
    require(bool(client_ids), "OAUTH_UNAVAILABLE", 503)
    url = "https://oauth2.googleapis.com/tokeninfo?" + urllib.parse.urlencode(
        {"id_token": id_token}
    )
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code in (400, 401):
            raise DomainError("INVALID_GOOGLE_TOKEN", 401) from None
        raise DomainError("OAUTH_UNAVAILABLE", 503) from None
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        raise DomainError("OAUTH_UNAVAILABLE", 503) from None

    aud = payload.get("aud", "")
    sub = payload.get("sub", "")
    email = (payload.get("email") or "").strip().lower()
    email_verified = str(payload.get("email_verified", "")).lower() == "true"
    require(
        aud in client_ids and bool(sub) and bool(email) and email_verified,
        "INVALID_GOOGLE_TOKEN",
        401,
    )
    return {
        "sub": sub,
        "email": email,
        "name": (payload.get("name") or email.split("@")[0])[:150],
    }
