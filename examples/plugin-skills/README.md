# prose-gates-plugin-skills

A template plugin for the frontmatter of an agent skill.
It adds the category `frontmatter` and two rules, under the namespace `skills`.
[`examples/plugin-skills-typescript`](../plugin-skills-typescript) is the same plugin in TypeScript.

## The rules

| Rule | What it does | Fixer |
|---|---|---|
| `skills/frontmatter-description-word-budget` | Reports a sentence over the word budget in any string whose nearest key is `description` | None, because shortening a sentence changes its words |
| `skills/frontmatter-description-multiline-string` | Reports a multi-sentence description written on one line | Rewrites it as a folded block scalar, one sentence per line |

Both read the whole YAML document through `doc.frontmatter.scalars`.
A `description` nested under `metadata`, or inside a list, is checked the same as a top-level one.
Set the `keys` option to look at other keys.

## The fixer

The multiline rule is the worked example of a fixer.

```yaml
description: Use this skill to format reports. It also checks tables.
```

becomes

```yaml
description: >-
  Use this skill to format reports.
  It also checks tables.
```

The edit changes how the value is written and nothing it means.
It declares that with the `same-frontmatter-data` expectation, so the engine parses the YAML before and after and refuses the edit unless both give identical data.
The fixer skips a value that is already a block, that sits on the line below its key, or that has a comment after it, because each of those would change the data.

## Use it as a local rule

Copy a file from `rules/` to `.prose-gates/rules/` in your project.
It loads on its own, and its id is `local/` followed by the file name.
A rule file exports `categories` and a default rule, so it needs nothing else.

## Use it as a package

Publish this folder as `prose-gates-plugin-skills`, or copy it into your own package.
List it in `devDependencies` and it loads on its own, under the ids `skills/...`.

## Configure it

```json
{
  "rules": {
    "skills/frontmatter-description-word-budget": ["error", { "keys": ["description", "summary"], "maxWords": 40 }],
    "skills/frontmatter-description-multiline-string": ["error", { "keys": ["description"] }]
  }
}
```

[docs/plugins.md](../../docs/plugins.md) explains every part of the contract.
