---
type: Architecture Decision
title: Every fix is verified against a content fingerprint and an expected shape
description: A lost word throws, and an unexpected tree shape refuses the edit before it is applied
tags: [fixing, safety, verification]
status: accepted
accepted_on: 2026-09-14
provenance: Designed with the fixpoint engine, and later tightened when property tests showed an interpunct swap making a marker count as a word
enforced_in:
  - src/fix/verify.ts, which compares fingerprints and expected shapes
  - src/fix/engine.ts, which reparses after each edit and throws FixInvariantError on a content change
  - tests/property/fix.test.ts, which asserts the fingerprint is preserved on generated documents
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0005 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A fixer is a heuristic, and heuristics have bugs.
> The engine checks the result instead of trusting the rule that produced it.

## Relates to

- Depends on [PRS-0003](0003-splice-source-never-restringify.md) (verification is cheap because an edit is a single spliced range)
- Extends [PRS-0004](0004-a-fixer-refuses-when-unsure.md) (the engine refuses on behalf of a fixer that did not)
- Depended on by [PRS-0006](0006-sentence-length-is-never-autofixed.md) (a length fix would change the fingerprint)
- Tested by [PRS-0009](0009-adversarial-and-property-tests-gate-fixes.md) (properties assert the fingerprint is preserved)

## Problem

### Symptom

A fixer bug could drop a word, create emphasis from a stray asterisk, or split one paragraph into two.

### Pain point

The damage looked like formatting, so nothing downstream noticed it.

## Decision

### The lens

- **Given**: an edit is about to be written back to a file
- **We prefer**: reparsing the result and comparing its words, urls and code to the original, over trusting the fixer's own logic
- **Because**: a changed fingerprint is a tool bug that must fail loudly, while a shape mismatch is an unforeseen case
- **Unless**: never

### In practice

- The fingerprint is every word, url, alt text and code value in order, ignoring enumeration markers and joining conjunctions.
- A changed fingerprint throws FixInvariantError, which fails the run.
- Each edit declares same-tree, same-shape or replace-paragraph, and a mismatch refuses that edit.
- Fixes run to a fixpoint in a fixed rule order, one verified pass at a time.

## Consequences

### Pros

- A fixer bug surfaces as a crash instead of a silent content change.

### Cons

- Every edit costs a reparse of the document.
- The fingerprint must know which tokens a fix may legitimately remove.
