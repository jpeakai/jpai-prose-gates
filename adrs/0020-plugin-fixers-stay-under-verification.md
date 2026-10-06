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

> **Lens**: The engine never trusted a fixer, so a plugin fixer needs no special trust.
> Allowing fixers is safe only because verification does not care who wrote them.

## Relates to

- Depends on [PRS-0019](0019-plugin-contract-and-namespace.md) (a plugin fixer is part of the plugin contract)
- Depends on [PRS-0005](0005-every-fix-is-verified.md) (the fingerprint and the expected shape are the proof a plugin fixer meets)
- Depended on by [PRS-0027](0027-rules-may-be-async.md) (an async fixer meets the same verification)

## Problem

### Symptom

A user who writes a fixer could lose a word or corrupt a document.

### Pain point

Check-only plugins would be safe but would leave every plugin rule to a human to fix by hand.

## Decision

### The lens

- **Given**: a plugin proposes edits to a document
- **We prefer**: allowing the fixer and applying the verification every built-in meets, over banning plugin fixers
- **Because**: a word lost or added throws, a structure that is not as declared is refused, and neither depends on who wrote the fixer
- **Unless**: no expectation kind fits the edit, as with an edit inside frontmatter, in which case it is refused

### In practice

- Plugin fixers run after the built-ins, in load order, inside the same fixpoint loop. The loop restarts from the top after any accepted edit.
- An edit is refused before it is spliced if its offsets are not whole, in order and inside the source. The same holds if its text is not a string.
- An edit with no valid expectation, a fixer that throws, or a fixer that returns a non-list stops the run and names the rule.
- A fixer cannot claim another rule's id. The engine stamps its own.
- A fixer that never settles throws after the pass limit.
- Plugins are trusted code with no sandbox. A fixer that never returns cannot be stopped.

## Consequences

### Pros

- A plugin fixer can never change what a document says.
- Hostile fixers are covered by adversarial tests rather than by review.

### Cons

- Frontmatter rules are check-only until an expectation kind exists for them.
- A busy-looping fixer hangs the run, because there is no sandbox.
