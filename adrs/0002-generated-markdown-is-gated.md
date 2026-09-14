---
type: Architecture Decision
title: Generated markdown is gated like hand-written markdown
description: Rendered output passes the same gates, and a finding there is fixed in its source or template
tags: [gates, generation]
status: accepted
accepted_on: 2026-09-14
provenance: Commit 5331208 in this repo removed an exemption for generated files, and the parent dialect gates adrs markdown in docs-ci
enforced_in:
  - the docs-ci target in this repo's Makefile, which includes adrs/*.md
  - the docs-ci target of every consuming meta repo
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0002 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A reader cannot tell which page was generated.
> Slop in rendered output reads exactly like slop written by hand.

## Problem

### Symptom

Generated files were excluded from the gates because nobody may edit them.

### Pain point

The slop moved into records and templates, where the gates never looked.

## Decision

### The lens

- **Given**: a markdown file is produced by rendering a record or a template
- **We prefer**: gating the rendered output and tracing each finding back to its source, over exempting generated paths
- **Because**: the reader sees the rendered page, so that page is what must meet the standard
- **Unless**: the generator's own boilerplate trips a rule, in which case the template is fixed rather than the rule relaxed

### In practice

- Consumers pass adrs/*.md to the gates with every other markdown file.
- A finding in generated output is fixed in the record or the template.
- The fixer is never run over generated files, since the next render would undo it.

## Consequences

### Pros

- The standard holds on every page a reader can open.
- Template defects surface once and are fixed once.

### Cons

- A finding points at a file the contributor must not edit.
