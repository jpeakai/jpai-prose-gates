---
type: Architecture Decision
title: A fixer refuses whenever the input is ambiguous
description: An unfixable case leaves the source untouched and the finding reported, never a best guess
tags: [fixing, safety]
status: accepted
accepted_on: 2026-09-14
provenance: The adversarial suites found eight cases where a confident rewrite changed meaning, including cross-references promoted to lists and numeric ranges turned into colons
enforced_in:
  - every fix function in src/rules, which returns no edit for an ambiguous paragraph
  - tests/adversarial, whose refuses helper asserts the output equals the input
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0004 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A wrong autofix is worse than no autofix.
> The finding still asks a human, while a silent rewrite changes meaning nobody reviewed.

## Relates to

- Extended by [PRS-0005](0005-every-fix-is-verified.md) (the engine refuses on behalf of a fixer that did not)
- Depended on by [PRS-0007](0007-em-dash-becomes-parentheses-or-colon.md) (the em-dash fixer refuses every shape outside two)
- Tested by [PRS-0009](0009-adversarial-and-property-tests-gate-fixes.md) (the refuses helper asserts untouched output)

## Problem

### Symptom

Heuristics that looked right on typical prose rewrote paired cross-references into a numbered list.

### Pain point

The fix passed every gate, so the changed meaning shipped without anyone reading it.

## Decision

### The lens

- **Given**: a fixer cannot be sure its rewrite keeps the author's meaning
- **We prefer**: refusing and leaving the finding reported, over applying the most likely rewrite
- **Because**: the check still fails, so a human sees the case, while a wrong fix hides it permanently
- **Unless**: never

### In practice

- Escapes, hard breaks, tables, blockquotes and mixed marker families make a fixer refuse.
- A refusal is a normal outcome, reported as a remaining finding.
- Every new refusal condition comes with an adversarial test.

## Consequences

### Pros

- An applied fix can be trusted without reading the diff line by line.

### Cons

- Some fixable prose stays reported until a human edits it.
