---
type: Architecture Decision
title: A finding carries optional evidence, instruction and preserve fields beside its message
description: The parts of an instruction travel apart in the JSON, and the message stays one line that ends in advice
tags: [findings, agents, json]
status: accepted
accepted_on: 2026-10-10
provenance: Decided in review of the research on issue 8, which asked for findings that act like targeted prompts
enforced_in:
  - src/rules/types.ts, where Finding gains evidence, instruction and preserve
  - src/tells.ts, whose tellFinding builds the message and the three fields from one description
  - src/plugins/load.ts, which lets a plugin rule supply the three fields and refuses a field that is not a string
  - tests/tells-phrase.test.ts, which holds the message shape and the three fields for every phrase rule
generated: { by: human:maintainer, at: 2026-10-10T00:00:00Z }
---

<!-- GENERATED from PRS-0031 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A finding is also an instruction, and an agent that gets only prose has to split it again.
> The text a rewrite must keep is as important as the text it must change.

## Relates to

- Extends [PRS-0010](0010-length-findings-guide-a-split.md) (a length finding was the first to double as an instruction, and every tell finding now does)

## Problem

### Symptom

A finding was one string, so a tool had to parse prose to find the text, the advice and the limits.

### Pain point

An agent that rewrites to satisfy a rule tends to drop facts, and nothing told it what to keep.

## Decision

### The lens

- **Given**: findings are read by people in a terminal and by agents and tools through the JSON
- **We prefer**: optional structured fields beside a complete one-line message over a message alone
- **Because**: the message serves the person, and the fields serve the tool, with no parsing between them
- **Unless**: a rule has nothing to add, in which case it reports a message as before

### In practice

- A finding may carry evidence, the exact text it is about.
- It may carry an instruction, which says what to do in the imperative.
- It may carry preserve, which says what a rewrite must keep.
- The message stays one line, names what was found, quotes the evidence, and ends with the advice.
- The fields are optional, so every existing rule and plugin keeps working unchanged.
- A plugin rule may supply the three fields, and a value that is not a string makes the rule's findings invalid.
- Instruction text is fixed by the rule, never built by a model, so the same input gives the same words.

## Consequences

### Pros

- An agent can prompt itself from a finding without parsing, and knows what to keep.
- The message still reads on its own in a terminal.

### Cons

- The advice appears twice, once in the message and once in the field.
- A finding is larger in the JSON.
