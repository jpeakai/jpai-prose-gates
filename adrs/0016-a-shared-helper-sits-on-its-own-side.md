---
type: Architecture Decision
title: A helper shared by rules sits on the side of the rule it serves
description: Helpers that read views and sentences live in rules/utils.ts, and helpers that read source offsets live in fix/
tags: [architecture, rules]
status: accepted
accepted_on: 2026-09-14
provenance: Raised during a second readability pass over the nine rule modules, which found the same paragraph filter and the same colon lookup written out in five and four rules
enforced_in:
  - src/rules/utils.ts, which holds the helpers that read views, sentences and counts
  - src/fix/spans.ts, ends.ts and promote.ts, which hold the helpers that read source offsets
  - src/rules/interpunct.ts, which holds the vocabulary of the one shared derivation
  - docs/DATA_MODEL.md, whose helper table names the module for every shared helper
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0016 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A rule has two halves that answer to different things.
> A reader should be able to tell which half a call belongs to without opening the file it came from.

## Relates to

- Depends on [PRS-0015](0015-a-rule-reads-one-shared-context.md) (the context says what a rule is handed, and this says where the code that reads it lives)
- Depends on [PRS-0008](0008-one-file-per-rule.md) (a helper leaves its rule module only once a second rule needs it)

## Problem

### Symptom

Five rules wrote out the same non-table paragraph filter, and four wrote out the same colon lookup.

### Pain point

A helper had no obvious home, so a rule kept its own copy and the copies drifted. PG005 and PG006 counted the same glyph two different ways.

## Decision

### The lens

- **Given**: a helper turns out to be needed by a second rule
- **We prefer**: moving it to the side whose data it reads, over a single grab-bag of shared code
- **Because**: the arguments a helper takes already say which half of a rule it serves
- **Unless**: only one rule needs it, which keeps it in that rule module

### In practice

- rules/utils.ts takes views, sentences and counts.
- fix/ takes source offsets and returns ranges or edits.
- A derivation with its own vocabulary gets a module, as interpunct.ts has.
- The helper table in docs/DATA_MODEL.md names the module for every shared helper.

## Consequences

### Pros

- A call site says which half of the rule it belongs to.
- A count a check reports and a count a fixer compares cannot drift apart.

### Cons

- Two places to look for a helper rather than one.
