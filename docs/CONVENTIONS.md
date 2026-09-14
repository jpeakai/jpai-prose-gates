# Documentation Conventions

How `jpai-prose-gates` organises its documentation.
Agents and humans: consult this before creating, moving or renaming any doc.

## Dialect

- **Flavour:** minimal, with an ADR surface promoted to `okf-yaml`, inherited from `jpai-library`
- **Docs taxonomy:** one sectioned README until it passes roughly ten topics, then Diátaxis folders under `docs/`
- **Glossary:** `GLOSSARY.md` at root, one canonical term per concept, new domain terms added in the change that introduces them
- **ADR layout:** `okf-yaml`, with records authored in `adrs/NNNN-slug.yml` and markdown generated from them
- **Record ids:** prefixed `PRS-` in this repo, so a citation is unambiguous across bundles
- **Generated paths:** `adrs/*.md`, `adrs/index.md`, `adrs/graph.md`, `adrs/graph.json`, `adrs/graph.html`
- **Regenerate:** `make fix`, and `make ci` asserts the tree is clean afterwards
- **Agent files:** `CLAUDE.md` at root, with no nested agent files
- **Prose gates:** every markdown file is gated by `make docs-ci` using this repo's own source, generated output included
- **Changelog:** not used
- **Proposals and RFCs:** not used

## Layout map

| Path | Charter | Audience | Changes when |
|---|---|---|---|
| `README.md` | Orientation, usage and the rule categories | Consumers | Purpose, flags or rules change |
| `RULES.md` | Every rule by category, with failing examples and their fixes, held true by a test | Both | A rule, its category or its fix behaviour changes |
| `CONTRIBUTING.md` | Setup, the make targets, how a change is accepted | Contributors | The dev workflow changes |
| `CLAUDE.md` | Agent invariants and pointers, no restated conventions | Agents | Commands or hard boundaries change |
| `GLOSSARY.md` | Ubiquitous language, one canonical term per concept | Both | A domain term enters code or conversation |
| `adrs/*.yml` | Immutable accepted decisions about how the tool works, authored as data | Both | A binding decision is made |
| `adrs/*.md` | Generated reading surface for those records | Both | Never edited, only regenerated |
| `docs/CONVENTIONS.md` | This dialect declaration | Both | A documentation convention changes |
| `docs/DATA_MODEL.md` | The document model, the rule contract and the pipelines, with diagrams and an extension guide | Contributors | A model, an expectation kind or the fix order changes |
| `docs/PUBLISHING.md` | The release speed run, the one-time npm setup and the failure table | Maintainers | The release workflow or npm setup changes |
| `.github/workflows/` | CI on every push, and the manually triggered Publish workflow | Maintainers | The gate or the release process changes |
| `LICENSE` | The MIT license | Consumers | Never, short of relicensing |
| `dist/` | Generated Node bundles of the CLI and library, ignored by git and shipped in the npm package | Consumers | Never edited, only rebuilt |
| `tests/fixtures/` | Test inputs, not documentation, and never gated | Contributors | A rule's fix behaviour changes |

## Naming

- Root meta-files are UPPERCASE.
- Runbook and dialect files inside `docs/` are UPPERCASE, like `CONVENTIONS.md` and `PUBLISHING.md`.
- Every other file inside `docs/` is lowercase kebab-case.
- Records are `NNNN-slug.yml`, and a number is never reused.
- Rule modules are `src/rules/pgNNN-slug.ts`, and fixture directories start with the rule id.

## Pointers

- ADR directory: `adrs/`
- Parent bundle: `jpai-library/adrs/`, which holds where this tool sits rather than how it works
- Docs site source: none

## Required cross-links

- `CLAUDE.md` points here, and at the ADR surface with a check-before-you-ask instruction.
- `CLAUDE.md` points at `GLOSSARY.md` with both standing instructions.
- `README.md` points at `CONTRIBUTING.md`.

## Split and merge triggers

- `docs/` adopts Diátaxis folders when the sectioned README passes roughly ten topics.
- A rule earns its own how-to page when its refusal cases no longer fit one section of `RULES.md`.
