---
type: Architecture Decision
title: A local rule may be TypeScript where the runtime can import it
description: .ts and .mts rules are imported as they are, and a runtime that cannot says how to fix it
tags: [plugins, typescript, runtime]
status: accepted
accepted_on: 2026-10-07
provenance: Raised in review of PR 10, which asked for a rule such as frontmatter-description-sentence-length.ts to work under bunx
enforced_in:
  - src/plugins/runtime.ts, which says whether the running process can import TypeScript
  - src/plugins/load.ts, which refuses a file the runtime cannot import with a named error
  - src/plugins/discover.ts, which finds .ts, .mts and .cts files and ignores declaration files
  - tests/modes.test.ts, which runs a .ts rule under Bun and under the Node bundle
generated: { by: human:maintainer, at: 2026-10-07T00:00:00Z }
---

<!-- GENERATED from PRS-0026 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Depends on [PRS-0022](0022-plugins-load-automatically.md) (local files are one of the sources discovery finds)
- Depends on [PRS-0012](0012-node-runs-a-published-bundle.md) (the Node bundle imports the rule with the runtime it is given and uses no Bun global)

## Decision

### The lens

#### Given

a local rule is written in TypeScript

#### We prefer

importing it as it is and requiring a runtime that can, over bundling a transpiler

#### Because

Bun and recent Node strip types natively, and a transpiler is a dependency we would own

#### Unless

a runtime cannot import TypeScript, which is a named plugin-source error that says how to fix it

## Consequences

### Pros

- A rule can share types and idioms with the project it checks.
- There is no compiler in the dependency list.

### Cons

- A rule that needs enums or other non-erasable syntax does not run under Node without a flag.
- Node 20 cannot run a TypeScript rule at all.
