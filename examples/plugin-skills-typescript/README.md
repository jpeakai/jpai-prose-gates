# prose-gates-plugin-skills-typescript

The [`plugin-skills`](../plugin-skills) example, written in TypeScript.
It has the same two rules and behaves the same, under the namespace `skills-ts`.

| Rule | What it does | Fixer |
|---|---|---|
| `skills-ts/frontmatter-description-word-budget` | Reports a sentence over the word budget in any `description`, at any depth | None |
| `skills-ts/frontmatter-description-multiline-string` | Reports a multi-sentence description on one line | Rewrites it as a folded block scalar |

## Types

Every type a rule needs comes from `@jpeakai/prose-gates`.

```ts
import type { FrontmatterScalar, PluginEdit, PluginFinding, PluginRule } from "@jpeakai/prose-gates";
```

A rule is typed `PluginRule`, so `check` returns `PluginFinding[]` and `fix` returns `PluginEdit[]`.
The engine adds the rule id and the file, so neither type carries them.
The repo type-checks this folder with `strict` on, so the example cannot drift from the API.

## Running it

TypeScript is imported as it is, so the runtime must be able to import it.

| How you load it | Runtime that works |
|---|---|
| A local rule in `.prose-gates/rules/*.ts` | Bun, or Node 22.18 or newer |
| A package in `node_modules` | Bun, or any runtime once it is compiled to JavaScript |

Node does not strip types from a file inside `node_modules`.
Publish a compiled build as the package's `main`, and keep the `.ts` source for local rules.
`bunx --bun @jpeakai/prose-gates` runs everything under Bun.

Write erasable syntax only, with no enums and no parameter properties, so Node can strip it.

## The fixer

The multiline rule rewrites a one-line, multi-sentence description as a folded block.
It declares `{ kind: "same-frontmatter-data" }`, so the engine parses the YAML before and after and refuses the edit unless both give identical data.
[docs/plugins.md](../../docs/plugins.md) explains the expectation and the frontmatter view.
