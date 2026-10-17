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

## Relates to

- Depended on by [PRS-0012](0012-node-runs-a-published-bundle.md) (the Node bundle inlines the same parser)
- Depended on by [PRS-0003](0003-splice-source-never-restringify.md) (splicing addresses source through the tree offsets)
- Depended on by [PRS-0015](0015-a-rule-reads-one-shared-context.md) (the shared rule context derives from the model parsed once)
- Depended on by [PRS-0023](0023-frontmatter-is-a-read-only-view.md) (the frontmatter view is derived from the tree parsed once)

## Decision

### The lens

#### Given

several rules need to know which bytes are prose and which are structure

#### We prefer

parsing each file once with micromark into mdast and handing every rule the same model, over per-rule line scanning

#### Because

the parser already implements CommonMark and GFM exactly, so exemptions come from node types rather than heuristics

#### Unless

a rule needs something the tree loses, such as the original spacing, in which case it reads the source through node offsets

## Consequences

### Pros

- Exemptions are consistent across every rule.
- A new rule starts from structure rather than rebuilding it.

### Cons

- The package depends on the unified parser family.
- A rule must map tree positions back to source offsets to edit anything.
