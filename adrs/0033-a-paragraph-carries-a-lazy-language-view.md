---
type: Architecture Decision
title: A paragraph carries a language view of its sentences and words, built on first read
description: ParagraphView.language holds sentences, words, tags and lemmas for every rule, plugins included
tags: [model, plugins, language]
status: accepted
accepted_on: 2026-10-17
provenance: Raised once the paragraph rule moved its sentence and word work onto compromise, and the same analysis was worth sharing
enforced_in:
  - src/language.ts, which builds the view from a paragraph's prose
  - src/model.ts, where ParagraphView.language is a getter that builds the view once
  - src/index.ts, which exports LanguageView, LanguageSentence and LanguageWord
  - tests/paragraph.test.ts, which pins the view, its reuse, and the plugin guide's example rule
generated: { by: human:maintainer, at: 2026-10-17T00:00:00Z }
---

<!-- GENERATED from PRS-0033 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Extends [PRS-0023](0023-frontmatter-is-a-read-only-view.md) (the language view is read on first use, as the frontmatter view is)
- Extends [PRS-0019](0019-plugin-contract-and-namespace.md) (a plugin rule reads the view from the paragraphs it already receives, with no import)
- Depends on [PRS-0030](0030-paragraph-length-is-reported-with-topic-guidance.md) (the paragraph rule is the first reader, and its libraries are pinned there)
- Depended on by [PRS-0034](0034-clauses-count-verb-phrases-as-well-as-markers.md) (the length rule reads sentences and verb phrases from the view)
- Extended by [PRS-0036](0036-a-glossary-is-read-as-the-concept-model.md) (each sentence of the view lists the concepts of the project it names)
- Extended by [PRS-0039](0039-a-text-carries-a-lazy-language-view.md) (every text view carries the same lazy language view)

## Decision

### The lens

#### Given

a rule wants the sentences, words, tags or lemmas of a paragraph

#### We prefer

a lazy language view on ParagraphView, over each rule tagging its own copy

#### Because

one view is computed at most once per paragraph, and every rule reads the same answer

#### Unless

a rule needs language data across paragraphs, which calls for a document-level view and a new record

## Consequences

### Pros

- A plugin can write a language rule without adding a tagger of its own.
- A document that no language rule reads is never tagged.

### Cons

- compromise's tags become part of what a plugin can rely on, so a tag change on upgrade can move a plugin's findings.
- A view built per paragraph cannot see a sentence that a paragraph break interrupts.
