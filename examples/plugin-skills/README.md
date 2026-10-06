# prose-gates-plugin-skills

A template plugin that holds the frontmatter of an agent skill to a sentence budget.
It adds the category `frontmatter` and one rule, `skills/frontmatter-description-word-budget`.

## What it does

The rule reads the top-level keys named in `keys`, which default to `description`.
It splits each value into sentences and reports any sentence over the word budget.
It never fixes, because shortening a sentence changes its words.

## Use it as a local rule

Copy `rules/frontmatter-description-word-budget.mjs` to `.prose-gates/rules/` in your project.
It loads on its own, and its id is `local/frontmatter-description-word-budget`.

## Use it as a package

Publish this folder as `prose-gates-plugin-skills`, or copy it into your own package.
List it in `devDependencies` and it loads on its own, under the id `skills/frontmatter-description-word-budget`.

## Configure it

```json
{
  "rules": {
    "skills/frontmatter-description-word-budget": ["error", { "keys": ["description", "summary"], "maxWords": 40 }]
  }
}
```

[docs/plugins.md](../../docs/plugins.md) explains every part of the contract.
