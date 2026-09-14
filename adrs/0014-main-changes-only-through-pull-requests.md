---
type: Architecture Decision
title: Main changes only through pull requests, and releases run only from main
description: Main is protected so every change lands by a pull request that passes CI, and only main can publish
tags: [release, workflow]
status: accepted
accepted_on: 2026-09-14
provenance: Raised after the first version reached npm, when main was still unprotected
enforced_in:
  - GitHub branch protection on main, which requires a pull request and both CI checks, for admins too
  - GitHub environment npm, whose deployment branch policy admits only main
  - .github/workflows/publish.yml, which refuses a run not started from main and publishes inside the npm environment
  - docs/PUBLISHING.md, whose speed run bumps the version through a pull request
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0014 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A published package turns every commit on main into something a consumer may install next.
> A direct push or a release from a side branch skips the gate that makes that safe.

## Relates to

- Extends [PRS-0013](0013-releases-publish-from-github-actions.md) (the Publish workflow stays, and now only main can start it and only main can reach npm)

## Problem

### Symptom

Any push could land on main, and a Publish run could start from any branch.

### Pain point

A run from a branch executes that branch's copy of the workflow, which could publish code main never had.

## Decision

### The lens

- **Given**: main is the only source of releases, and the package is public on npm
- **We prefer**: branch protection with required checks, plus a main-only environment, over trusting every push and dispatch
- **Because**: npm trusted publishing checks the repo and workflow file but never the branch, so GitHub must refuse other branches
- **Unless**: the repo gains outside maintainers, where a required review is added to the protection

### In practice

- Every change, including a version bump, lands on main through a pull request.
- A pull request merges only when Check (Node 20) and Check (Node 24) pass on its latest commit.
- Protection applies to admins, so no one pushes to main directly.
- No approval is required while there is a single maintainer, who cannot approve their own pull request.
- The Publish workflow fails loudly when started from any branch but main.
- The npm trusted publisher names the npm environment.

## Consequences

### Pros

- Every commit on main has passed CI before it can be released.
- A branch cannot publish, even with an edited copy of the workflow.

### Cons

- A release takes two steps, a merged version bump and a workflow run.
