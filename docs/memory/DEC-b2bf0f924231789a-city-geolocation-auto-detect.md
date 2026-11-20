+++
id = "DEC-b2bf0f924231789a"
title = "City geolocation auto detect"
created = "2026-11-20"
topic = "city-geolocation-auto-detect"
paths = ["*"]
+++
City selection invariant updated with GPS-assisted auto-detection and manual fallback.
`GET /api/v1/config` (API-019) exposes `lat`, `lon`, and `radius_km` for each supported pilot city:
- Port Sudan (19.6158° N, 37.2164° E, radius 45 km)
- Khartoum (15.5007° N, 32.5599° E, radius 35 km)
- Omdurman (15.6500° N, 32.4833° E, radius 35 km)

Clients compute device distance locally; if within radius of a supported city, it auto-selects.
If the device location is outside pilot regions or permission is denied/unavailable, the app
prompts the user to manually select their preferred market. Users can manually override at any time.
OpenAPI components, API catalog, documentation, and live Slack API Contracts List F0CHJB5C939 updated.
