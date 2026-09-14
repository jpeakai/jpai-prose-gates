---
type: Architecture Decision
title: A module groups functions by what they take, not by who calls them
description: Shared code sits in the layer whose data it reads, and the layers import strictly downwards
tags: [architecture]
status: accepted
accepted_on: 2026-09-14
provenance: Raised when PRS-0016 was tested against the import graph and failed, one commit after it was accepted
enforced_in:
  - src/text.ts, which takes strings and ranges and imports nothing
  - src/model.ts, which takes source and returns the views
  - src/query.ts, which takes the model and answers what may be read and where it sits
  - src/interpunct.ts, which takes the model and returns the one shared derivation
  - src/fix/, which takes a view and a span and returns edits
  - docs/DATA_MODEL.md, whose helper table names the layer for every shared helper
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0017 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A folder name is a claim about what is inside it.
> The claim has to survive someone reading the imports.

## Relates to

- Supersedes [PRS-0016](0016-a-shared-helper-sits-on-its-own-side.md) (the same question answered by the data a function takes rather than the half that calls it)
- Depends on [PRS-0008](0008-one-file-per-rule.md) (a helper leaves its rule module only once a second rule needs it)

## Problem

### Symptom

rules/utils.ts imported from fix/spans.ts, so the side a helper was said to serve did not match the side it lived on.

### Pain point

fix/ held six helpers that no fixer used. first and last were imported by six rules and no fix module, and every list rule needed four import lines to say what it wanted.

## Decision

### The lens

- **Given**: shared code has to live somewhere a reader can predict
- **We prefer**: grouping by the data a function takes, over grouping by which half of a rule calls it
- **Because**: the arguments are visible in the signature, while the callers are not
- **Unless**: a derivation has its own vocabulary, which earns it a named module of its own

### In practice

- text.ts takes strings and ranges and imports nothing at all.
- query.ts takes the model or a view and answers a read-only question.
- interpunct.ts is the one named derivation, so it sits beside query.ts rather than among the rules.
- fix/ holds only what builds or verifies an edit.
- The layers import strictly downwards, so a cycle is a design error rather than a warning.

## Consequences

### Pros

- src/rules/ holds the contract, the catalogue and the nine gates, and nothing else.
- A rule imports three modules where it imported four, and each name says what it is.

### Cons

- The move rewrote every import in the package at once.
