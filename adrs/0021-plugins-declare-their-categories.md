---
type: Architecture Decision
title: A plugin adds a category by declaring it
description: A new one-word category is declared in meta.categories, and a word is declared once
tags: [plugins, rules, categories]
status: accepted
accepted_on: 2026-10-06
provenance: Raised in review of issue 7, which asked for plugins to curate a frontmatter category for agent skills
enforced_in:
  - src/plugins/load.ts, which checks every declaration and every use
  - src/plugins/index.ts, which rejects a word two plugins declare
  - src/cli.ts, where --list-rules groups every active rule under its category
  - tests/plugins.test.ts, which covers each failure
generated: { by: human:maintainer, at: 2026-10-06T00:00:00Z }
---

<!-- GENERATED from PRS-0021 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A category is a claim about what a group of rules guards.
> A rule that names a category nobody declared is a typo until proven otherwise.

## Relates to

- Depends on [PRS-0019](0019-plugin-contract-and-namespace.md) (categories are declared in the plugin's meta)
- Extends [PRS-0011](0011-rules-carry-a-category.md) (PRS-0011 says a rule that fits no category calls for a new one, and this is how a plugin makes one)
- Depended on by [PRS-0022](0022-plugins-load-automatically.md) (a local rule file declares its word by exporting categories)

## Problem

### Symptom

CATEGORIES was a closed list of three words.

### Pain point

A plugin whose rules guard frontmatter had to call them sentence rules or leave them ungrouped.

## Decision

### The lens

- **Given**: a plugin has rules that fit none of sentence, list or punctuation
- **We prefer**: a declared category, a word plus a one-line description in meta.categories, over free text in each rule
- **Because**: a declaration is the one place a word can be checked and described
- **Unless**: two plugins want the same word, which today is a load error naming both

### In practice

- A category is one lower-case word.
- sentence, list and punctuation are built in. A plugin may use them without declaring them and may not declare them.
- A plugin may use a new word only if it declares that word itself. It cannot borrow another plugin's.
- A word declared by two plugins fails the load and names both.
- A local rule file may export categories. Local files share the namespace local, so they may repeat a word with the same description.
- The category word appears in --list-rules with its description.

## Consequences

### Pros

- A misspelt category fails at load instead of making a group of one.
- Help output reads the same for a plugin as for a built-in.

### Cons

- Two plugins that want a shared category word cannot, until a shared declaration exists.
