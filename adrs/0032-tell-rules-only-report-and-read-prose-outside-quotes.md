---
type: Architecture Decision
title: Tell rules only report, read prose outside code and quotations, and sit in three new categories
description: Stock phrasing, chat residue and decorative structure are reported with advice and never edited
tags: [rules, tells, categories]
status: accepted
accepted_on: 2026-10-10
provenance: Raised by issue 8, which compared the humanizer skill with this tool and listed the patterns that can be checked without guessing
enforced_in:
  - src/tells.ts, whose tellParagraphs and tellTexts skip tables and quotations, and whose lexiconRule has no fixer
  - src/rules/registry.ts, where residue, phrase and structure join the built-in categories
  - src/rules/residue-tool-markup-artifact.ts, which skips code and quotations while it reads link addresses
  - tests/tells-residue.test.ts, tests/tells-phrase.test.ts and tests/tells-structure.test.ts, which hold a hit and a legitimate use for every rule
  - tests/rules-doc.test.ts, which runs every documented example with every rule on
generated: { by: human:maintainer, at: 2026-10-10T00:00:00Z }
---

<!-- GENERATED from PRS-0032 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A phrase that signals more than it states cannot be mended without choosing new words, and choosing words is the author's job.
> A document about these phrases must be able to quote them without tripping its own gate.

## Relates to

- Extends [PRS-0004](0004-a-fixer-refuses-when-unsure.md) (a rule that cannot repair a case without guessing is check-only, and these rules never repair)
- Extends [PRS-0011](0011-rules-carry-a-category.md) (residue, phrase and structure are added to sentence, list and punctuation, and a rule still carries one category)
- Depended on by [PRS-0034](0034-lexicons-are-our-own-dated-data-with-ideas-credited.md) (the phrase lists these rules read are our own dated data)

## Problem

### Symptom

Humanizer catches many tells that no gate here reports, and most of them have no safe fix.

### Pain point

A fixer for a phrase would delete or swap words, which this tool treats as a bug.

## Decision

### The lens

- **Given**: a catalogue of tells where most can be found by a closed list and none can be repaired without judgement
- **We prefer**: check-only rules that quote the evidence and say what to do over fixers, and over a model that rewrites
- **Because**: a finding is deterministic, and the author keeps the words
- **Unless**: a fix is added later under its own decision, with its own proof and an explicit flag

### In practice

- A tell rule has no fixer.
- A tell rule reads prose in paragraphs, headings and list items, and skips code, tables and quotations.
- A quotation shows a phrase and does not use it, so a document about stock phrases can quote them.
- Eight tells are on by default, because a hit is a defect in nearly any document and rewording clears it.
- Every other tell starts off, and a project turns on the ones it wants, when it fails the run like any other.
- Each rule is documented in RULES.md with a reported example, and tests pass the real rule over real strings.
- A rule is calibrated against human text before it ships, and the evidence goes in the pull request.
- The rules live in core for now, and moving the word lists to a plugin package is a later decision.

## Consequences

### Pros

- A finding is deterministic, quotes its evidence and says what to do.
- No rule can change a word, so the proof of every fix stays as strong as before.

### Cons

- A finding the author must fix by hand costs more than an autofix.
- A rule that is on will sometimes fail on text a person wrote on purpose.
- The answer is to reword the text or switch the rule off.
