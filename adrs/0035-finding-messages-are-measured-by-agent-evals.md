---
type: Architecture Decision
title: Finding messages are measured by agent evals that never gate the build
description: Agents fix seed documents under pytest-xharness-eval, graded by the gates, to score each message
tags: [messages, agents, evals, tooling]
status: accepted
accepted_on: 2026-10-17
provenance: Asked for once the paragraph and length rules gained guidance that only a rewrite can act on, to learn whether agents act on it well and in few turns
enforced_in:
  - evals/prose-gates/, the skill, the eval cases, the shared grader and the seed documents
  - pyproject.toml, whose evals group pins pytest-xharness-eval and whose pytest options hold the model matrix
  - Makefile, where evals-dry lists the cells, evals runs them live, and evals-compare lines up two sweeps
  - CONTRIBUTING.md, which says how to run them and that a live run is billed
generated: { by: human:maintainer, at: 2026-10-17T00:00:00Z }
---

<!-- GENERATED from PRS-0035 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Extends [PRS-0010](0010-length-findings-guide-a-split.md) (the clause guidance a length finding gives is now measured against agents that follow it)
- Depends on [PRS-0006](0006-sentence-length-is-never-autofixed.md) (the evals target rules with no fixer, where only a rewrite clears the finding)
- See also [PRS-0037](0037-a-check-reports-every-line-its-fixer-changes.md) (a sweep found the one-per-line check passing what its fixer rewrote)

## Decision

### The lens

#### Given

a rule whose finding needs a rewrite, and an agent asked to clear it with the messages as its only guidance

#### We prefer

billed evals run on demand, graded by the gates and by content preservation, over judging messages by reading them

#### Because

the pass rate and the turn count show which wording closes the loop, and a deterministic grader keeps the measure honest

#### Unless

a live run becomes cheap and keyless enough to gate a pull request, which would call for a new record

## Consequences

### Pros

- A message change can be shown to cut turns or raise the pass rate before it ships.
- The gates stay free of any model, since the agent only ever reads their output.

### Cons

- A live run costs money and needs credentials for each harness in the matrix.
- Model behaviour drifts over time, so a sweep is only comparable with sweeps run close to it.
