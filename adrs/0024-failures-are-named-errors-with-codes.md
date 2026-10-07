---
type: Architecture Decision
title: Every deliberate failure is a named error class with a stable code
description: Usage errors exit 2 and plugin errors exit 1, each class carrying a code and the fields to act on
tags: [errors, cli, config]
status: accepted
accepted_on: 2026-10-07
provenance: Raised in review of PR 10, which asked for each config failure to be a context-specific named error
enforced_in:
  - src/errors.ts, where every class and its code are declared
  - src/cli.ts, which prints error[code] and exits 2 for a usage error
  - src/bin.ts, which prints the code for any other named error and exits 1
  - tests/modes.test.ts, which checks the class, code and fields of each failure
generated: { by: human:maintainer, at: 2026-10-07T00:00:00Z }
---

<!-- GENERATED from PRS-0024 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

> **Lens**: A message is for a person, and a type is for a program.
> A wrapper that must tell a bad config from a bad plugin should not parse prose.

## Relates to

- Depends on [PRS-0018](0018-config-file-and-rule-control.md) (the config failures it names are the ones the config file can raise)
- Depended on by [PRS-0025](0025-plugin-loading-strictness.md) (lenient loading branches on the plugin error classes)

## Problem

### Symptom

Every config failure was a UsageError with a different message, so a caller could only tell them apart by reading the text.

### Pain point

A plugin failure and a config failure looked alike, and a retired rule id and a bad option had no common handling.

## Decision

### The lens

- **Given**: a run can fail because of the invocation, the config, a plugin source or a plugin fixer
- **We prefer**: one error class per cause, each with a stable code and the fields a tool needs, over one class with several messages
- **Because**: a type can be branched on and a message cannot be relied on to stay the same
- **Unless**: a new cause has no class yet, which means adding one rather than reusing a near match

### In practice

- A UsageError exits 2, and covers flags and config. Its subclasses are FlagError, ConfigFileError, ConfigNotFoundError, AmbiguousConfigError, ConfigShapeError, RuleSettingError, UnknownRuleError and RuleOptionError.
- A PluginLoadError exits 1, and covers a source that failed to load. Its subclasses are PluginImportError, PluginContractError, PluginConflictError, PluginNotInstalledError and PluginSourceError.
- PluginFixerError is raised while a run is in progress and always stops it.
- A code is stable kebab-case, such as unknown-rule or plugin-contract, and is shown as error[code] on stderr.
- A class carries what a tool needs, such as the rule, the option, the file, the source or the other plugin in a clash.
- A message keeps its wording where a test or a user may match it, so adding a class does not rename a failure.

## Consequences

### Pros

- A wrapper can branch on the type or the code instead of parsing a message.
- The same codes appear in stderr, in --validate-plugins output and in --json.

### Cons

- A new failure needs a class and a code, which is more to write than a message.
- A code is public, so renaming one breaks a wrapper.
