+++
id = "HND-ddbb7c34ead98af2"
title = "Implement the first approved-store slice after product confirmation"
created = "2026-11-16"
paths = ["backend/", "android/", "web/"]
refs = ["file:docs/archive/STATE-20261116.md", "commit:b69124d4353f478b4c2ca13b44028531456af5df"]
status = "open"
+++
The application is not scaffolded. After explicit stack/product confirmation, add pinned backend dependencies, domain layers, single-head Alembic and PostgreSQL tests, then initialize native Android and Web Preview. Export and commit real OpenAPI only once the backend exists. Package validation is not runtime evidence.
