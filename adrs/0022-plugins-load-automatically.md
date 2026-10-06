---
type: Architecture Decision
title: Plugins and local rules load on their own from declared sources
description: Local rule files and declared plugin dependencies load with no config, and every run says so
tags: [plugins, security, discovery]
status: accepted
accepted_on: 2026-10-06
provenance: Raised in review of issue 7, where the first recommendation of explicit loading was reversed in favour of auto-detection
enforced_in:
  - src/plugins/discover.ts, which finds the sources and never scans node_modules
  - src/plugins/index.ts, which loads them in a fixed order
  - src/cli.ts, which prints the loaded line and takes --no-plugins and --list-rules
  - tests/plugins.test.ts, which covers every source, every name that must not match and every refusal
generated: { by: human:maintainer, at: 2026-10-06T00:00:00Z }
---

<!-- GENERATED from PRS-0022 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: Zero setup is worth having, and running a repository's code is the price.
> The price has to be visible every time, and there has to be a way to refuse it.

## Relates to

- Depends on [PRS-0019](0019-plugin-contract-and-namespace.md) (discovery finds modules that have the plugin shape)
- Depends on [PRS-0021](0021-plugins-declare-their-categories.md) (a local file declares its category by exporting it)
- Depends on [PRS-0018](0018-config-file-and-rule-control.md) (the config can list extra plugins or switch them all off)
- Depends on [PRS-0012](0012-node-runs-a-published-bundle.md) (the loader runs under the Node bundle and uses no Bun global)

## Problem

### Symptom

A rule set that a user could not extend, and a proposal that made extending it a manual wiring job.

### Pain point

Running a markdown linter in a cloned repository now runs that repository's code, which nobody expects of a linter.

## Decision

### The lens

- **Given**: a project has local rule files or depends on a prose-gates plugin
- **We prefer**: loading both with no config and saying so on every run, over a config that must list them
- **Because**: a project that depends on a plugin has already chosen it
- **Unless**: the run is on a repository that is not trusted, which --no-plugins is for

### In practice

- Sources load in this order, local files, then declared packages by name, then entries in the config.
- Local rules are .js or .mjs files in .prose-gates/rules, under the namespace local. A .ts file there fails with the reason.
- A package is read from dependencies, devDependencies and optionalDependencies of the root package.json, never from a scan of node_modules.
- A name matches ^(@scope/)?prose-gates-plugin(-name)?$, so prose-gates-plugin-acme and @acme/prose-gates-plugin-acme both match.
- A matching dependency that is not installed fails the run with its name. There is no skipped plugin.
- A package that is listed twice loads once.
- A run prints one stderr line naming each namespace and its rule count, and --json carries the same list.
- Passing --no-plugins, or setting plugins to false, runs built-ins only and prints what was skipped.
- There is no sandbox, no trust prompt and no pinning. A typosquatted dependency name would run.

## Consequences

### Pros

- A project gains a rule by adding a file or a dependency.
- A reviewer can see in any log what ran.

### Cons

- Cloning an untrusted repository and running the CLI can run its code, unless --no-plugins is given.
- A trust prompt or an allow list would close this and is a later record.
