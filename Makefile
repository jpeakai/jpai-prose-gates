.PHONY: install build fix check ci typecheck test test-cov-ts docs-ci docs docs-serve theme evals-dry evals evals-compare clean

install:
	uv sync
	bun install

# Bundle the CLI and the library for Node, which will not strip types from a
# package inside node_modules. Bun consumers import src directly, and dist is
# built again when the package is packed, so git never tracks it.
build:
	bun build src/bin.ts --target=node --format=esm --outfile dist/bin.js
	bun build src/index.ts --target=node --format=esm --outfile dist/index.js
	bun build src/testing.ts --target=node --format=esm --outfile dist/testing.js

# Regenerate and autofix everything that can be: formatting, lint and the
# decision bundle. Safe to run at any time.
fix:
	bunx --bun @biomejs/biome check --write src tests
	uv run meta adr render

# The package gates, with no autofix and no private tooling, so GitHub Actions
# and npm prepublishOnly can run them with Bun alone. make ci adds the
# decision bundle render, whose meta CLI lives in a private repo.
check: typecheck test-cov-ts docs-ci
	bunx --bun @biomejs/biome check src tests

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
ci: fix typecheck test-cov-ts docs
	@test -z "$$(git status --porcelain)" || { \
		git status --short; \
		echo "ERROR: regenerate left the tree dirty - commit the generated files"; \
		exit 1; }

# Prose gates over every markdown file, generated output included. This repo
# gates its own docs with its own source, never a published copy.
DOCS := $(wildcard *.md) $(wildcard docs/*.md) $(wildcard adrs/*.md) site-theme/osakanights/README.md $(wildcard evals/*/*.md)

docs-ci:
	bun run src/bin.ts $(DOCS)

# The docs group alone, so a build needs neither the private meta CLI nor the
# dev group. The theme's colour tokens are checked first, so a hand edit to
# its stylesheet fails the build.
docs:
	bun run site-theme/osakanights/tokens.ts --check
	bun run scripts/assemble-site.ts
	uv run --only-group docs mkdocs build --strict

# Write the theme's colour tokens from design-tokens.json into its stylesheet.
theme:
	bun run site-theme/osakanights/tokens.ts

docs-serve:
	bun run scripts/assemble-site.ts
	uv run --only-group docs mkdocs serve

# Live agent evals of the finding messages: can an agent close the loop on a
# rule the fixer cannot settle, from the message alone, and in how many turns.
# The evals group alone, so a run needs neither the private meta CLI nor the
# docs group, and check and ci never run them. evals-dry lists the matrix and
# invokes nothing. It writes its report under tmp/evals-dry, so the last live
# run's report in .xharness_eval_cache stays as it was. evals runs it live:
# every cell is a billed agent session (claude and codex CLIs), so narrow the
# spend with ARGS, for example ARGS="--harness claude -k sentence_split".
EVALS := evals/prose-gates/evals

evals-dry:
	uv run --only-group evals pytest $(EVALS) --dry-run -o xharness_cache_dir=tmp/evals-dry

evals:
	uv run --only-group evals pytest $(EVALS) -v $(ARGS)

# Pass rate, mean turns and tool calls per case and model, one line per sweep,
# so two message variants compare side by side. CACHES lists the cache roots,
# the baseline first, for example CACHES=".xharness_eval_cache ../b/.xharness_eval_cache".
CACHES ?= .xharness_eval_cache

evals-compare:
	uv run --only-group evals evals/compare.py $(CACHES)

clean:
	rm -rf dist tmp node_modules
