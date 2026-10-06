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
`--config FILE` reads a config other than the one at the project root.
`--no-plugins` runs the built-in rules only.
`--list-rules` prints every active rule by category, including plugin rules.
Exit codes are 0 for clean, 1 for findings, and 2 for a usage error.

## The rules

Nine rules in three categories.
[RULES.md](RULES.md) shows a failing example and the fix for each one.
[docs/DATA_MODEL.md](docs/DATA_MODEL.md) diagrams how a rule is checked, fixed and verified.

| Category | Rules | What it guards |
|---|---|---|
| Sentence | sentence-one-per-line, sentence-word-budget-exceeded | How a sentence is laid out and how long it runs |
| List | list-semicolon-delimited-run, list-interpunct-joined-run, list-inline-enumeration-markers, list-comma-labelled-run, list-stacked-interpunct-runs | A list hidden in running prose, promoted to a real markdown list |
| Punctuation | punctuation-em-dash-in-prose, punctuation-interpunct-in-prose | A glyph that reads as generated text |

Every fix is verified before it is written.
A fix that would change a word, url or code value is a bug and fails the run.
A case the fixer cannot read unambiguously is refused, so the finding stays for a human.
The reasoning behind each choice is recorded in [`adrs/`](adrs/index.md).

Code blocks are exempt.
Fences tagged `markdown` or `md` are the exception, since they hold templates whose body is audited recursively.

## Plugins and local rules

A project adds its own rules without forking this package.
Both sources load on their own, with no config, and every run prints a line saying what it loaded.

- **Local rules.** A `.js` or `.mjs` file in `.prose-gates/rules/` exports one rule, and its id is `local/` followed by the file name.
- **Plugin packages.** A dependency named `prose-gates-plugin-name` or `@scope/prose-gates-plugin-name` loads under the namespace its own `meta.namespace` declares.
- **New categories.** A plugin declares a category of its own, such as `frontmatter`, and its rules use it.
- **Same treatment.** A plugin rule is switched off, given options and listed exactly like a built-in, and its fixer is verified like a built-in fixer.

A config at the project root switches rules off and sets options.

```json
{
  "rules": {
    "list-semicolon-delimited-run": "off",
    "local/frontmatter-description-word-budget": ["error", { "keys": ["description"], "maxWords": 40 }]
  }
}
```

Plugins are trusted code with no sandbox.
Running the CLI in a repository runs that repository's local rules and declared plugins, so use `--no-plugins` on one you do not trust.
[docs/plugins.md](docs/plugins.md) is the authoring guide, and [`examples/plugin-skills`](examples/plugin-skills) holds a working plugin.

## Consuming it

Each meta repo declares this package and runs it through a `docs-ci` target.

```sh
bun add --dev @jpeakai/prose-gates
```

npm works the same way, with `npm install --save-dev @jpeakai/prose-gates`.
The library exports `checkMarkdown` and `fixMarkdown`, and `@jpeakai/prose-gates/testing` exports the helpers a plugin's tests use.
Bun imports the TypeScript source, and Node imports the bundle in `dist/`.

Generated markdown is gated too.
A finding there is traced back to the source that rendered it, either the record or the template, and never fixed in the output.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the make targets and how a change is accepted.
Releases are covered in [docs/PUBLISHING.md](docs/PUBLISHING.md).

## License

MIT, see [LICENSE](LICENSE).
