---
type: Architecture Decision
title: A rule may start off, and the config turns any rule on or off
description: A rule carries a default of on or off, the config overrides it, and off rules are listed
tags: [config, rules, cli]
status: accepted
accepted_on: 2026-10-10
provenance: Raised while drafting the tell checks for issue 8, where most rules are heuristics and a few are style choices
enforced_in:
  - src/rules/types.ts, where a rule's defaultSeverity is defined as error or off
  - src/rules/registry.ts, which resolves each rule from the config, then its default, then on
  - src/cli.ts, whose --list-rules lists the rules that are off under their own heading
  - tests/rule-levels.test.ts, which holds the resolution, the listing and the exit codes
generated: { by: human:maintainer, at: 2026-10-10T00:00:00Z }
---

<!-- GENERATED from PRS-0030 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A rule that is right most of the time cannot fail a build that was green yesterday.
> If every rule must be on, a heuristic or a style choice either fails every project or does not exist.

## Relates to

- Extends [PRS-0018](0018-config-file-and-rule-control.md) (a rule may start off, and the config turns any rule on or off, built-in or plugin)
- Depended on by [PRS-0035](0035-there-are-no-warnings-a-finding-fails-the-run.md) (a rule that is not worth failing a build on starts off, and never ships as a warning)

## Problem

### Symptom

A new rule could only be on, so a project that upgraded saw its build fail on a rule it never asked for.

### Pain point

A heuristic with legitimate uses, or a style some documents choose on purpose, had nowhere to live.

## Decision

### The lens

- **Given**: new rules whose evidence is partial or whose style is a choice, and projects whose CI must not break on upgrade
- **We prefer**: a per-rule default of off, which a project turns on, over forcing every rule on
- **Because**: a project that wants a style chooses it, and no build fails on upgrade for a rule it never asked for
- **Unless**: a rule is certain enough that a hit is a defect in nearly any document, which is then on by default

### In practice

- A rule has a default of on or off, and a rule that declares none is on.
- The config sets "error" or "off" for any rule, built-in or plugin, and the config wins over the default.
- A rule that is off is not run, and --list-rules lists it under its own heading, so an opt-in rule can be found.
- A plugin rule has no default of its own and is on until the config says otherwise.
- A rule that is on fails the run, as every rule always has.

## Consequences

### Pros

- A heuristic or a style choice can exist without failing anyone's build.
- Upgrading does not turn a green build red.

### Cons

- A rule that starts off is easy never to turn on.
- The listing has one more section to read.
