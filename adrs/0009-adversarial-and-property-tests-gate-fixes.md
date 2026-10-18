---
type: Architecture Decision
title: Adversarial and property tests gate every change to fix behaviour
description: Fix behaviour is proven by exact fixtures, hostile inputs and generated documents, all without mocks
tags: [testing, fixing]
status: accepted
accepted_on: 2026-09-14
provenance: Written alongside the new fixers, where adversarial suites found eight meaning-changing bugs that the fixtures had passed
enforced_in:
  - tests/fixtures/fix, exact input and expected pairs checked for idempotence
  - tests/adversarial, hostile inputs grouped by containers, glyphs, lists and reflow
  - tests/property/fix.test.ts, fast-check documents at 400 runs per property
  - the test-cov-ts target, which fails below 90 percent aggregate coverage
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0009 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Tests [PRS-0004](0004-a-fixer-refuses-when-unsure.md) (the refuses helper asserts untouched output)
- Tests [PRS-0005](0005-every-fix-is-verified.md) (properties assert the fingerprint is preserved)
- Depended on by [PRS-0037](0037-a-check-reports-every-line-its-fixer-changes.md) (the one-per-line gap was reproduced by an adversarial test before its fix)

## Decision

### The lens

#### Given

a change touches how any rule fixes prose

#### We prefer

exact fixtures, adversarial suites and generated property tests together, over example tests alone

#### Because

each layer catches a class of bug the others miss, and a regression becomes a named test

#### Unless

never

## Consequences

### Pros

- A fixer bug usually fails a property before it reaches a document.

### Cons

- The suite is slower than example tests alone.
- A property counterexample can take time to shrink into a readable test.
