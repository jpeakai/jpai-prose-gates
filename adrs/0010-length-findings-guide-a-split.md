---
type: Architecture Decision
title: A sentence length finding estimates clauses to guide a split
description: PG002 reports potential clauses and a target sentence count, steering a rewrite away from compression
tags: [rules, messages, agents]
status: accepted
accepted_on: 2026-09-14
provenance: Raised after noticing that agents answered PG002 by compacting sentences into terse fragments instead of splitting them
enforced_in:
  - src/rules/pg002-length.ts, through countClauses and lengthMessage
  - tests/check.test.ts, which pins the clause count and the message
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0010 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A finding is also an instruction.
> An agent told only that a sentence is too long cuts words until it fits, and the result reads like a telegram.

## Relates to

- Extends [PRS-0006](0006-sentence-length-is-never-autofixed.md) (the rule stays report-only, and its message now carries the guidance a human or agent needs)

## Problem

### Symptom

A PG002 message gave only a word count and a budget.

### Pain point

The cheapest way to meet a word budget is to delete words, so rewrites lost articles, connectives and meaning.

## Decision

### The lens

- **Given**: a sentence exceeds the word budget and a human or an agent must rewrite it
- **We prefer**: reporting potential clauses and a target sentence count, over reporting the word count alone
- **Because**: a count of clauses names where the sentence can split, which makes splitting easier than compressing
- **Unless**: a real parser becomes deterministic enough to replace the heuristic, which would supersede the counting method only

### In practice

- A clause boundary is a semicolon or colon with text after it, a comma before a coordinating conjunction, or a subordinating word.
- The target is the largest of two, the clause count and the word count divided by the budget.
- The count is labelled potential, because an Oxford comma in a list also reads as a boundary.

## Consequences

### Pros

- Rewrites keep their connective words and read as prose.
- The message stays deterministic, with no model or dependency.

### Cons

- The heuristic overcounts lists and undercounts clauses joined without a marker word.
