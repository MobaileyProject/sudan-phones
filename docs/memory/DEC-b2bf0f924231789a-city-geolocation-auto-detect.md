+++
id = "DEC-b2bf0f924231789a"
title = "City geolocation auto detect"
created = "2026-11-20"
topic = "city-geolocation-auto-detect"
paths = ["*"]
+++
City selection invariant updated with native OS reverse-geocoded city identification and manual fallback (Option 1).
`GET /api/v1/config` (API-019) exposes administrative `aliases` for each supported pilot city:
- Port Sudan (aliases: "port sudan", "portsudan", "بورتسودان", "red sea", "البحر الأحمر", "البحر الاحمر")
- Khartoum (aliases: "khartoum", "الخرطوم", "khartoum state", "ولاية الخرطوم")
- Omdurman (aliases: "omdurman", "أم درمان", "ام درمان", "امدرمان", "أمدرمان")

Clients resolve device coordinates directly to administrative city/region names using native OS
geocoding (e.g. Location.reverseGeocodeAsync) with zero math/radius estimation.
If the resolved name matches any alias, the city is auto-selected.
If the device location is outside pilot regions or permission is denied/unavailable, the app
prompts the user to manually select their preferred market. Users can manually override at any time.
OpenAPI components, API catalog, documentation, and live Slack API Contracts List F0CHJB5C939 updated.
