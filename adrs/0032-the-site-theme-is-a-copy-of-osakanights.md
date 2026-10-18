---
type: Architecture Decision
title: The docs site wears the OsakaNights theme, copied in from jpai-mermaidjs-lint
description: The theme folder is vendored into site-theme/, pulled in with INHERIT, and its tokens are checked on every build
tags: [docs, site, tooling]
status: accepted
accepted_on: 2026-10-17
provenance: Asked for once jpai-mermaidjs-lint extracted its OsakaNights look into a reusable folder
enforced_in:
  - site-theme/osakanights/, the copied theme with its README
  - mkdocs.yml, which inherits the base config and sets custom_dir
  - Makefile, where make docs checks the tokens before building, and make theme writes them
  - .github/workflows/docs.yml, which builds through make docs and rebuilds when the theme changes
generated: { by: human:maintainer, at: 2026-10-17T00:00:00Z }
---

<!-- GENERATED from PRS-0032 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Depends on [PRS-0029](0029-the-docs-site-is-assembled-from-the-real-documents.md) (the theme loads from custom_dir, so it works while the documents are assembled afresh into docs_dir)

## Decision

### The lens

#### Given

a sibling repo publishes a reusable MkDocs Material theme folder

#### We prefer

a copy of the folder in this repo, over a path into the sibling or a package

#### Because

CI checks out this repo alone, and the theme is not published anywhere it could install from

#### Unless

the theme is published as a package, which would supersede the copy with a pinned dependency

## Consequences

### Pros

- The site matches its sibling, and builds in CI with nothing outside the repo.
- A diagram checked for contrast under the mkdocs-material profile reads as it was checked.

### Cons

- The copy can drift from upstream until someone copies it again.
