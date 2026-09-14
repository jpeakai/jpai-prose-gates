.PHONY: install build fix ci typecheck test test-cov-ts docs-ci

install:
	uv sync
	bun install

# Bundle the CLI and the library for Node, which will not strip types from a
# package inside node_modules. Bun consumers import src directly, and dist is
# built again when the package is packed, so git never tracks it.
build:
	bun build src/bin.ts --target=node --format=esm --outfile dist/bin.js
	bun build src/index.ts --target=node --format=esm --outfile dist/index.js

# Regenerate and autofix everything that can be: formatting, lint and the
# decision bundle. Safe to run at any time.
fix:
	bunx --bun @biomejs/biome check --write src tests
	uv run meta adr render

typecheck:
	bunx --bun tsc --project tsconfig.json --noEmit

# The Node tests run dist, so every test target builds it first.
test: build
	bun test

# Bun's own threshold is per file, so the aggregate gate is enforced here from
# the "All files" row: both the function and the line column must reach 90.
test-cov-ts: build
	@mkdir -p tmp
	@bun test --coverage > tmp/coverage.txt 2>&1; status=$$?; cat tmp/coverage.txt; \
	test "$$status" -eq 0 || exit "$$status"; \
	awk -F'|' '/^All files/ { if ($$2 + 0 < 90 || $$3 + 0 < 90) { print "ERROR: coverage below 90%"; exit 1 } found = 1 } \
		END { if (!found) { print "ERROR: no coverage summary"; exit 1 } }' tmp/coverage.txt

# Regenerate, gate, then assert the tree is clean: a generated file that
# differs means someone hand-edited it, or a source changed without it.
ci: fix typecheck test-cov-ts
	@test -z "$$(git status --porcelain)" || { \
		git status --short; \
		echo "ERROR: regenerate left the tree dirty - commit the generated files"; \
		exit 1; }

# Prose gates over every markdown file, generated output included. This repo
# gates its own docs with its own source, never a published copy.
DOCS := $(wildcard *.md) $(wildcard docs/*.md) $(wildcard adrs/*.md)

docs-ci:
	bun run src/bin.ts $(DOCS)
