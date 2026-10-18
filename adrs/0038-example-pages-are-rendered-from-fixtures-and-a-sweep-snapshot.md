---
type: Architecture Decision
title: The Example Pages are rendered from the golden fixtures and a committed Sweep Snapshot
description: The site's examples of fixes and agent rewrites are generated, never written by hand, so they cannot drift from the code
tags: [docs, evals, verification]
status: accepted
accepted_on: 2026-10-18
provenance: The docs site had one short example per rule and no view of how agents rewrite from a finding
enforced_in:
  - scripts/examples-pages.ts, which renders docs/examples from tests/fixtures and evals/results/sweep.json, and stops when a fixture's fix has drifted
  - tests/examples-pages.test.ts, which fails when a committed page differs from a fresh render
  - evals/snapshot.py, which keeps a live sweep as the Sweep Snapshot with local paths removed
generated: { by: human:maintainer, at: 2026-10-18T00:00:00Z }
---

<!-- GENERATED from PRS-0038 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Extends [PRS-0002](0002-generated-markdown-is-gated.md) (the generated pages are gated like every other markdown file)
- Depends on [PRS-0035](0035-finding-messages-are-measured-by-agent-evals.md) (the agent rewrites come from the live eval sweep)
- See also [PRS-0029](0029-the-docs-site-is-assembled-from-the-real-documents.md) (the site copies the generated pages like any other document)

## Decision

### The lens

#### Given

golden fixtures the tests already hold to the code, and an eval cache that git ignores and every sweep replaces

#### We prefer

pages rendered from the fixtures and from a committed snapshot of one sweep, over examples written by hand

#### Because

a hand-written example drifts silently, while a rendered one shows the gate as it is today and fails a test when stale

#### Unless

a sweep is too costly to repeat, which leaves the snapshot older than the rules, as the page says

## Consequences

### Pros

- Every finding on an Example Page is the gate's output at render time.
- A rule that tightens after a sweep shows as findings on the old rewrites.

### Cons

- The snapshot is a dated copy, so its rewrites age until the next sweep is kept.
- Agent messages are published, so the snapshot must strip local paths before it is committed.
