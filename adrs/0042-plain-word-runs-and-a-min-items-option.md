---
type: Architecture Decision
title: A run of five or more plain-word items is a hidden list, and every run rule takes a minItems option
description: list-comma-plain-run reports long plain series, and minItems sets each run rule's threshold
tags: [rules, list, fix, config]
status: accepted
accepted_on: 2026-10-25
provenance: Asked for once list-comma-code-run left plain-word lists unreported, with a threshold of five and a way to tune every run rule
enforced_in:
  - src/rules/list-comma-plain-run.ts, which counts the closing run and refuses without a colon lead-in
  - src/rules/options.ts, where every run rule's check and fix read minItems the same way
  - src/rules/registry.ts, which rejects a minItems below 2 or not whole, and claims interpunct runs by it
  - tests/list-options.test.ts, which lowers and raises each run rule's threshold and checks both halves agree
  - tests/check.test.ts and tests/adversarial/lists.test.ts, which pin what the plain rule counts and refuses
generated: { by: human:maintainer, at: 2026-10-25T00:00:00Z }
---

<!-- GENERATED from PRS-0042 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Extends [PRS-0041](0041-a-comma-run-of-code-spans-is-a-hidden-list.md) (the plain-word list its unless clause left for a new record, told from a series by its length)
- Extends [PRS-0018](0018-config-file-and-rule-control.md) (minItems is a rule option in the existing config, checked like maxWords and maxSentences)

## Decision

### The lens

#### Given

plain-word series are mostly ordinary English, and a long one is mostly a list

#### We prefer

a plain-word run rule at five items by default, and a minItems option on every run rule

#### Because

length is what tells a list from a series, and where that line sits is each project's call

#### Unless

a project needs a different threshold per file, which calls for overrides and a new record

## Consequences

### Pros

- A list of service names or channels without backticks is now reported once it is long.
- A project can tune each run rule up or down without switching it off.

### Cons

- Without a colon the first item is never counted, so the rule can report a run one item late.
- An interpunct run below the flat rule's minItems goes back to punctuation-interpunct-in-prose, so raising it can turn list findings into glyph findings.
