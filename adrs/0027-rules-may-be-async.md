---
type: Architecture Decision
title: Rules may be async, checks run concurrently, and fixers run in priority order
description: The engines are async, checks overlap, fixers are awaited one at a time, and the order stays a hand-kept list
tags: [engine, plugins, concurrency]
status: accepted
accepted_on: 2026-10-07
provenance: Raised in review of PR 10, which asked for async checks and fixers and for a fixer order driven by rule properties
enforced_in:
  - src/check.ts, which starts every check at once and awaits them all
  - src/fix/engine.ts, which awaits each fixer in priority order inside the restart loop
  - src/plugins/load.ts, which awaits a plugin function and contains a rejection
  - tests/async.test.ts, which proves overlap, order, rejection handling and a stable result
generated: { by: human:maintainer, at: 2026-10-07T00:00:00Z }
---

<!-- GENERATED from PRS-0027 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A rule that calls a tool or a service has to wait, and the engine should not stop to wait with it.
> A fix run must still end at a text that fixing again would not change.

## Relates to

- Depends on [PRS-0019](0019-plugin-contract-and-namespace.md) (a plugin rule function may now return a promise)
- Depends on [PRS-0020](0020-plugin-fixers-stay-under-verification.md) (an async fixer meets the same verification as a sync one)

## Problem

### Symptom

Check and fix were synchronous, so a rule could not wait on anything.

### Pain point

A rule that needed a tool or a service had to block. A bare list gave no way to say what a run guaranteed.

## Decision

### The lens

- **Given**: a rule may wait, and one invocation should end at a stable text
- **We prefer**: async engines, with concurrent checks and sequential fixers in a hand-kept list, over declared order properties or a staged fold
- **Because**: concurrency is as good as parallelism here, and the restart loop is what makes the result stable
- **Unless**: the cost of asking earlier fixers again becomes real, which calls for a faster loop and a new record

### In practice

- checkMarkdown, checkModel, fixMarkdown, fixMarkdownReport and the testing helpers return promises.
- A rule's check and fix may return a value or a promise, and a built-in stays synchronous.
- Every check starts at once and the engine waits for all of them. JavaScript runs one thread, so this is concurrency and not parallelism.
- Findings are sorted by line and then by id after every check has finished, so the order the rules finish in never shows.
- A fixer is awaited before the next is asked, because each fixer must see the text the last one left.
- A rejected check becomes a finding for that rule. A rejected fixer stops the run with a PluginFixerError.
- The fix loop restarts from the top after every accepted edit, so an earlier fixer is asked again about text a later one changed.
- One invocation therefore ends at a stable text, and fixing the output again changes nothing.
- A rule declares no phase and no after or before constraint, because sampled random fixer orders reproduce every documented output.

## Consequences

### Pros

- A plugin can call a tool or a service without blocking the other checks.
- The stable-text guarantee is a property of the loop and is checked by tests.

### Cons

- The library API is async, which changes every caller before the first release.
- Asking every earlier fixer again after each accepted edit does not scale to hundreds of rules over hundreds of files.
- Fixers cannot overlap, so a slow fixer delays the ones after it.
