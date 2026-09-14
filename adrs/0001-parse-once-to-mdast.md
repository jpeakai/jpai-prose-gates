---
type: Architecture Decision
title: Every rule reads one mdast tree parsed once per file
description: Rules query a shared syntax tree instead of scanning raw lines with their own regexes
tags: [parsing, architecture]
status: accepted
accepted_on: 2026-09-14
provenance: The original monolith scanned raw lines and tracked fences by hand, and each new rule reimplemented the same fence and code-span skipping
enforced_in:
  - src/model.ts, which parses with mdast-util-from-markdown and the GFM and frontmatter extensions
  - src/rules, where every rule receives the shared DocModel rather than the raw text
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0001 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: Markdown is a grammar, not a line format.
> A rule that guesses structure from lines disagrees with every renderer sooner or later.

## Relates to

- Depended on by [PRS-0003](0003-splice-source-never-restringify.md) (splicing addresses source through the tree offsets)

## Problem

### Symptom

Each rule decided for itself what counted as code, a table or a list. The answers drifted between rules.

### Pain point

A finding inside inline code, a link url or a table cell was a false positive that no single fix could remove.

## Decision

### The lens

- **Given**: several rules need to know which bytes are prose and which are structure
- **We prefer**: parsing each file once with micromark into mdast and handing every rule the same model, over per-rule line scanning
- **Because**: the parser already implements CommonMark and GFM exactly, so exemptions come from node types rather than heuristics
- **Unless**: a rule needs something the tree loses, such as the original spacing, in which case it reads the source through node offsets

### In practice

- A rule reads text nodes, paragraph views and offsets from DocModel.
- Code, inline code, html and link urls are exempt because they are never text nodes.
- Source positions come from the tree, so a finding points at the real line.

## Consequences

### Pros

- Exemptions are consistent across every rule.
- A new rule starts from structure rather than rebuilding it.

### Cons

- The package depends on the unified parser family.
- A rule must map tree positions back to source offsets to edit anything.
