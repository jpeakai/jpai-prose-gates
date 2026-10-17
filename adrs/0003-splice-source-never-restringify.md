---
type: Architecture Decision
title: Fixes splice source slices and never re-stringify the tree
description: An edit replaces a byte range with text built from source slices, so untouched bytes stay identical
tags: [fixing, architecture]
status: accepted
accepted_on: 2026-09-14
provenance: Chosen while splitting the monolith, after weighing mdast-util-to-markdown and remark-stringify as the output path
enforced_in:
  - src/fix/engine.ts, which applies edits as start, end and text over the source string
  - src/fix/promote.ts, which builds list items from sliced source rather than from node values
  - the property suite, which asserts fenced code stays byte-identical
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0003 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Depends on [PRS-0001](0001-parse-once-to-mdast.md) (slices are addressed through the offsets the parsed tree supplies)
- Depended on by [PRS-0005](0005-every-fix-is-verified.md) (one spliced range is cheap to verify)

## Decision

### The lens

#### Given

a rule wants to change a small part of a document

#### We prefer

splicing a replacement built from source slices into the original text, over editing the tree and stringifying it

#### Because

every byte outside the edit is preserved by construction, so the diff is exactly the fix

#### Unless

no source slice can express the change, in which case the rule refuses rather than generating markup

## Consequences

### Pros

- Fix diffs are minimal and reviewable.
- The fixer coexists with any other markdown formatter.

### Cons

- Each fixer must reason about offsets, escapes and line endings itself.
- Overlapping edits cannot be combined and must wait for the next pass.
