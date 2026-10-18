---
type: Architecture Decision
title: Code complexity is gated by Biome rules that fail the build
description: Cognitive complexity, parameter count, test nesting and function length in src fail make check past fixed limits
tags: [quality, tooling]
status: accepted
accepted_on: 2026-10-17
provenance: Raised after a review found no complexity rule in biome.json, and many functions over the cognitive limit once one was switched on
enforced_in:
  - biome.json, which sets each limit at error level
  - Makefile, where make check runs biome check over src and tests
generated: { by: human:maintainer, at: 2026-10-17T00:00:00Z }
---

<!-- GENERATED from PRS-0031 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Depends on [PRS-0016](0016-modules-group-by-what-a-function-takes.md) (a long function splits into helpers that sit in the layer whose data they read)

## Decision

### The lens

#### Given

a function in src or tests is checked by make check

#### We prefer

Biome complexity rules at error level, over warnings or a separate tool

#### Because

Biome already gates the build, and an error is the only level this repo keeps

#### Unless

a rule produces findings that no refactor can fix without hiding the logic, which calls for a new record

## Consequences

### Pros

- A long fixer is split into steps a reviewer can check one at a time.
- The limits are in the one linter the repo already runs, with no new dependency.

### Cons

- Extracting helpers adds functions and names to the larger modules.
- The limits are numbers, so a function near one may be split where a human would not.
