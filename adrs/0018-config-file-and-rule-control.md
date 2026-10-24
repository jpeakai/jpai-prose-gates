---
type: Architecture Decision
title: An optional config file switches rules off and sets their options
description: A config is checked against the loaded rules, and a rule that is off loses both its halves
tags: [config, rules, cli]
status: accepted
accepted_on: 2026-10-06
provenance: Raised as phase 1 of issue 7, which asked for custom rules and found there was nowhere to put configuration
enforced_in:
  - src/config.ts, which reads and validates the file
  - src/rules/registry.ts, which applies it and builds the active rule set
  - src/project.ts, which finds the project root and the file once per run
  - tests/config.test.ts, which holds every refusal and the deferral rule
generated: { by: human:maintainer, at: 2026-10-06T00:00:00Z }
---

<!-- GENERATED from PRS-0018 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Depends on [PRS-0015](0015-a-rule-reads-one-shared-context.md) (the registry decides which interpunct runs count as reported, inside the shared context)
- Depends on [PRS-0017](0017-rule-ids-are-category-and-short-name.md) (a config names a rule by its category-short-name id, and a retired PG id is an unknown id)
- Depended on by [PRS-0019](0019-plugin-contract-and-namespace.md) (plugin rules are switched off and given options through the same file)
- Depended on by [PRS-0022](0022-plugins-load-automatically.md) (the config can list extra plugins or turn all of them off)
- Depended on by [PRS-0024](0024-failures-are-named-errors-with-codes.md) (the config failures it raises are named errors with codes)
- Depended on by [PRS-0030](0030-paragraph-length-is-reported-with-topic-guidance.md) (maxSentences is checked at load like maxWords)
- Extended by [PRS-0036](0036-a-glossary-is-read-as-the-concept-model.md) (a concept file at the project root also shapes a run, and fails it the way a bad config does)
- Extended by [PRS-0042](0042-plain-word-runs-and-a-min-items-option.md) (every list run rule takes a minItems option, checked at load)

## Decision

### The lens

#### Given

a project wants to disable a rule, tune its budget, or run extra rules

#### We prefer

an optional config at the project root, validated against the loaded rules, over flags alone or a silent skip of unknown names

#### Because

a config that is checked at load cannot drift from the rules it names

#### Unless

a setting needs more than a severity and a typed option, which calls for a new record

## Consequences

### Pros

- A typo in a rule id fails the run instead of doing nothing.
- Switching a list rule off never leaves a run that no rule reports.

### Cons

- The project root is a heuristic, the nearest ancestor with a package.json, a config or a .prose-gates directory.
- A second config format needs a new record, because .json and .mjs are the only two read.
