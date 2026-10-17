---
type: Architecture Decision
title: The docs site is assembled from the real documents and deploys only from main
description: MkDocs Material builds from a copy of the repo's own layout, so the prose gates keep reading the real files
tags: [documentation, site, workflow]
status: accepted
accepted_on: 2026-10-09
provenance: Raised by issue 13, which asked for an MkDocs Material site on GitHub Pages
enforced_in:
  - scripts/assemble-site.ts, which copies the documents into tmp/site-src with the repo layout and rewrites only the links that leave the published set
  - mkdocs.yml, whose docs_dir is tmp/site-src and whose build runs in strict mode
  - Makefile, whose docs target runs in make ci
  - .github/workflows/docs.yml, which builds on a pull request and deploys only on a push to main
  - docs/CONVENTIONS.md, whose pointer names the site source
generated: { by: human:maintainer, at: 2026-10-09T00:00:00Z }
---

<!-- GENERATED from PRS-0029 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Depended on by [PRS-0032](0032-the-site-theme-is-a-copy-of-osakanights.md) (the copied theme loads from custom_dir, outside the assembled docs_dir)

## Decision

### The lens

#### Given

the documents are gated in place, the records are generated, and main changes only through pull requests

#### We prefer

a build step that copies the real documents into an untracked tree, over moving files or tracking a second copy

#### Because

the copy is rebuilt on every run and never edited, so the gates and the site always read the same words

#### Unless

a document needs site-only content, which then lives in the real file as an admonition or a tab

## Consequences

### Pros

- The prose gates keep reading the real files, generated records included.
- A broken link fails before merge.
- No document moves, so no existing link or citation breaks.

### Cons

- The site build needs Bun and uv, where a plain MkDocs build needs only Python.
- A link that leaves the published set must be listed in the assemble script.
