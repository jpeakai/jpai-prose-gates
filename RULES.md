# The rules

Every prose gate, grouped by what it guards, with a failing example and what `--fix` does to it.
Each example is real output: `tests/rules-doc.test.ts` runs every block below through the fixer and fails when this page drifts from the code.

A block labelled before is followed by its after, which is exactly what `--fix` writes.
A block labelled reported is a case the fixer leaves alone, so the finding stays for a human.
Rules marked with a star in `--help` have a fixer.

## Categories

| Category | Rules | What it guards |
|---|---|---|
| Sentence | PG001, PG002 | How a sentence is laid out and how long it runs |
| List | PG003, PG006, PG007, PG008, PG009 | A list hidden in running prose, promoted to a real markdown list |
| Punctuation | PG004, PG005 | A glyph that reads as generated text |

The list rules run before the punctuation rules, because a promotion needs the separators a glyph swap would erase.

## Sentence

### PG001

A sentence wrapped across lines, where one sentence per line is wanted.
One sentence per line keeps diffs to the sentence that changed.
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

### PG002

A sentence longer than the word budget, which defaults to 25 words.
It has no fixer, because shortening a sentence changes what it says.

```text reported
The fixer reads the tree and proposes an edit because the rule fired, which the engine verifies when it reparses the document and compares the words it finds.
```

The finding counts potential clauses and suggests how many sentences to split into:

```text
PG002 sentence has 28 words (budget 25) and 4 potential clauses; split it into about 4 shorter sentences, one idea each, rather than compressing the wording
```

The clause count is a guide, not a parse, so a human or agent decides the real split.
Split at the clauses and keep the connective words, rather than deleting words until the sentence fits:

```text
The fixer reads the tree and proposes an edit.
The edit exists because the rule fired.
The engine verifies it by reparsing the document.
It then compares the words it finds.
```

## List

### PG003

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

### PG006

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

### PG007

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

### PG008

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

### PG009

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

### PG004

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

### PG005

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
