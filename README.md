# jpai-prose-gates

Deterministic prose gates for markdown documentation.
Extracted from the `gooddocs` agent skill so the same rules run in CI, not only when an agent is asked.
Incubated in the [`jpai-library`](https://github.com/jpeakai/jpai-library) domain.

## Usage

```sh
bunx --bun prose-gates README.md docs/*.md     # report findings, exit 1 if any
bunx --bun prose-gates --fix README.md         # reflow to one sentence per line
bunx --bun prose-gates --json README.md        # machine-readable output
```

`--max-words N` changes the sentence budget, which defaults to 25.
Exit codes are 0 for clean, 1 for findings, and 2 for a usage error.

## The rules

| Rule | What it catches |
|---|---|
| PG001 | Mid-sentence line wrap, where one sentence per line is wanted |
| PG002 | A sentence longer than the word budget |
| PG003 | A semicolon-delimited list |
| PG004 | An em-dash in prose |
| PG005 | An interpunct in prose |
| PG006 | An interpunct-joined inline list |
| PG007 | Enumeration markers inlined in prose |
| PG008 | A comma-joined labelled run |
| PG009 | Interpunct runs stacked across several lines |

Only PG001 is autofixable.
Every other rule reports, because the fix is a judgement about wording.

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

```sh
make install
make fix        # biome format and lint, autofixed
make ci         # format, lint, typecheck and tests
```
