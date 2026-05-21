.PHONY: lint typecheck test build prepublish

lint:
	python -m py_compile deckle/client.py deckle/errors.py deckle/types.py

typecheck:
	python -m mypy deckle/ --ignore-missing-imports || true

test:
	python -m pytest

build:
	python -m build

prepublish: lint test build
