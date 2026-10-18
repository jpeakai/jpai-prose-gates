---
type: Architecture Decision
title: An em-dash pair becomes parentheses and a lone em-dash becomes a colon
description: PG004 rewrites only the two dash patterns whose replacement punctuation is unambiguous
tags: [rules, fixing, punctuation]
status: accepted
accepted_on: 2026-09-14
provenance: Chosen while adding fixers beyond PG001, and narrowed by adversarial tests on numeric ranges, markers and escaped dashes
enforced_in:
  - src/rules/pg004-em-dash.ts
  - tests/fixtures/fix/pg004-paired-aside and pg004-single-dash
  - tests/adversarial/glyphs.test.ts
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0007 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Depends on [PRS-0004](0004-a-fixer-refuses-when-unsure.md) (every pattern outside the two shapes is refused)

## Decision

### The lens

#### Given

a sentence in prose contains an em-dash

#### We prefer

replacing a pair with parentheses and a single dash with a colon, over reporting every dash for a manual rewrite

#### Because

those two shapes have one reading each, so the replacement keeps the meaning

#### Unless

the dash touches punctuation, sits between digits, shares a sentence with a colon, or brackets a marker

## Consequences

### Pros

- The most common glyph finding clears without a human.

### Cons

- The rule carries a growing list of refusal conditions.
