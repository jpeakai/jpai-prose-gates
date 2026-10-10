---
type: Architecture Decision
title: A rule reports as an error, a warning or not at all, and a rule may start at warn or off
description: Severity gains a warn level and a per-rule default, so a heuristic can ship without failing an existing build
tags: [config, rules, cli]
status: accepted
accepted_on: 2026-10-10
provenance: Raised while drafting the tell checks for issue 8, where most rules are heuristics and a few are style choices
enforced_in:
  - src/rules/types.ts, where Severity and a rule's defaultSeverity are defined
  - src/rules/registry.ts, which resolves the severity of every rule from the config, then the default, then error
  - src/check.ts, which stamps the severity on each finding so a rule cannot report at another level
  - src/cli.ts, which marks a warning, counts both kinds, and exits 1 only when an error remains
  - tests/severity.test.ts, which holds the resolution, the exit codes and the listing
generated: { by: human:maintainer, at: 2026-10-10T00:00:00Z }
---

<!-- GENERATED from PRS-0030 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A rule that is right most of the time still cannot fail a build that was green yesterday.
> With only error and off, the choice for a heuristic is to ship it noisy or not ship it.

## Relates to

- Extends [PRS-0018](0018-config-file-and-rule-control.md) (the config now accepts "warn" beside "error" and "off", and a rule may carry its own default)

## Problem

### Symptom

A new rule could only be an error or be switched off, so a project upgrading saw its build go red.

### Pain point

A heuristic with a few false alarms had nowhere to live between failing the build and not existing.

## Decision

### The lens

- **Given**: new rules whose evidence is partial or whose style is a choice, and projects whose CI must not break on upgrade
- **We prefer**: three severities with a per-rule default over error and off alone
- **Because**: a warning lets a heuristic report without failing, and a default of off lets a style rule exist without imposing it
- **Unless**: a rule is certain enough to fail a build, which then stays an error, as tool markup does

### In practice

- A severity is error, warn or off, and the config sets one for any rule, built-in or plugin.
- A rule with no setting takes its own default, and a rule with no default is an error.
- The engine stamps the severity on every finding, so a rule cannot report at another level.
- A warning is printed and counted and leaves the exit code at 0, and only an error exits 1.
- The JSON carries the severity of each finding and the counts of errors and warnings.
- --list-rules lists the rules that are off, so an opt-in rule can be found.
- A plugin rule has no default of its own and is an error until the config says otherwise.

## Consequences

### Pros

- A heuristic ships without failing an existing build.
- A style choice such as bold labels exists without being imposed.

### Cons

- A warning can be ignored for ever, so a project that wants a gate must raise it to an error.
- The config has one more value to explain.
