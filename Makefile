PYTHON ?= python3

.PHONY: check secrets test lint skills-check openapi openapi-check

check: secrets test lint skills-check openapi-check

secrets:
	$(PYTHON) scripts/check_secrets.py

test:
	$(PYTHON) -m unittest discover -s tests -v

lint:
	$(PYTHON) -m compileall -q scripts tests
	$(PYTHON) -m json.tool docs/bugs/SCHEMA.json > /dev/null

skills-check:
	$(PYTHON) scripts/check_skills.py

openapi:
	$(PYTHON) scripts/export_openapi.py

openapi-check:
	$(PYTHON) scripts/export_openapi.py --check
