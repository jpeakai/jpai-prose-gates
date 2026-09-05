.PHONY: fix ci install test

install:
	bun install

# Autofix what can be autofixed: formatting, lint, and the reflow gate itself.
fix:
	bunx --bun @biomejs/biome format --write src
	bunx --bun @biomejs/biome lint --write src

# Same gates, asserting rather than rewriting.
ci:
	bunx --bun @biomejs/biome format src
	bunx --bun @biomejs/biome lint src
	bunx --bun tsc --project tsconfig.json --noEmit
	bun test

test:
	bun test
