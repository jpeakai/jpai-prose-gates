---
type: Architecture Decision
title: A run with --no-concepts leaves the concept file unread
description: The flag gives every document an empty concept model, so a glossary in another shape cannot stop the run
tags: [concepts, cli]
status: accepted
accepted_on: 2026-10-24
provenance: A project whose GLOSSARY.md is not in the template had no way to run the gates short of moving or rewriting the file
enforced_in:
  - src/project.ts, whose setUp takes noConcepts and then never looks for the concept file
  - src/cli.ts, which parses --no-concepts and passes it to setUp
  - tests/concepts.test.ts, which runs a project with a bad glossary under the flag and expects exit 0
generated: { by: human:maintainer, at: 2026-10-24T00:00:00Z }
---

<!-- GENERATED from PRS-0040 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Extends [PRS-0036](0036-a-glossary-is-read-as-the-concept-model.md) (the concept file stays read by default, and this flag is the way out its cons named)

## Decision

### The lens

#### Given

a concept file at the project root is read on every run, and one in another shape stops the run

#### We prefer

a --no-concepts flag that leaves the file unread, over a fixed name list or a rule to move the file

#### Because

the glossary may serve readers in a shape the gates do not parse, and the run should not force it to change

#### Unless

a project needs this on every run, which calls for a config key and a new record

## Consequences

### Pros

- A repo with a free-form glossary can run every built-in rule today.
- The flag mirrors --no-plugins, so it reads as the same kind of switch.

### Cons

- A concept rule under the flag sees no concepts, so it finds nothing rather than failing.
- The opt-out lives on the command line, so each caller has to pass it.
