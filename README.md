# jpai-prose-gates

Deterministic prose gates for markdown documentation.
Extracted from the `gooddocs` agent skill so the same rules run in CI, not only when an agent is asked.
Incubated in the [`jpai-library`](https://github.com/jpeakai/jpai-library) domain.

## Usage

```sh
bunx --bun prose-gates README.md docs/*.md     # report findings, exit 1 if any
bunx --bun prose-gates --fix README.md         # apply every fix proven safe, report the rest
bunx --bun prose-gates --json README.md        # machine-readable output
```

`--max-words N` changes the sentence budget, which defaults to 25.
Exit codes are 0 for clean, 1 for findings, and 2 for a usage error.

## The rules

Nine rules in three categories.
[RULES.md](RULES.md) shows a failing example and the fix for each one.

| Category | Rules | What it guards |
|---|---|---|
| Sentence | PG001, PG002 | How a sentence is laid out and how long it runs |
| List | PG003, PG006, PG007, PG008, PG009 | A list hidden in running prose, promoted to a real markdown list |
| Punctuation | PG004, PG005 | A glyph that reads as generated text |

Every fix is verified before it is written.
A fix that would change a word, url or code value is a bug and fails the run.
A case the fixer cannot read unambiguously is refused, so the finding stays for a human.
The reasoning behind each choice is recorded in [`adrs/`](adrs/index.md).

Code blocks are exempt.
Fences tagged `markdown` or `md` are the exception, since they hold templates whose body is audited recursively.

## Consuming it

Each meta repo declares this package and runs it through a `docs-ci` target.

```json
{ "devDependencies": { "jpai-prose-gates": "git+https://github.com/jpeakai/jpai-prose-gates.git" } }
```

Generated markdown is gated too.
A finding there is traced back to the source that rendered it, either the record or the template, and never fixed in the output.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the make targets and how a change is accepted.
