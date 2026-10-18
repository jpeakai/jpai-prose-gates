---
type: Architecture Decision
title: Each rule carries a category, and RULES.md is held true by a test
description: Rules are tagged sentence, list or punctuation, and their documented examples run through the real fixer
tags: [rules, docs, layout]
status: accepted
accepted_on: 2026-09-14
provenance: Raised when extracting concrete rule examples out of the README into their own page
enforced_in:
  - src/rules/types.ts, where CATEGORIES and the category field are declared
  - src/cli.ts, which groups the help output by category
  - tests/rules-doc.test.ts, which runs every RULES.md example through the fixer
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0011 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Extends [PRS-0008](0008-one-file-per-rule.md) (a category is a field on the rule module, never a folder, so files stay named by rule id)
- Extended by [PRS-0017](0017-rule-ids-are-category-and-short-name.md) (the category is now the first word of a rule id)
- Extended by [PRS-0021](0021-plugins-declare-their-categories.md) (a plugin adds a category by declaring it)

## Decision

### The lens

#### Given

rules need grouping and each fix needs a concrete example

#### We prefer

a category field on every rule and a RULES.md whose examples a test replays, over hand-maintained tables

#### Because

a replayed example cannot claim a fix the engine does not make

#### Unless

a rule fits no category, which calls for a new category rather than a catch-all

## Consequences

### Pros

- The documentation fails the build the moment a fixer changes its output.

### Cons

- Examples in RULES.md are limited to a text fence with a label in its info string.
