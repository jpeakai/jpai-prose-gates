---
type: Architecture Decision
title: The clause count is the larger of the marker count and the verb phrases compromise finds
description: sentence-word-budget-exceeded counts clauses from punctuation and marker words, or from verbs, whichever finds more
tags: [rules, messages, language]
status: accepted
accepted_on: 2026-10-17
provenance: Raised once compromise was in the tree for the paragraph rule, as a check on whether its tagger could improve the clause estimate
enforced_in:
  - src/rules/sentence-word-budget-exceeded.ts, through clausesOf
  - src/language.ts, where each sentence carries its verb phrases
  - tests/check.test.ts, which pins the count on markers, verbs and a missed verb
  - tests/paragraph.test.ts, which requires identical findings on Bun and the Node bundle
generated: { by: human:maintainer, at: 2026-10-17T00:00:00Z }
---

<!-- GENERATED from PRS-0034 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Extends [PRS-0010](0010-length-findings-guide-a-split.md) (the finding still reports potential clauses, and the count now reads verbs as well as markers)
- Depends on [PRS-0033](0033-a-paragraph-carries-a-lazy-language-view.md) (the rule reads each sentence, with its verb phrases, from the paragraph's language view)

## Decision

### The lens

#### Given

a sentence exceeds the word budget and the finding estimates its clauses

#### We prefer

the larger of the marker count and compromise's verb phrases, over either alone

#### Because

verbs find the clauses that markers miss, and markers hold up the count where the tagger misses a verb

#### Unless

a dependency parser that runs in JavaScript proves deterministic, which would replace both signals

## Consequences

### Pros

- On the probe sentences the combined count matched a careful reading in 9 of 11 cases, against 7 for markers alone.
- A series of verbs, the commonest long sentence in technical prose, now asks for a split per verb.

### Cons

- compromise misses some verbs, such as reparses, so a clause joined with no marker can still go uncounted.
- The Oxford comma in a list still reads as a boundary, because core compromise has no list detection.
