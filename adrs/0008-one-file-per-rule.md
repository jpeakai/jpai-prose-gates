---
type: Architecture Decision
title: Each rule lives in its own file with its check and its fix together
description: A rule module exports its id, summary, check and optional fix, and a registry lists them in order
tags: [architecture, layout]
status: accepted
accepted_on: 2026-09-14
provenance: The single prose_gates.ts monolith was split, and archived under tmp/_archived/monolith-split
enforced_in:
  - src/rules/pg001-wrap.ts through src/rules/pg009-stacked-runs.ts
  - src/rules/index.ts, the registry
  - src/fix, which holds only machinery shared by more than one rule
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0008 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A rule's check and fix must agree on what counts as a finding.
> Keeping them side by side makes a disagreement visible in one diff.

## Relates to

- Extended by [PRS-0011](0011-rules-carry-a-category.md) (rules also carry a category, as a field rather than a folder)

## Problem

### Symptom

All nine rules and the CLI shared one file, so any change touched everything.

### Pain point

Adding fixers would have doubled the file, and shared helpers were impossible to test alone.

## Decision

### The lens

- **Given**: the package holds several independent rules that each gain a fixer
- **We prefer**: one module per rule named by id and slug, with shared machinery in src/fix, over grouping rules by theme in larger files
- **Because**: the rule id is how findings, tests and fixtures are named, so the file tree mirrors it
- **Unless**: two rules share a detector, in which case the detector moves to its own module, as interpunct.ts does

### In practice

- A rule file is named pgNNN-slug.ts.
- A fixture directory is named after the rule id it exercises.
- src/bin.ts holds the process glue, so tests import cli.ts without exiting.

## Consequences

### Pros

- A rule and its tests can be read without the rest of the package.

### Cons

- Fix ordering lives in the engine, away from the rules it orders.
