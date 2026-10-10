---
type: Architecture Decision
title: Lexicons are our own dated data, with ideas credited and no dependency on another tool's lists
description: Each phrase list names its review date and sources, and stays out of any package we do not control
tags: [lexicon, tells, dependencies]
status: accepted
accepted_on: 2026-10-10
provenance: Decided in review of the research on issue 8, which found slopless, a tool with overlapping rules, and asked whether to depend on it
enforced_in:
  - src/lexicon.ts, which defines a lexicon with a reviewed date, its sources and its entries
  - src/lexicons/, where every list is one module that carries the date and the sources
  - tests/lexicon.test.ts, which requires a date and a source on every shipped lexicon and keeps ambiguous words out
generated: { by: human:maintainer, at: 2026-10-10T00:00:00Z }
---

<!-- GENERATED from PRS-0034 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A phrase list ages with every model release, and a list inside someone else's package ages where we cannot see it.
> A list we write can say when it was last reviewed.

## Relates to

- Depends on [PRS-0032](0032-tell-rules-only-report-and-read-prose-outside-quotes.md) (the lists feed the tell rules, which report and never edit)

## Problem

### Symptom

Another tool already ships overlapping rules and lists, and the humanizer skill ships a catalogue.

### Pain point

Depending on a list we do not control hides how stale it is, and copying one hides where it came from.

## Decision

### The lens

- **Given**: three sources of ideas, humanizer under the MIT licence, Wikipedia's field guide, and the slopless tool
- **We prefer**: our own wording kept as data, with the ideas credited, over a package dependency or a copied list
- **Because**: a dated list we own can be reviewed, and no other tool's change can alter our findings
- **Unless**: a later decision chooses to depend on a package, with its own review of licence, runtime and determinism

### In practice

- A lexicon is a module in src/lexicons/ with an id, a review date, its sources and its entries.
- The entries are written in our own words, and a source is named as credit, not copied.
- An ambiguous word such as key or gate stays out, because it fires on plain technical prose.
- Slopless is a source of ideas only, and nothing here imports it.
- A review of a list changes its date, and a new source is added to the list that uses it.

## Consequences

### Pros

- A reader can see how old each list is and where its ideas came from.
- No outside release can change what a run reports.

### Cons

- We maintain the lists ourselves, and they will lag a fast-moving field.
