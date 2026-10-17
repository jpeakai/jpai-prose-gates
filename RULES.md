# The rules

Every prose gate, grouped by what it guards, with a failing example and what `--fix` does to it.
Each example is real output: `tests/rules-doc.test.ts` runs every block below through the fixer and fails when this page drifts from the code.

A block labelled before is followed by its after, which is exactly what `--fix` writes.
A block labelled reported is a case the fixer leaves alone, so the finding stays for a human.
A block labelled rewritten follows a reported one, and shows a rewrite that passes every rule.
Rules marked with a star in `--help` have a fixer.

## Categories

| Category | Rules | What it guards |
|---|---|---|
| Sentence | sentence-one-per-line, sentence-word-budget-exceeded | How a sentence is laid out and how long it runs |
| Paragraph | paragraph-sentence-budget-exceeded | How many sentences a paragraph holds before a break |
| List | list-semicolon-delimited-run, list-interpunct-joined-run, list-inline-enumeration-markers, list-comma-labelled-run, list-stacked-interpunct-runs | A list hidden in running prose, promoted to a real markdown list |
| Punctuation | punctuation-em-dash-in-prose, punctuation-interpunct-in-prose | A glyph that reads as generated text |

The list rules run before the punctuation rules, because a promotion needs the separators a glyph swap would erase.

## Sentence

### sentence-one-per-line

A sentence wrapped across lines, or several sentences on one line, where one sentence per line is wanted.
One sentence per line keeps diffs to the sentence that changed.
The check reports every paragraph the fix would change, so a file that passes is left alone by `--fix`.
The fix reflows the paragraph so each line holds one whole sentence.

```text before
The parser reads the file
and hands the tree to every rule. Each rule
reports what it finds.
```

```text after
The parser reads the file and hands the tree to every rule.
Each rule reports what it finds.
```

### sentence-word-budget-exceeded

A sentence longer than the word budget, which defaults to 25 words.
It has no fixer, because shortening a sentence changes what it says.

```text reported
The fixer reads the tree and proposes an edit because the rule fired, which the engine verifies when it reparses the document and compares the words it finds.
```

The finding counts potential clauses and suggests how many sentences to split into:

```text
sentence-word-budget-exceeded sentence has 28 words (budget 25) and 6 potential clauses; split it into about 6 shorter sentences, one idea each, rather than compressing the wording
```

The clause count is the larger of two signals.
One is the punctuation and marker words between clauses: a semicolon, a comma before "and", or a word such as "because" or "which".
The other is the verb phrases compromise finds, since every clause has a verb.
Here the sentence has six verbs and only four markers, so it counts six.

The count is a guide, not a parse, so a human or agent decides the real split.
Split at the clauses and keep the connective words, rather than deleting words until the sentence fits:

```text rewritten
The fixer reads the tree.
It proposes an edit because the rule fired.
The engine verifies that edit.
To do so, it reparses the document.
It then compares the words it finds.
```

## Paragraph

### paragraph-sentence-budget-exceeded

A paragraph of more sentences than the paragraph budget, which defaults to 5.
Short sentences still make a wall of text when there are enough of them, so this rule and the word budget catch different problems.
It has no fixer, because where a paragraph breaks depends on its topics.

The rule counts sentences, not source lines, so wrapping a paragraph never resets the count.
A blank line, a heading, a list or a fence ends a paragraph.
Paragraphs inside list items and blockquotes are counted too, and table cells, code and frontmatter are exempt.
An abbreviation such as e.g. or Dr. does not end a sentence, and neither does a terminal inside inline code or a url.

```text reported
The parser reads each markdown file once.
It builds a syntax tree that every rule shares.
Parsing twice would let two rules disagree about the tree.
Releases publish from GitHub Actions on main.
A release needs a signed tag and a green build.
The publish workflow refuses to run from a branch.
Plugins load on their own from the project folder.
```

The finding counts the topics and names the sentences to break after:

```text
paragraph-sentence-budget-exceeded paragraph has 7 sentences (budget 5) and about 3 topics; break it after sentences 3 and 6, one topic per paragraph
```

A topic turns where two neighbouring sentences share no content word.
A sentence that opens with a word like "it" or "this" refers back, so it stays with the one before it.
Break at each turn and leave every sentence as it is:

```text rewritten
The parser reads each markdown file once.
It builds a syntax tree that every rule shares.
Parsing twice would let two rules disagree about the tree.

Releases publish from GitHub Actions on main.
A release needs a signed tag and a green build.
The publish workflow refuses to run from a branch.

Plugins load on their own from the project folder.
```

A list written as prose is often why a paragraph runs long.
This rule runs after the list rules, so a paragraph that a list rule reports is left to that rule.
Once the list is promoted, the paragraph is counted again, and `--fix` often settles both at once.
This paragraph reports only list-semicolon-delimited-run, and `tests/fixtures/paragraph/semicolon-list` holds the pair to the code:

```text
A release runs from the Publish workflow on main.
The workflow needs: a version bump; a changelog entry; a green build; and a signed tag.
It then uploads the package to npm.
The tag starts the GitHub release.
The release notes come from the merged pull requests.
Nothing in that path runs from a laptop.
```

The fix promotes the list, which leaves two short paragraphs and nothing to report:

```text
A release runs from the Publish workflow on main.
The workflow needs:

- a version bump
- a changelog entry
- a green build
- a signed tag

It then uploads the package to npm.
The tag starts the GitHub release.
The release notes come from the merged pull requests.
Nothing in that path runs from a laptop.
```

With the list rule switched off, the paragraph is counted as it stands.

The `maxSentences` option sets the budget, for a project that wants shorter or longer paragraphs:

```json
{ "rules": { "paragraph-sentence-budget-exceeded": ["error", { "maxSentences": 4 }] } }
```

## List

### list-semicolon-delimited-run

A semicolon-delimited list, meaning two or more semicolons in one sentence.
A single joining semicolon is allowed.
When the sentence has a colon lead-in, the fix promotes the items to a bullet list.

```text before
A release needs: a signed tag; a changelog entry; and a green build.
```

```text after
A release needs:

- a signed tag
- a changelog entry
- a green build
```

Without a colon there is no lead-in to keep, so the fixer refuses.

```text reported
A release needs a signed tag; a changelog entry; a green build.
```

### list-interpunct-joined-run

Items joined by interpuncts inside one paragraph.
The fix promotes them to a bullet list after the label.

```text before
Stack: Bun · TypeScript · biome.
```

```text after
Stack:

- Bun
- TypeScript
- biome
```

### list-inline-enumeration-markers

Enumeration markers such as `(a)` and `(b)`, or `(1)` and `(2)`, inlined in prose.
The fix promotes them to a numbered list.

```text before
The engine (a) parses the file, (b) runs each fixer and (c) verifies the result.
```

```text after
The engine:

1. parses the file
2. runs each fixer
3. verifies the result
```

Markers used as back-references are not a list, so the fixer refuses.

```text reported
See (a) above and (b) below.
```

### list-comma-labelled-run

A run of three or more comma-joined items that each start with a label.
The fix promotes them to a bullet list and keeps each label.

```text before
Targets: `fix` regenerates the bundle, `ci` asserts a clean tree, and `docs-ci` gates the prose.
```

```text after
Targets:

- `fix` regenerates the bundle
- `ci` asserts a clean tree
- `docs-ci` gates the prose
```

### list-stacked-interpunct-runs

Interpunct runs stacked on consecutive lines, each with its own label.
The fix promotes them to a nested list, one parent item per label.

```text before
Runtime: Bun · Node
Tooling: biome · tsc
```

```text after
- Runtime
  - Bun
  - Node
- Tooling
  - biome
  - tsc
```

A line without a label has no parent item to hang under, so the fixer refuses.

```text reported
Runtime: Bun · Node
no label · here
```

## Punctuation

### punctuation-em-dash-in-prose

An em-dash in prose.
A pair of em-dashes becomes parentheses, and a lone one becomes a colon.

```text before
The engine — not the fixer — decides what is kept.
```

```text after
The engine (not the fixer) decides what is kept.
```

```text before
One rule matters — never guess.
```

```text after
One rule matters: never guess.
```

An em-dash between numbers is a range that wants an en-dash rather than a colon, so the fixer refuses.

```text reported
Pages 10 — 12 cover it.
```

### punctuation-interpunct-in-prose

A stray interpunct in prose, outside a run of items.
A spaced interpunct becomes a comma.

```text before
Written in TypeScript · run on Bun.
```

```text after
Written in TypeScript, run on Bun.
```

## Exemptions

Code is exempt, both inline and in fences.
Fences tagged `markdown` or `md` are the exception, since they hold templates whose body is audited recursively and never fixed.
YAML and TOML frontmatter is metadata, so no rule reads it.
