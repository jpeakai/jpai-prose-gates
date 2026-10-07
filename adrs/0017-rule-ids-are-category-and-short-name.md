---
type: Architecture Decision
title: A rule id is its category followed by a short name
description: Rules are named category-short-name, such as sentence-one-per-line, instead of by a number
tags: [rules, naming, layout]
status: accepted
accepted_on: 2026-10-06
provenance: Raised when the PG001 to PG009 ids were found to need a lookup table before a finding could be understood
enforced_in:
  - src/rules/types.ts, where RULE holds every id
  - src/rules/, where each module is named by its rule id
  - tests/rules-doc.test.ts, which holds the RULES.md section headings to these ids
generated: { by: human:maintainer, at: 2026-10-06T00:00:00Z }
---

<!-- GENERATED from PRS-0017 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A number says nothing about what a rule does or what it guards.
> The id appears in every finding, so it has to be readable where it is read.

## Relates to

- Extends [PRS-0008](0008-one-file-per-rule.md) (a rule file is still named by its id, and the id is now category-short-name instead of pgNNN-slug)
- Extends [PRS-0011](0011-rules-carry-a-category.md) (the category a rule carries is the first word of its id)
- Depended on by [PRS-0018](0018-config-file-and-rule-control.md) (a config names a rule by its id)
- Depended on by [PRS-0019](0019-plugin-contract-and-namespace.md) (a plugin id is the namespace in front of category-short-name)

## Problem

### Symptom

A finding read "PG006" and the reader had to open RULES.md to learn it meant an interpunct-joined list.

### Pain point

Numbers also imply an order and a count, so adding or retiring a rule left gaps or renumbered history.

## Decision

### The lens

- **Given**: every finding, fixture, heading and test names a rule by its id
- **We prefer**: an id of one lower-case category word and a three or four word short name, joined by hyphens, over a sequential number
- **Because**: the id then says what the rule guards before anyone looks it up
- **Unless**: a new rule fits no existing category, which calls for a new category rather than a catch-all word

### In practice

- The category is the first word and is one of the values in CATEGORIES.
- The short name is three or four words that describe the finding, not the fix.
- A rule file, its fixture directories and its RULES.md heading all use the id unchanged.
- An exported constant uses the camel-case form of the id.
- A retired id is never reused for a different rule.
- The old PG numbers are gone with no alias, so a config that names one fails loudly.

## Consequences

### Pros

- A finding line explains itself.
- Files sort by category in a directory listing.

### Cons

- Ids are longer in help output and tables.
- Accepted records written before this one still say PG001 to PG009.
