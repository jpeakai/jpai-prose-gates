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

> **Lens**: A docs site tempts a repo to move or copy its documents into one folder.
> A copy that the gates never read, or a move that breaks the root meta-files, loses the guarantee that every published word was gated.

## Problem

### Symptom

MkDocs serves one docs_dir, but the documents live at the root, in docs/ and in adrs/.

### Pain point

Moving them breaks the root meta-files and the generated records, and copying them lets a copy drift from the gated original.

## Decision

### The lens

- **Given**: the documents are gated in place, the records are generated, and main changes only through pull requests
- **We prefer**: a build step that copies the real documents into an untracked tree, over moving files or tracking a second copy
- **Because**: the copy is rebuilt on every run and never edited, so the gates and the site always read the same words
- **Unless**: a document needs site-only content, which then lives in the real file as an admonition or a tab

### In practice

- The site source is tmp/site-src, built by scripts/assemble-site.ts and never committed.
- The copy keeps the repo layout, so a relative link between documents works on GitHub and on the site.
- Links to the examples, the license and package.json become GitHub URLs, because the site does not carry those files.
- The build runs mkdocs build --strict, so a broken link fails the pull request.
- A pull request builds the site and never deploys it.
- A push to main deploys through the github-pages environment.
- The Publish workflow is unrelated and stays unchanged.
- The site shows main, with no version selector, until a release needs older docs.

## Consequences

### Pros

- The prose gates keep reading the real files, generated records included.
- A broken link fails before merge.
- No document moves, so no existing link or citation breaks.

### Cons

- The site build needs Bun and uv, where a plain MkDocs build needs only Python.
- A link that leaves the published set must be listed in the assemble script.
