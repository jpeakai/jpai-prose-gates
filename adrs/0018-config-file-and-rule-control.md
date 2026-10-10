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

> **Lens**: A team needs to turn a rule off or tune it without forking the package.
> A setting that names nothing must fail, or a retired id looks like it worked.

## Relates to

- Depends on [PRS-0015](0015-a-rule-reads-one-shared-context.md) (the registry decides which interpunct runs count as reported, inside the shared context)
- Depends on [PRS-0017](0017-rule-ids-are-category-and-short-name.md) (a config names a rule by its category-short-name id, and a retired PG id is an unknown id)
- Depended on by [PRS-0019](0019-plugin-contract-and-namespace.md) (plugin rules are switched off and given options through the same file)
- Depended on by [PRS-0022](0022-plugins-load-automatically.md) (the config can list extra plugins or turn all of them off)
- Depended on by [PRS-0024](0024-failures-are-named-errors-with-codes.md) (the config failures it raises are named errors with codes)
- Extended by [PRS-0030](0030-a-rule-reports-as-error-warning-or-off.md) (the config accepts warn beside error and off, and a rule may carry a default severity)

## Problem

### Symptom

The CLI took four flags and had no place to say that one rule does not suit a project.

### Pain point

Switching a rule off meant forking, and a rule that others defer to could hide findings if it were switched off naively.

## Decision

### The lens

- **Given**: a project wants to disable a rule, tune its budget, or run extra rules
- **We prefer**: an optional config at the project root, validated against the loaded rules, over flags alone or a silent skip of unknown names
- **Because**: a config that is checked at load cannot drift from the rules it names
- **Unless**: a setting needs more than a severity and a typed option, which calls for a new record

### In practice

- The file is prose-gates.config.json or .mjs at the project root, or the path in --config, and two at one root is an error.
- A rule is "error", "off", or [severity, options]. There is no warning tier, because the tool exits 1 on any finding.
- A rule that is off loses its check and its fixer together, so --fix cannot apply it.
- An id that matches no loaded rule is a usage error with exit code 2. This catches a stale PG id.
- An option must be one the rule declares, with the declared type. maxWords must be at least 1.
- The sentence budget is the --max-words flag, then the rule's maxWords option, then 25.
- An interpunct run counts as reported only while its owning rule is on. The glyph rule reports a run whose owner is off.

## Consequences

### Pros

- A typo in a rule id fails the run instead of doing nothing.
- Switching a list rule off never leaves a run that no rule reports.

### Cons

- The project root is a heuristic, the nearest ancestor with a package.json, a config or a .prose-gates directory.
- A second config format needs a new record, because .json and .mjs are the only two read.
