# Writing plugins and local rules

How to add a rule of your own, as a file in your project or as a package.
The decisions behind it are [PRS-0019](../adrs/0019-plugin-contract-and-namespace.md) to [PRS-0023](../adrs/0023-frontmatter-is-a-read-only-view.md).

## Contents

- [A local rule in one file](#a-local-rule-in-one-file)
- [What a rule receives](#what-a-rule-receives)
- [Findings and fixes](#findings-and-fixes)
- [Categories](#categories)
- [Frontmatter](#frontmatter)
- [A plugin package](#a-plugin-package)
- [Configuring a rule](#configuring-a-rule)
- [Testing a rule](#testing-a-rule)
- [When a load fails](#when-a-load-fails)
- [Trust](#trust)

## A local rule in one file

Create `.prose-gates/rules/sentence-no-todo.mjs`.
The file name is the rule key, and the rule is the default export.

```js
export default {
  category: "sentence",
  summary: "a TODO left in the text",
  check: ({ doc }) =>
    doc.paragraphs
      .filter((p) => p.raw.includes("TODO"))
      .map((p) => ({ line: p.line, message: "TODO left in the text" })),
};
```

Run `prose-gates README.md`.
The rule loads on its own, and a finding reads `README.md:12 local/sentence-no-todo TODO left in the text`.

The key must start with its category, written `category-short-name`.
That is the same convention the built-in rules follow, and a key that breaks it fails the load.

## What a rule receives

A check receives one context object.

| Field | What it holds |
|---|---|
| `doc` | The parsed document: `src`, `tree`, `paragraphs`, `texts`, `fences` and `frontmatter` |
| `file` | The path being checked |
| `maxWords` | The sentence budget for this run, from the flag, then the rule's option, then 25 |
| `options` | The rule's options from the config, already checked against the types it declared |
| `helpers` | `words`, `sentences` and `lengthMessage`, so a rule needs no import |
| `runs` and `reported` | The interpunct runs, and the ones an enabled rule reports |

A paragraph view has `raw`, `line`, `startOffset`, `endOffset` and `prose`, with code spans already removed from `prose`.
[docs/DATA_MODEL.md](DATA_MODEL.md) describes every view.

## Findings and fixes

A check returns a list of `{ line, message }`.
The line is a whole number from 1.
The engine adds the rule id and the file, so a finding cannot claim to come from another rule.

A fixer is optional and returns edits.

```js
fix: ({ doc }) => {
  const match = /  +/.exec(doc.src);
  if (!match) return [];
  return [{ start: match.index, end: match.index + match[0].length, text: " ", expect: { kind: "same-tree" } }];
},
```

Every edit is verified before it is written.

| Expectation | Use it when | The engine proves |
|---|---|---|
| `same-tree` | Only whitespace moves | The tree is equal once text whitespace is collapsed |
| `same-shape` | A glyph is swapped inside text | The tree keeps its shape and every word |
| `replace-paragraph` | One paragraph becomes other blocks | The new blocks are exactly the fragment, and nothing else moves |

A fix that changes a word, adds one, or loses a url or a code value stops the run.
An edit whose result is not the structure it declared is refused, and the finding stays.
An edit with offsets outside the source is refused before it is applied.
A fixer that throws, or returns something that is not a list of edits, stops the run and names the rule.

Plugin fixers run after the built-ins.
A check that throws does not stop the run.
It becomes a finding for that rule, and the other rules carry on.

## Categories

The category is the first word of a rule key.
`sentence`, `list` and `punctuation` are built in, and any rule may use them.

A new word must be declared.
A local file declares it by exporting `categories`.

```js
export const categories = { frontmatter: "Keys in the leading metadata block of a file" };
```

A package declares it in `meta.categories`.
A word is one lower-case word, and two plugins cannot declare the same one.
A plugin cannot use a word another plugin declared.
`prose-gates --list-rules` shows each category with its description.

## Frontmatter

Built-in rules never read frontmatter.
A plugin rule reads it through `doc.frontmatter`, which is `null` or a list of entries.

```js
{ format: "yaml", entries: [{ key: "description", value: "…", line: 3, start: 24, end: 62 }] }
```

- **Top level only.** An entry is a top-level key whose value is a string, so numbers, lists and nested maps are left out.
- **Real lines.** `line` is the file line where the value starts, even for a folded or quoted value.
- **Read on first use.** Invalid YAML throws, and a check that throws becomes a finding for that rule.
- **Check-only.** No expectation kind fits an edit inside frontmatter, so such an edit is refused.

[`examples/plugin-skills`](../examples/plugin-skills) applies the sentence budget to the `description` of an agent skill.

## A plugin package

A package is a module whose default export is `{ meta, rules }`.

```js
export default {
  meta: {
    name: "acme",
    namespace: "acme",
    apiVersion: 1,
    categories: { tone: "Voice and register" },
  },
  rules: { "tone-no-hedging": { category: "tone", summary: "…", check: () => [] } },
};
```

- **Name.** `prose-gates-plugin-name`, `@scope/prose-gates-plugin-name` or `@scope/prose-gates-plugin`, so it is found automatically.
- **Dependency.** The project lists it in `dependencies`, `devDependencies` or `optionalDependencies`, because only declared packages are discovered.
- **Namespace.** It comes from `meta.namespace`, not the package name, and `local` is reserved.
- **Id.** A rule above is `acme/tone-no-hedging`.
- **Version.** `apiVersion` is `1`, and any other number fails the load with both numbers in the message.
- **Entry.** `exports`, then `main`, then `index.js`, as a resolver reads them.
- **Keyword.** Add `prose-gates-plugin` to `keywords` so people can find it on npm.
- **Peer dependency.** Declare `@jpeakai/prose-gates` as a peer dependency for the types.

A config entry loads a plugin the project does not depend on by that name, such as a path in a monorepo.

```json
{ "plugins": ["./tools/house-style.mjs"] }
```

## Configuring a rule

A rule declares the options it accepts and their types.

```js
options: { keys: "string[]", maxWords: "number" },
```

A type is `number`, `string`, `boolean` or `string[]`.
The config sets them, and a wrong name or type is a usage error with exit code 2.

```json
{
  "rules": {
    "local/frontmatter-description-word-budget": ["error", { "keys": ["description", "summary"], "maxWords": 40 }],
    "acme/tone-no-hedging": "off"
  }
}
```

The severity is `"error"` or `"off"`.
A rule that is off loses its check and its fixer.
An id that matches no loaded rule is a usage error, so a typo cannot silently do nothing.

## Testing a rule

`@jpeakai/prose-gates/testing` runs a rule over real strings through the same loader checks and verified engine.

```ts
import { checkRule, fixRule } from "@jpeakai/prose-gates/testing";
import plugin from "../index.mjs";

test("flags a long description", () => {
  const found = checkRule(plugin, "frontmatter-description-word-budget", doc, { maxWords: 20 });
  expect(found).toHaveLength(1);
});
```

`localPlugin(key, module)` wraps a local rule file the way the loader does.
`fixRule` returns the fixed text and what was applied or refused, and a fixer that loses a word throws as it would in a run.
Test against real strings and files, and never with a mock.

## When a load fails

Every failure names the source and the reason and stops the run with exit code 1.
Nothing is skipped, because a rule that quietly did not run looks the same as a clean document.

| Cause | What the message says |
|---|---|
| A declared plugin is not installed | The package name, and that it is declared or listed but not installed |
| A `.ts` file in `.prose-gates/rules` | That a local rule is a `.js` or `.mjs` file |
| A rule key without its category first | That it must start with its category |
| A new category the plugin did not declare | The category and that it is missing from `meta.categories` |
| Two plugins with one namespace or category | Both sources |
| A different `apiVersion` | The plugin's number and the one supported |

## Trust

A plugin is code that runs with your permissions, and there is no sandbox.
Local rules and declared plugins load without a prompt, and each run prints a line naming what it loaded.

```text
prose-gates: loaded local (1 rule), acme (2 rules)
```

Run `prose-gates --no-plugins` on a repository you do not trust.
It runs the built-in rules only and prints what it skipped.
