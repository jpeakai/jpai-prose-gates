---
type: Architecture Decision
title: A paragraph over its sentence budget is reported with topic guidance and never autofixed
description: A paragraph over 5 sentences fails, and it runs after the list rules, and names its topics and breaks
tags: [rules, messages, agents, scope]
status: accepted
accepted_on: 2026-10-17
provenance: Raised as issue 18, with the default researched against web style guides and the NLP question taken from issue 16
enforced_in:
  - src/rules/paragraph-sentence-budget-exceeded.ts, which exports a check and no fix
  - src/check.ts, which runs a rule with after once the categories it names have reported
  - src/language.ts, which splits sentences and tags words with the pinned libraries
  - src/cohesion.ts, which scores cohesion and plans breaks
  - tests/paragraph.test.ts, which pins the counting, the guidance and the curated pairs
  - tests/fixtures/paragraph, where each before.md fails with finding.txt and each after.md passes every rule
generated: { by: human:maintainer, at: 2026-10-17T00:00:00Z }
---

<!-- GENERATED from PRS-0030 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Extends [PRS-0006](0006-sentence-length-is-never-autofixed.md) (like a long sentence, a long paragraph is reported and never rewritten by a fixer)
- Extends [PRS-0010](0010-length-findings-guide-a-split.md) (the finding guides a split by counting topics, as the length finding counts clauses)
- Extends [PRS-0015](0015-a-rule-reads-one-shared-context.md) (a rule may read the findings of the categories it names in after, and its check waits for them)
- Depends on [PRS-0017](0017-rule-ids-are-category-and-short-name.md) (a new paragraph category gives the rule its first word, since no existing category fits)
- Depends on [PRS-0018](0018-config-file-and-rule-control.md) (the budget is the maxSentences option, checked at load like maxWords)
- Depended on by [PRS-0033](0033-a-paragraph-carries-a-lazy-language-view.md) (the rule reads the paragraph's language view)

## Decision

### The lens

#### Given

a prose paragraph holds more sentences than the budget

#### We prefer

a finding that names the topics and breaks after the list rules run, over a bare count

#### Because

the topics show where the paragraph wants to break, and a promoted list often fixes its length

#### Unless

a topic segmenter for JavaScript proves better at finding turns, which would supersede the cohesion scoring only

## Consequences

### Pros

- A finding tells a human or an agent where to break, not only that the paragraph is long.
- A hidden list is reported once, by the rule whose fixer can promote it, and --fix settles both rules in one run.
- The guidance is deterministic, with no model, and the language work is done by maintained libraries.

### Cons

- compromise roughly doubles the Node bundle, and make build prints its size.
- compromise ends a sentence after vs., and keeps a quoted sentence with the next one.
- compromise tags these and both as plain determiners, so a sentence that opens with them never refers back.
- parse-english was tried for splitting and dropped.
  On this repo's one-sentence-per-line docs it merged sentences after a number and before a lower-case word, and compromise never did.
- Cohesion by shared words misses synonyms, so a topic held together by paraphrase can read as two.
- A list rule that is on but refuses to fix leaves the paragraph uncounted until a human promotes the list.
