---
type: Architecture Decision
title: A text view carries the same lazy language view as a paragraph
description: TextView.language reads a text node's value as English on first use, so prose outside a paragraph can be read too
tags: [model, language, plugins]
status: accepted
accepted_on: 2026-10-18
provenance: A heading or a table cell has text views but no paragraph view, so a rule had no language view for it
enforced_in:
  - src/model.ts, whose text views carry a language getter built from value and the project's concepts
  - tests/paragraph.test.ts, which reads a heading, a text split by emphasis, reuse, and concepts through the text view
generated: { by: human:maintainer, at: 2026-10-18T00:00:00Z }
---

<!-- GENERATED from PRS-0039 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Extends [PRS-0033](0033-a-paragraph-carries-a-lazy-language-view.md) (the paragraph's lazy language view, given to every text node too)

## Decision

### The lens

#### Given

a language view on each paragraph, and text views for every prose text node, headings and table cells included

#### We prefer

the same lazy language view on each text view, read from its value, over a separate helper a rule must import

#### Because

a rule reads one shape on either view, and a text no rule asks about is never tagged

#### Unless

a rule needs whole sentences, which only a paragraph's language holds, since emphasis or a link splits a text

## Consequences

### Pros

- A rule can read a heading's words and tags with no paragraph to read them from.
- Plugins get the view with no import, like the paragraph's.

### Cons

- A text view is a fragment, so its sentences end wherever inline markup starts.
- Reading every text's language tags the prose a second time beside the paragraph's.
