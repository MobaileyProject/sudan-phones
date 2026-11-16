PYTHON ?= python3

.PHONY: check secrets test lint skills-check openapi openapi-check context-check backend-check backend-test

check: secrets test lint skills-check openapi-check context-check backend-check backend-test

secrets:
	$(PYTHON) scripts/check_secrets.py

test:
	$(PYTHON) -m unittest discover -s tests -v

lint:
	$(PYTHON) -m compileall -q scripts tests backend
	$(PYTHON) -m json.tool docs/bugs/SCHEMA.json > /dev/null

skills-check:
	$(PYTHON) scripts/check_skills.py

openapi:
	$(PYTHON) scripts/export_openapi.py

openapi-check:
	$(PYTHON) scripts/export_openapi.py --check

context-check:
	$(PYTHON) scripts/ctx.py lint
	$(PYTHON) scripts/context_migration.py

backend-check:
	@if [ -f backend/manage.py ]; then $(PYTHON) backend/manage.py check; else echo "SKIP backend check: scaffold pending"; fi

backend-test:
	@if [ -f backend/manage.py ]; then $(PYTHON) backend/manage.py test core; else echo "SKIP backend test: scaffold pending"; fi
