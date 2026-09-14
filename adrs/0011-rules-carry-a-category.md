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

> **Lens**: Nine rule ids say nothing about which rules share a purpose.
> Five of them promote a hidden list, and a reader should see that at a glance.

## Relates to

- Extends [PRS-0008](0008-one-file-per-rule.md) (a category is a field on the rule module, never a folder, so files stay named by rule id)

## Problem

### Symptom

The README listed nine rules in id order with a one-line fix each.

### Pain point

A one-line summary cannot show what a fix writes, and a hand-written example drifts from the code.

## Decision

### The lens

- **Given**: rules need grouping and each fix needs a concrete example
- **We prefer**: a category field on every rule and a RULES.md whose examples a test replays, over hand-maintained tables
- **Because**: a replayed example cannot claim a fix the engine does not make
- **Unless**: a rule fits no category, which calls for a new category rather than a catch-all

### In practice

- Sentence holds PG001 and PG002.
- List holds PG003, PG006, PG007, PG008 and PG009.
- Punctuation holds PG004 and PG005.
- A before block must be followed by its after block, and a reported block must fire and survive a fix run.

## Consequences

### Pros

- The documentation fails the build the moment a fixer changes its output.

### Cons

- Examples in RULES.md are limited to a text fence with a label in its info string.
