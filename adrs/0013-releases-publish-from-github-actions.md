---
type: Architecture Decision
title: Releases publish to npm from GitHub Actions through trusted publishing
description: The Publish workflow releases @jpeakai/prose-gates to npm with provenance and no stored token
tags: [packaging, release]
status: accepted
accepted_on: 2026-09-14
provenance: Raised when the package moved from git installs to the npm registry, per PRS-0012
enforced_in:
  - .github/workflows/publish.yml, which creates the tag and release and runs npm publish with provenance
  - .github/workflows/ci.yml, which runs make check on Node 20 and Node 24
  - package.json, whose name is scoped to the jpeakai org and whose prepublishOnly script runs make check
  - docs/PUBLISHING.md, the speed run and the one-time setup
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0013 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A release that depends on one laptop and a long-lived token is slow to repeat and easy to leak.
> The last package published this way took several attempts to get the pipeline right.

## Relates to

- Depends on [PRS-0012](0012-node-runs-a-published-bundle.md) (the workflow publishes the bundle that PRS-0012 builds at pack time)

## Problem

### Symptom

Publishing needed a maintainer to log in to npm and run every step by hand.

### Pain point

A stored npm token can leak, and a hand-run release has no link back to the commit it was built from.

## Decision

### The lens

- **Given**: the package is public on npm under the jpeakai org
- **We prefer**: a workflow_dispatch workflow using npm trusted publishing, over publishing from a laptop or with an NPM_TOKEN secret
- **Because**: trusted publishing needs no stored secret, and provenance ties each version to the workflow run that built it
- **Unless**: npm drops trusted publishing, where a granular automation token in a protected environment replaces it

### In practice

- The version comes from package.json, and the workflow owns the tag and the GitHub release.
- The workflow refuses a version that is already tagged or already on npm.
- CI and prepublishOnly run make check, since make ci needs the meta CLI from a private repo.
- make ci stays the local gate before a release, so the decision bundle is still checked.
- Only the first version is published by hand, because npm attaches a trusted publisher to an existing package.

## Consequences

### Pros

- A release is a version bump, a push and one workflow run.
- Each version carries provenance that npm shows on the package page.

### Cons

- GitHub Actions never renders the decision bundle, so a stale bundle is caught only locally.
