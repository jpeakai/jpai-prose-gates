---
type: Architecture Decision
title: A comma-joined run of three or more inline code spans is a hidden list, and plain words stay prose
description: The check flags the run anywhere, and the fix promotes it only when it closes a sentence
tags: [rules, list, fix]
status: accepted
accepted_on: 2026-10-24
provenance: Issue 25, where a run of bare code spans after a colon passed every list rule
enforced_in:
  - src/rules/list-comma-code-run.ts, which counts the run in prose and finds the closing run in the source
  - tests/check.test.ts, which pins what fires and what does not, from two items to labelled segments
  - tests/adversarial/lists.test.ts, which pins each refusal and the emphasised lead-in colon
  - tests/fixtures/fix/list-comma-code-run-nested-in-list-item, the run inside a list item that nests
generated: { by: human:maintainer, at: 2026-10-24T00:00:00Z }
---

<!-- GENERATED from PRS-0041 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Extends [PRS-0004](0004-a-fixer-refuses-when-unsure.md) (a run mid-sentence, without a lead-in, or opening inside a link or emphasis is refused)
- See also [PRS-0037](0037-a-check-reports-every-line-its-fixer-changes.md) (the check reports runs the fix refuses, so a refused run stays reported rather than silently passing)

## Decision

### The lens

#### Given

comma-joined items that are each only an inline code span, with an optional "and" or "or" before the last

#### We prefer

a list rule for code-span runs only, over one for any series of plain words

#### Because

a scan of this repo's docs found 40 plain-word series, all ordinary English, against 15 code-span runs, all real lists

#### Unless

a plain-word list can be told from a series by its words alone, which calls for a new record and its own rule

## Consequences

### Pros

- A run of file names, flags or keys becomes a list a reader can scan.
- Labelled runs stay with list-comma-labelled-run, because a code span followed by content is no bare item.

### Cons

- A bare list of plain words, such as service names without backticks, still passes.
- A run mid-sentence is reported with no fix, so the author rewrites it by hand.
