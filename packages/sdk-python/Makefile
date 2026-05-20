.PHONY: lint typecheck test build prepublish

lint:
	python -m py_compile docuforge/client.py docuforge/errors.py docuforge/types.py

typecheck:
	python -m mypy docuforge/ --ignore-missing-imports || true

test:
	python -m pytest

build:
	python -m build

prepublish: lint test build
