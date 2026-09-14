---
type: Architecture Decision
title: A check and a fix both read one context built once per document
description: Both halves of a rule read one RuleContext, so a check and its fix can never disagree about the document
tags: [architecture, rules]
status: accepted
accepted_on: 2026-09-14
provenance: Raised during a code-quality pass over the nine rule modules, which found four rules recomputing the interpunct runs inside their fixer
enforced_in:
  - src/rules/types.ts, which declares RuleContext, CheckContext and FixContext
  - src/rules/index.ts, whose ruleContext builds the shared data once
  - src/check.ts and src/fix/engine.ts, the two callers that build it
  - src/rules/pg001-wrap.ts, pg005-interpunct.ts, pg006-interpunct-run.ts and pg009-stacked-runs.ts, which now read runs from the context
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0015 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A check and its fix answer the same question at two moments.
> They can only stay honest if they read the same data, not their own copy of it.

## Relates to

- Depends on [PRS-0008](0008-one-file-per-rule.md) (the context is the argument the one-file-per-rule contract passes to both halves)
- Depends on [PRS-0001](0001-parse-once-to-mdast.md) (the shared data is derived from the model parsed once)
- Depended on by [PRS-0016](0016-a-shared-helper-sits-on-its-own-side.md) (where the code that reads the context lives)

## Problem

### Symptom

check received a context carrying the interpunct runs, while fix received only the document model.

### Pain point

Four fixers called interpunctRuns themselves on every pass of a loop bounded at ten thousand passes. PG005 asked the same question two different ways in its two halves.

## Decision

### The lens

- **Given**: several rules depend on data derived from the whole document rather than from one paragraph
- **We prefer**: deriving that data once per document into a RuleContext both halves receive, over letting each half compute what it needs
- **Because**: shared data is the only way the agreement between a check and its fix is structural rather than reviewed
- **Unless**: the data is local to one rule, which keeps it inside that module

### In practice

- RuleContext holds the document model and the interpunct runs.
- CheckContext extends it with the file name and the sentence budget.
- FixContext is RuleContext, because a fixer names no file.
- A new shared derivation is added to ruleContext, never recomputed in a rule.

## Consequences

### Pros

- The fixpoint loop derives the runs once per pass rather than once per rule.
- A rule module reads as data in, findings or edits out.

### Cons

- Shared data is computed for every document, including one no rule will read it for.
