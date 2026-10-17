---
type: Architecture Decision
title: A plugin fixer is held to the same proof as a built-in one
description: Plugin fixers are allowed, every edit is verified, and a malformed edit is refused before it is spliced
tags: [plugins, fixing, safety]
status: accepted
accepted_on: 2026-10-06
provenance: Raised as an open question in issue 7, which leaned towards allowing fixers because verification already contains the risk
enforced_in:
  - src/fix/engine.ts, which refuses a malformed edit and verifies every other one
  - src/fix/verify.ts, which throws on a changed word and refuses a changed structure
  - src/plugins/load.ts, which stamps the plugin's id on every edit and refuses an edit with no expectation
  - tests/plugins.test.ts, which runs a fixer that drops a word, adds one, lies about structure, points outside the source or never settles
generated: { by: human:maintainer, at: 2026-10-06T00:00:00Z }
---

<!-- GENERATED from PRS-0020 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Depends on [PRS-0019](0019-plugin-contract-and-namespace.md) (a plugin fixer is part of the plugin contract)
- Depends on [PRS-0005](0005-every-fix-is-verified.md) (the fingerprint and the expected shape are the proof a plugin fixer meets)
- Depended on by [PRS-0027](0027-rules-may-be-async.md) (an async fixer meets the same verification)

## Decision

### The lens

#### Given

a plugin proposes edits to a document

#### We prefer

allowing the fixer and applying the verification every built-in meets, over banning plugin fixers

#### Because

a word lost or added throws, a structure that is not as declared is refused, and neither depends on who wrote the fixer

#### Unless

no expectation kind fits the edit, as with an edit inside frontmatter, in which case it is refused

## Consequences

### Pros

- A plugin fixer can never change what a document says.
- Hostile fixers are covered by adversarial tests rather than by review.

### Cons

- Frontmatter rules are check-only until an expectation kind exists for them.
- A busy-looping fixer hangs the run, because there is no sandbox.
