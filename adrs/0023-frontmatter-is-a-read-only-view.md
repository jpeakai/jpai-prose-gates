---
type: Architecture Decision
title: Frontmatter is a read-only view that built-in rules never see
description: DocModel.frontmatter lists the top-level string keys of a YAML block, and built-in rules stay exempt
tags: [model, frontmatter, yaml]
status: accepted
accepted_on: 2026-10-06
provenance: Raised in review of issue 7, as the worked example for plugin categories
enforced_in:
  - src/model.ts, which reads the leading yaml node with the yaml package on first use
  - examples/plugin-skills, which holds the description word budget as the worked example
  - tests/frontmatter.test.ts, which covers quoting, folding, nesting, Windows line endings and invalid YAML
generated: { by: human:maintainer, at: 2026-10-06T00:00:00Z }
---

<!-- GENERATED from PRS-0023 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: Frontmatter is metadata for tools, so prose rules were right to ignore it.
> A rule about an agent skill's description needs to read exactly that.

## Relates to

- Depends on [PRS-0019](0019-plugin-contract-and-namespace.md) (a plugin rule reads the view through the model it is handed)
- Depends on [PRS-0001](0001-parse-once-to-mdast.md) (the view is derived from the tree parsed once)

## Problem

### Symptom

Frontmatter parsed to an opaque yaml node and no rule could read a key or report its line.

### Pain point

A hand-written key scanner would mishandle quoted and folded scalars, and a fixer must never guess.

## Decision

### The lens

- **Given**: a rule needs the keys and values of a leading metadata block
- **We prefer**: the yaml package, read lazily, exposed as entries with a line and source offsets, over a scanner of our own
- **Because**: correct ranges for quoted, folded and literal scalars are the yaml package's job
- **Unless**: a rule needs nested keys or TOML, which calls for a new record

### In practice

- Only the first node of the document can be frontmatter, and only YAML is read.
- An entry is a top-level key whose value is a string. Numbers, booleans, lists and nested maps are left out.
- The view is read on first use, so a document with invalid YAML fails only a rule that asks for it.
- Invalid YAML throws with the file line, and a plugin rule that throws becomes a finding for that rule.
- Built-in prose rules still never read frontmatter, and verification still counts its words.
- No expectation kind fits an edit inside a yaml node, so frontmatter rules are check-only.

## Consequences

### Pros

- The skills description budget works on a real SKILL.md with one rule file.
- Frontmatter in a markdown fence is checked like a top-level block, with no extra code.

### Cons

- The package gains its first dependency that is not part of the mdast family.
- TOML frontmatter and nested keys are out of reach until another record.
