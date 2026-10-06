---
type: Architecture Decision
title: Strict loading is the default, lenient and validated loading are opt-in and loud
description: A lenient run skips a failed plugin and names it, and a validation run reports every failure and runs no engine
tags: [plugins, cli, safety]
status: accepted
accepted_on: 2026-10-07
provenance: Raised in review of PR 10, which asked for a non-strict mode and a mode that only validates loading
enforced_in:
  - src/plugins/index.ts, where the mode decides what a failed source does
  - src/project.ts, which turns the flags and the config into a mode
  - src/cli.ts, which prints each skipped plugin and reports a validation run
  - tests/modes.test.ts, which covers each mode and each combination of flags
generated: { by: human:maintainer, at: 2026-10-07T00:00:00Z }
---

<!-- GENERATED from PRS-0025 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A plugin that fails is a rule that did not run, and that must never look like a clean document.
> Some teams still want the plugins that work to keep working while one is repaired.

## Relates to

- Extends [PRS-0022](0022-plugins-load-automatically.md) (PRS-0022 said there is no skipped plugin, and this makes a skip an explicit choice that is still reported)
- Depends on [PRS-0024](0024-failures-are-named-errors-with-codes.md) (lenient loading and validation branch on the plugin error classes)

## Problem

### Symptom

One broken plugin stopped every run, and there was no way to check a plugin setup without checking a document.

### Pain point

A team could not keep linting while a plugin was fixed, and CI could not validate plugins before any document existed.

## Decision

### The lens

- **Given**: a plugin fails to load
- **We prefer**: strict by default, with --lenient-plugins and --validate-plugins as opt-ins that still say what happened, over a silent skip
- **Because**: a skip that is named is a decision, and a skip that is silent is a bug
- **Unless**: a project sets pluginLoading to lenient in its config, which is the same choice made once

### In practice

- Strict stops the run with the named error, and it is the default.
- Lenient leaves out only the source that failed, prints one stderr line with its code, and runs the rest. The built-in rules always run.
- A setting in the config for a rule of a skipped plugin is dropped with a line saying so. A typo in a built-in id still fails.
- When two plugins clash, the first keeps the namespace and the later one is skipped.
- A validation run uses the collect mode, loads every source, reports every failure together, and runs no check and no fix.
- A validation run exits 0 when every source is valid, 1 when any fails, and 2 for a config problem. It takes no files.
- Lenient with --no-plugins is a contradiction and a flag error.

## Consequences

### Pros

- CI can validate a plugin setup before any document is read.
- A broken plugin no longer blocks the rest of a team's checks, when they choose that.

### Cons

- A lenient run can pass while a rule did not run, so the stderr line is the only signal and must be read.
- Lenient loading is not a safety option, because every plugin that loads still runs.
