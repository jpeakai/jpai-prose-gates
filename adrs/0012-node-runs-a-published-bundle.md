---
type: Architecture Decision
title: Node runs a bundle built at publish time, and Bun runs the source
description: The npm package ships Node bundles of the CLI and library that are built when it is packed, and git never tracks them
tags: [packaging, runtime]
status: accepted
accepted_on: 2026-09-14
provenance: Raised after the repo went public, when npx could only run the CLI on a machine that also had Bun
enforced_in:
  - package.json, where bin and the default export point at dist and the bun export points at src
  - package.json, whose prepack script builds dist and whose prepublishOnly script runs make ci
  - .gitignore, which keeps dist out of git
  - tests/cli.test.ts, which runs every bin entry point test under both Bun and Node
generated: { by: human:maintainer, at: 2026-09-14T00:00:00Z }
---

<!-- GENERATED from PRS-0012 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A public package is installed with whatever runtime the consumer has.
> Many projects run npx and Node, and never Bun.

## Relates to

- Depends on [PRS-0001](0001-parse-once-to-mdast.md) (the bundle inlines the mdast parser, so Node needs no dependency install)

## Problem

### Symptom

The bin pointed at TypeScript with a Bun shebang, and the CLI read files through Bun globals.

### Pain point

Node refuses to strip types from a file inside node_modules, so no Node consumer could run it.

## Decision

### The lens

- **Given**: the package is consumed by both Bun and Node projects
- **We prefer**: publishing to npm with a bundle built at pack time, over committing the bundle for git installs
- **Because**: a committed bundle adds a regenerated file of about 300 kilobytes to every source change, and a registry install needs no allow-git opt-in
- **Unless**: the package must be installed from git, where no build step runs and the bundle would have to be committed

### In practice

- src uses node APIs only, never a Bun global.
- make build writes dist, and the test targets build it first so Node tests never run a stale bundle.
- Bun is pinned through packageManager, so every machine builds the same bundle.
- A git install no longer runs the CLI, and the README points consumers at the registry.

## Consequences

### Pros

- npx, bunx and a dev dependency all run with one runtime installed.
- Source changes carry no generated bundle in their diff.

### Cons

- Publishing needs an npm account and a manual release step.
