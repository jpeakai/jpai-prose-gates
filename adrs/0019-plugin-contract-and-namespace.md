---
type: Architecture Decision
title: A plugin rule is a built-in rule with a namespace, and the plugin names it
description: A plugin is { meta, rules }, its rules see the built-in context, and its ids carry a namespace
tags: [plugins, architecture, contract]
status: accepted
accepted_on: 2026-10-06
provenance: Raised as phase 2 of issue 7, after surveying how ESLint, Stylelint, markdownlint and Prettier namespace and version plugins
enforced_in:
  - src/plugins/contract.ts, where Plugin, PluginRule and the name patterns are declared
  - src/plugins/load.ts, which checks a plugin against the contract and turns its rules into Rules
  - src/plugins/index.ts, which merges plugins and rejects a repeated namespace
  - tests/plugins.test.ts, which breaks the contract in every way it can be broken
generated: { by: human:maintainer, at: 2026-10-06T00:00:00Z }
---

<!-- GENERATED from PRS-0019 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A third-party rule must not need a second code path in the engine.
> The only new thing a plugin brings is a name that cannot clash with a built-in.

## Relates to

- Depends on [PRS-0018](0018-config-file-and-rule-control.md) (plugin rules join the registry and answer to the same config)
- Depends on [PRS-0008](0008-one-file-per-rule.md) (a plugin rule is the same unit, a check with an optional fix)
- Depends on [PRS-0017](0017-rule-ids-are-category-and-short-name.md) (a rule key is category-short-name and the id adds the namespace in front)
- Depended on by [PRS-0020](0020-plugin-fixers-stay-under-verification.md) (fixers from a plugin are held to the same proof)
- Depended on by [PRS-0021](0021-plugins-declare-their-categories.md) (a plugin declares its categories in its meta)
- Depended on by [PRS-0022](0022-plugins-load-automatically.md) (discovery finds modules that have this shape)
- Depended on by [PRS-0023](0023-frontmatter-is-a-read-only-view.md) (the frontmatter view is part of the model a plugin rule reads)
- Depended on by [PRS-0027](0027-rules-may-be-async.md) (a plugin rule function may return a promise)

## Problem

### Symptom

The rule set, the id type and the fix order were closed arrays and a union of nine literals.

### Pain point

A house style could only be added by changing this repository.

## Decision

### The lens

- **Given**: a user wants a rule this package does not ship
- **We prefer**: a plugin whose default export is { meta, rules }, with rules receiving the built-in context, over a second rule interface
- **Because**: one contract means the engine, the fixer proof and the config treat every rule alike
- **Unless**: the contract must change in a way a plugin would notice, which bumps apiVersion

### In practice

- meta has name, namespace, apiVersion and optional categories. apiVersion is 1, and any other value fails the load with both numbers.
- The namespace comes from meta.namespace only, never from the package name, and must be lower-case words joined by hyphens.
- The namespace local is reserved for local files, and two plugins that claim one namespace fail the load, naming both.
- A rule key is category-short-name, so the key must start with its category and a plugin id reads namespace/category-short-name.
- A rule has a category, a summary, a check, an optional fix and optional typed options.
- The context adds options and helpers, the plain functions words, sentences and lengthMessage, so a plugin never has to import this package.
- A check cannot take the run down. A throw or a malformed finding becomes a finding for that rule and the others carry on.
- A finding carries its own rule id and file whatever the plugin returned, so a plugin cannot report as another rule.

## Consequences

### Pros

- A plugin rule is switched off, given options and listed exactly like a built-in.
- A plugin cannot clash with a built-in id, because a core id has no slash.

### Cons

- A throwing built-in still crashes the run, while a throwing plugin rule does not, so the two are not treated alike.
- apiVersion is one integer, so any breaking change fails every plugin until it is updated.
