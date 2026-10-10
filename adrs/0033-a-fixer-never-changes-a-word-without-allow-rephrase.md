---
type: Architecture Decision
title: A fixer never changes a word unless the run passes an explicit --allow-rephrase flag
description: Deleting or swapping words stays out of --fix, and the first fixer that does it adds the flag
tags: [fixing, verification, cli]
status: accepted
accepted_on: 2026-10-10
provenance: Decided in review of the research on issue 8, which asked whether tells with a fixed phrase could be deleted or swapped
enforced_in:
  - src/fix/verify.ts, whose fingerprint check throws when a word is lost, so no fixer can change one today
  - docs/DATA_MODEL.md, which lists the proofs a fixer may claim, none of which allows a changed word
generated: { by: human:maintainer, at: 2026-10-10T00:00:00Z }
---

<!-- GENERATED from PRS-0033 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A proof that no word was lost is what makes --fix safe to run on a document nobody rereads.
> A fixer that deletes or swaps a word would need a different promise, and the promise should be asked for by name.

## Relates to

- Extends [PRS-0005](0005-every-fix-is-verified.md) (the word fingerprint stays the default, and a flag is the only way to relax it)

## Problem

### Symptom

Stock closers, chat wrappers and verb swaps look fixable, but each changes a word.

### Pain point

Letting a tag, a list or a lexicon authorise a change would erode the one guarantee of --fix.

## Decision

### The lens

- **Given**: some fixes delete a listed sentence or swap a word from a closed map
- **We prefer**: refusing a word change unless the run passes --allow-rephrase over letting a list or a tag authorise it
- **Because**: no deterministic proof shows that a swap keeps the meaning, so the author must say they accept that
- **Unless**: the flag is passed, and then only a fixer that declares a proof kind for the change may act

### In practice

- --fix never changes a word, a url or a code value, as before.
- No fixer that changes a word exists today.
- The first such fixer adds the --allow-rephrase flag and a proof kind of its own, in the same change.
- A part-of-speech tag or a lexicon match never authorises a word change by itself.
- A fixer under the flag still refuses a case it cannot read unambiguously.

## Consequences

### Pros

- --fix keeps its promise, and a word change is always a choice somebody made.

### Cons

- Tells with a fixed phrase stay report-only until the flag and its proofs exist.
