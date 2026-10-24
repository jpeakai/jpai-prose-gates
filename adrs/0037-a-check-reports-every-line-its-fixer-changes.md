---
type: Architecture Decision
title: sentence-one-per-line reports several sentences on one line, as its fixer splits them
description: A rule's check reports every paragraph its fixer would change, so a passing file is never rewritten by --fix
tags: [rules, fixes, verification]
status: accepted
accepted_on: 2026-10-17
provenance: Found in a live eval, where gpt-6-luna packed three sentences on one line, the gate passed the file, and --fix still rewrote it
enforced_in:
  - src/rules/sentence-one-per-line.ts, whose check reports a sentence break with no newline, by the rule its reflow splits on
  - tests/adversarial/reflow.test.ts, which requires a report wherever the fixer changes a paragraph
  - the librarian's okf_render.py and record.md.j2, vendored by jpai-meta-cli, which render each sentence of a record field on its own line
generated: { by: human:maintainer, at: 2026-10-17T00:00:00Z }
---

<!-- GENERATED from PRS-0037 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Extends [PRS-0005](0005-every-fix-is-verified.md) (beyond a verified fix, a fix never touches a paragraph the check passed)
- Depends on [PRS-0009](0009-adversarial-and-property-tests-gate-fixes.md) (the adversarial test that reproduces the gap came before the fix)
- See also [PRS-0035](0035-finding-messages-are-measured-by-agent-evals.md) (the eval sweep is how the gap was found)
- Depends on [PRS-0002](0002-generated-markdown-is-gated.md) (generated record markdown failed the stricter check, so the template was fixed at its source)
- See also [PRS-0041](0041-a-comma-run-of-code-spans-is-a-hidden-list.md) (list-comma-code-run reports runs its fix refuses, the other half of keeping check and fix in step)

## Decision

### The lens

#### Given

a check that reported only a sentence wrapped across lines, beside a fixer that splits every sentence onto its own line

#### We prefer

a check that also reports a line holding several sentences, by the same sentence rule the fixer uses, over a fixer narrowed to wraps

#### Because

one sentence per line is the rule's name and its fix, and a check that passes what --fix rewrites leaves a clean file unstable

#### Unless

a fixer refuses a case the check reports, such as a hard break or a blockquote, which leaves the finding for a human

## Consequences

### Pros

- A file that passes the gate is a fixed point of --fix for this rule.
- Agents that pack sentences onto one line now get a finding, not a silent pass.

### Cons

- An abbreviation before a capital, such as Dr.
  Smith, is reported, as the fixer already split it.
- Every bundle rendered by the old template fails until its repo upgrades jpai-meta-cli and regenerates.
