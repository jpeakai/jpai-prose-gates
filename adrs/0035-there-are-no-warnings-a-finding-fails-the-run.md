---
type: Architecture Decision
title: There are no warnings, so a finding fails the run and a rule not worth failing on is off
description: A rule is on and its findings exit non-zero, or it is off, and no level reports without failing
tags: [config, rules, cli, principle]
status: accepted
accepted_on: 2026-10-10
provenance: Stated in review of pull request 17, which had added a warn level and was asked to remove it
enforced_in:
  - src/rules/types.ts, where Severity is error or off and nothing else
  - src/config.ts, which refuses "warn" and says why
  - src/cli.ts, which exits 1 on any finding and prints no level beside a finding
  - tests/rule-levels.test.ts, which holds the refusal, the exit code and the JSON shape
generated: { by: human:maintainer, at: 2026-10-10T00:00:00Z }
---

<!-- GENERATED from PRS-0035 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: If a finding is worth raising, it is worth failing on.
> A finding that does not fail the run is read by nobody, human or agent, so it costs attention and protects nothing.

## Relates to

- Extends [PRS-0018](0018-config-file-and-rule-control.md) (that record had no warning tier, and this makes that a principle for every rule and every default)
- Depends on [PRS-0030](0030-a-rule-may-start-off-and-the-config-decides.md) (a rule that is not worth failing a build on starts off, and never ships as a warning)

## Problem

### Symptom

A warn level was added so that heuristic rules could ship without failing a build.

### Pain point

A warning is ignored by people and by agents, so it adds noise to every run and prevents nothing.

## Decision

### The lens

- **Given**: a tool whose findings are read by people and by agents, and a set of rules of uneven certainty
- **We prefer**: two levels, on and off, over a third level that reports without failing
- **Because**: a finding nobody acts on is waste, and an uncertain rule belongs off until a project chooses it
- **Unless**: never, since a warning is not added as a step on the way to something stricter

### In practice

- A rule is on, and every finding it reports fails the run, or it is off.
- There is no warning level, no flag that reports without failing, and no summary that counts warnings.
- A config that asks for a warning is refused with a usage error that says so.
- A rule is on by default only when a hit is a defect in nearly any document and rewording clears it.
- A heuristic, or a style that some documents choose on purpose, starts off, and a project that turns it on is failed by it.
- Eight tell rules are on by default, covering tool markup, chat wrappers, stock openers and closers, inflated significance, sales language, overused words and unnamed authority.
- The other eighteen start off.

## Consequences

### Pros

- Every line a run prints is a failure someone must act on.
- A rule that turns up in the output has earned it.

### Cons

- A rule with some false alarms cannot be trialled quietly, so it is tried off, then on.
- A project that wants a softer rule must leave it off.
