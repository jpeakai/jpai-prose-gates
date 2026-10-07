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
- [TypeScript rules](#typescript-rules)
- [When a load fails](#when-a-load-fails)
- [Strict, lenient and validated loading](#strict-lenient-and-validated-loading)
- [Config errors](#config-errors)
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
[docs/engines.md](engines.md) shows what each view holds at every point of a check and a fix.
[docs/DATA_MODEL.md](DATA_MODEL.md) is the full reference for the model.

## Findings and fixes

A check returns a list of `{ line, message }`, or a promise of one.
Write it `async` when it needs to wait on a tool or a service, and the engine awaits it.
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
| `same-frontmatter-data` | Frontmatter is written differently and means the same | The YAML parses to identical data before and after, and nothing outside it moves |
| `replace-paragraph` | One paragraph becomes other blocks | The new blocks are exactly the fragment, and nothing else moves |

A fix that changes a word, adds one, or loses a url or a code value stops the run.
An edit whose result is not the structure it declared is refused, and the finding stays.
An edit with offsets outside the source is refused before it is applied.
A fixer that throws, or returns something that is not a list of edits, stops the run and names the rule.

A fixer may also be `async`, and it is awaited.
Checks are all started at once and overlap while they wait.
Fixers are asked one at a time, in priority order, because each one sees the text the last one left.

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
{
  format: "yaml",
  entries: [{ key: "description", value: "…", line: 3, start: 24, end: 62 }], // top level only
  scalars: [/* every string at any depth, in document order */],
  document: /* the whole parsed YAML document, from the yaml package */,
  offset: 4, // where the YAML text starts in the source
  lineOf: (absoluteOffset) => 3, // the file line of an offset
}
```

You can iterate the whole document in three ways.

- **`scalars`.** Every string value at any depth, found by walking maps and lists in document order.
- **`document`.** The `yaml` package's parsed `Document`, so you can call `visit`, `getIn`, `toJS` or read any node's range.
- **`entries`.** The flat top-level case, kept because it is all most rules need.

A scalar carries what a rule needs to report on it and to rewrite it.

| Field | What it holds |
|---|---|
| `path` | The keys and list indexes from the root, such as `["metadata", "description"]` |
| `key` | The nearest map key above it at any depth, so a list item belongs to the key above the list |
| `keyLine` | The file line of that key |
| `value` | The string as YAML reads it, so a folded block arrives joined |
| `line`, `start`, `end` | Where the value is in the file, quotes included |
| `style` | `plain`, `double`, `single`, `literal` or `folded` |
| `indent` | The leading spaces of the line the key sits on, which a rewrite needs to indent a block |
| `node` | The `yaml` `Scalar`, for anything else |

- **Any depth.** A rule that matches the key `description` checks one in a nested map or a list too.
- **Real lines.** `line` is the file line where the value starts, even for a folded or quoted value.
- **Strings only.** A number, a boolean or an alias is not in `scalars`, and an alias is not followed.
- **Read on first use.** Invalid YAML throws, and a check that throws becomes a finding for that rule.
- **Fixable.** A fixer may rewrite frontmatter if it declares `same-frontmatter-data`, which proves the data is unchanged.

[`examples/plugin-skills`](../examples/plugin-skills) and [`examples/plugin-skills-typescript`](../examples/plugin-skills-typescript) hold the same two rules.
One applies the sentence budget to every `description`, at any depth.
The other has a fixer that rewrites a multi-sentence description as a folded block scalar, which is the worked example of a frontmatter fix.

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

test("flags a long description", async () => {
  const found = await checkRule(plugin, "frontmatter-description-word-budget", doc, { maxWords: 20 });
  expect(found).toHaveLength(1);
});
```

`localPlugin(key, module)` wraps a local rule file the way the loader does.
Both return promises, so `await` them.
`fixRule` returns the fixed text and what was applied or refused, and a fixer that loses a word rejects as it would in a run.
Test against real strings and files, and never with a mock.

## TypeScript rules

A local rule may be a `.ts` or `.mts` file, such as `.prose-gates/rules/frontmatter-description-sentence-length.ts`.
It is imported as it is, so the runtime has to be able to import TypeScript.

| Runtime | Works |
|---|---|
| Bun, including `bunx --bun @jpeakai/prose-gates` | Yes |
| Node 22.18 or newer, which strips types by default | Yes |
| Node 22.6 to 22.17 with `--experimental-strip-types` | Yes |
| Node 20, or an older Node without the flag | No, and the error says how to fix it |

`bunx` runs a package's own shebang, which is `node`, so a plain `bunx @jpeakai/prose-gates` uses Node.
Add `--bun` to run it under Bun, or use a recent Node.
Node strips types and does not check or transform them, so write erasable syntax only, with no enums and no parameter properties.

A `.cts` file is refused, because the loader imports modules.
A `.d.ts` file is ignored, so a declaration file can sit beside the rules.

## When a load fails

Every failure is a named error with a stable code, the source, and the reason.
By default it stops the run with exit code 1, because a rule that quietly did not run looks the same as a clean document.

```text
error[plugin-contract]: plugin .prose-gates/rules/no-todo.mjs: rule "no-todo" must start with its category, as "sentence-short-name"
```

| Code | Class | Cause |
|---|---|---|
| `plugin-not-installed` | `PluginNotInstalledError` | A declared or listed package is not installed |
| `plugin-import` | `PluginImportError` | The module threw, or could not be found, when imported |
| `plugin-contract` | `PluginContractError` | The shape, version, namespace, category or a rule's declaration is wrong |
| `plugin-conflict` | `PluginConflictError` | Two plugins use one namespace or declare one new category |
| `plugin-source` | `PluginSourceError` | A `.cts` file, or TypeScript on a runtime that cannot import it |
| `plugin-fixer` | `PluginFixerError` | A fixer threw or returned something that is not a list of edits |

Every class extends `PluginLoadError`, except `PluginFixerError`, which is raised while a run is in progress.
Each carries the fields a tool needs, such as `source`, `other` or `rule`.

## Strict, lenient and validated loading

Strict is the default.
Two options change it, and both stay loud.

- **`--lenient-plugins`.** A plugin that fails to load is left out, one stderr line names it with its code, and the rest still run.
- **`"pluginLoading": "lenient"`.** The same, set in the config.
- **`--validate-plugins`.** Every plugin is loaded and checked, every failure is reported together, and no check or fix runs.

```text
prose-gates: skipped plugin .prose-gates/rules/no-prefix.mjs [plugin-contract]: rule "no-prefix" must start with its category
```

A lenient run exits 1 if a document has findings and 0 if it is clean, whatever it skipped.
A config setting for a rule of a skipped plugin is dropped, with a line saying so.
A typo in a built-in id still fails.
When two plugins clash, the first keeps the namespace and the later one is skipped.

`--validate-plugins` exits 0 when every source is valid and 1 when any fails.
It also fails with exit 2 on a config problem, so it checks the whole setup.
It takes no files, and no `--fix`, `--no-plugins` or `--list-rules`.
Use `--json` for the same result as data, with `valid`, `plugins` and `failures`.

```text
prose-gates: plugin validation failed, 2 of 3 sources
  [plugin-contract] .prose-gates/rules/no-prefix.mjs: rule "no-prefix" must start with its category, as "sentence-short-name"
  [plugin-not-installed] prose-gates-plugin-acme: is declared or listed but not installed; looked from /repo upward. Install it, or remove it
```

## Config errors

A mistake in the config is a usage error with exit code 2.
Each has its own class and code, so a wrapper can branch on the type.

| Code | Class | Cause |
|---|---|---|
| `config-file` | `ConfigFileError` | The file is not valid JSON, threw when imported, or is not `.json` or `.mjs` |
| `config-not-found` | `ConfigNotFoundError` | `--config` names a file that is not there |
| `config-ambiguous` | `AmbiguousConfigError` | Both `.json` and `.mjs` exist at one root |
| `config-shape` | `ConfigShapeError` | An unknown key, or `plugins`, `pluginLoading` or `rules` of the wrong type |
| `rule-setting` | `RuleSettingError` | A rule's setting is not a severity, or a severity and options |
| `unknown-rule` | `UnknownRuleError` | A rule id that matches no loaded rule, including a retired `PG` id |
| `rule-option` | `RuleOptionError` | An option the rule does not take, of the wrong type, or out of range |
| `flag` | `FlagError` | A flag that is missing, contradicts another, or has a bad value |

All of them extend `UsageError`.
`import { UnknownRuleError } from "@jpeakai/prose-gates"` gives every class, and each has a `code` property.

## Trust

A plugin is code that runs with your permissions, and there is no sandbox.
Local rules and declared plugins load without a prompt, and each run prints a line naming what it loaded.

```text
prose-gates: loaded local (1 rule), acme (2 rules)
```

Run `prose-gates --no-plugins` on a repository you do not trust.
Lenient loading skips a failing plugin, but it still runs every plugin that loads, so it is not a safety option.
It runs the built-in rules only and prints what it skipped.
