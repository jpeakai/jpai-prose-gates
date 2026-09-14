---
type: Architecture Decision
title: Sentence length is reported and never autofixed
description: PG002 has no fixer, because shortening a sentence is a decision about what it means
tags: [rules, scope]
status: accepted
accepted_on: 2026-09-14
provenance: Agreed while scoping which rules could gain fixers, when PG002 was the one rule every proposed rewrite changed the wording of
enforced_in:
  - src/rules/pg002-length.ts, which exports a check and no fix
  - tests/property/fix.test.ts, which asserts no PG002 edit is ever applied
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0006 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: Every other rule changes punctuation or layout.
> Shortening a sentence means choosing what to cut, and that choice belongs to the author.

## Relates to

- Depends on [PRS-0005](0005-every-fix-is-verified.md) (the fingerprint forbids the word changes a length fix would need)
- Extended by [PRS-0010](0010-length-findings-guide-a-split.md) (the message estimates clauses to guide a split)

## Problem

### Symptom

Splitting a long sentence mechanically at a comma produces fragments, and cutting clauses drops content.

### Pain point

Either rewrite changes what the author said, which no gate is entitled to do.

## Decision

### The lens

- **Given**: a sentence exceeds the word budget
- **We prefer**: reporting the finding for a human to rewrite, over any mechanical split or trim
- **Because**: every shortening changes words, and the fingerprint rightly rejects any fix that changes words
- **Unless**: never

### In practice

- PG002 findings survive a fix run unchanged.
- The budget is tuned with the max-words flag rather than by relaxing the rule.

## Consequences

### Pros

- The fixer never rewrites meaning.

### Cons

- A fix run can finish with findings left, so CI still fails until a human edits.
