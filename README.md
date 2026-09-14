# jpai-prose-gates

Reading markdown should not be hard.
Keep AI accountable one anti-slop rule at a time.

**[Rules](RULES.md)** | **[GitHub](https://github.com/jpeakai/jpai-prose-gates)** | **[npm](https://www.npmjs.com/package/@jpeakai/prose-gates)**

| Package Index | Published Version | Downloads | Node | CI | License |
|---|---|---|---|---|---|
| npm | [![npm](https://img.shields.io/npm/v/@jpeakai/prose-gates.svg)](https://www.npmjs.com/package/@jpeakai/prose-gates) | [![npm Downloads](https://img.shields.io/npm/dm/@jpeakai/prose-gates.svg)](https://www.npmjs.com/package/@jpeakai/prose-gates) | [![Node](https://img.shields.io/node/v/@jpeakai/prose-gates.svg)](package.json) | [![CI](https://github.com/jpeakai/jpai-prose-gates/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/jpeakai/jpai-prose-gates/actions/workflows/ci.yml) | [![License](https://img.shields.io/npm/l/@jpeakai/prose-gates.svg)](LICENSE) |

## Usage

```sh
bunx @jpeakai/prose-gates README.md docs/*.md     # report findings, exit 1 if any
npx -y @jpeakai/prose-gates --fix README.md  # apply every fix proven safe, report the rest
```

Installed as a dev dependency, the command is `prose-gates`, and `--json` gives machine-readable output.

`--max-words N` changes the sentence budget, which defaults to 25.
Exit codes are 0 for clean, 1 for findings, and 2 for a usage error.

## The rules

Nine rules in three categories.
[RULES.md](RULES.md) shows a failing example and the fix for each one.
[docs/DATA_MODEL.md](docs/DATA_MODEL.md) diagrams how a rule is checked, fixed and verified.

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

```sh
bun add --dev @jpeakai/prose-gates
```

npm works the same way, with `npm install --save-dev @jpeakai/prose-gates`.
The library exports `checkMarkdown` and `fixMarkdown`.
Bun imports the TypeScript source, and Node imports the bundle in `dist/`.

Generated markdown is gated too.
A finding there is traced back to the source that rendered it, either the record or the template, and never fixed in the output.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the make targets and how a change is accepted.
Releases are covered in [docs/PUBLISHING.md](docs/PUBLISHING.md).

## License

MIT, see [LICENSE](LICENSE).
