---
type: Architecture Decision
title: A module groups functions by what they take, not by who calls them
description: Shared code sits in the layer whose data it reads, and the layers import strictly downwards
tags: [architecture]
status: accepted
accepted_on: 2026-09-14
provenance: Raised when the first attempt at this, grouping helpers by which half of a rule called them, was tested against the import graph and did not hold
enforced_in:
  - src/text.ts, which takes strings and ranges and imports nothing
  - src/model.ts, which takes source and returns the views
  - src/query.ts, which takes the model and answers what may be read and where it sits
  - src/interpunct.ts, which takes the model and returns the one shared derivation
  - src/fix/, which takes a view and a span and returns edits
  - docs/DATA_MODEL.md, whose helper table names the layer for every shared helper
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0016 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Depends on [PRS-0015](0015-a-rule-reads-one-shared-context.md) (the context says what a rule is handed, and this says where the code that reads it lives)
- Depends on [PRS-0008](0008-one-file-per-rule.md) (a helper leaves its rule module only once a second rule needs it)
- Depended on by [PRS-0031](0031-code-complexity-is-gated-by-biome.md) (a function split for the complexity limits places its helpers by this rule)

## Decision

### The lens

#### Given

shared code has to live somewhere a reader can predict

#### We prefer

grouping by the data a function takes, over grouping by which half of a rule calls it

#### Because

the arguments are visible in the signature, while the callers are not

#### Unless

a derivation has its own vocabulary, which earns it a named module of its own

## Consequences

### Pros

- src/rules/ holds the contract, the catalogue and the nine gates, and nothing else.
- A module name is checkable, because a reader confirms it from the signatures inside rather than by finding the callers.

### Cons

- The move rewrote every import in the package at once.
- Sharing a helper costs an import edge where duplication cost none, so a rule now names more modules than it did.
