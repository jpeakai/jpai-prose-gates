---
type: Architecture Decision
title: A frontmatter edit is verified by comparing the YAML data before and after
description: A fixer may rewrite frontmatter if the YAML data is unchanged, and the view walks the whole document
tags: [frontmatter, fixing, verification]
status: accepted
accepted_on: 2026-10-07
provenance: Raised in review of PR 10, which asked for a fixer example and for rules to reach every nested description
enforced_in:
  - src/fix/verify.ts, which parses the YAML before and after and compares the data and the rest of the tree
  - src/model.ts, where the frontmatter view carries the whole document and every string scalar
  - examples/plugin-skills and examples/plugin-skills-typescript, which hold the worked fixer
  - tests/frontmatter-fix.test.ts, which breaks the expectation in every way it can be broken
generated: { by: human:maintainer, at: 2026-10-07T00:00:00Z }
---

<!-- GENERATED from PRS-0028 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Extends [PRS-0023](0023-frontmatter-is-a-read-only-view.md) (PRS-0023 made frontmatter check-only because no expectation fit, and this adds one that does)
- Depends on [PRS-0005](0005-every-fix-is-verified.md) (the fingerprint still runs first and a lost word still throws)

## Decision

### The lens

#### Given

a fixer rewrites the frontmatter

#### We prefer

an expectation that proves the YAML data is identical and nothing outside it moved, over banning frontmatter fixers or trusting them

#### Because

parsing before and after is a stronger proof than any text comparison, and it is cheap

#### Unless

a fixer needs to change the data, which has no expectation and is refused

## Consequences

### Pros

- A plugin can fix frontmatter and the engine proves the data did not change.
- A rule can reach any string in the YAML without a parser of its own.

### Cons

- The package exposes the yaml package's Document type in its API.
- Reordering keys is refused, because order is data in the comparison.
