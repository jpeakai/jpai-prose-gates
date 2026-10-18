# Documentation Conventions

How `jpai-prose-gates` organises its documentation.
Agents and humans: consult this before creating, moving or renaming any doc.

## Dialect

- **Flavour:** minimal, with an ADR surface promoted to `okf-yaml`, inherited from `jpai-library`
- **Docs taxonomy:** one sectioned README until it passes roughly ten topics, then Diátaxis folders under `docs/`
- **Glossary:** `GLOSSARY.md` at root, one canonical term per concept, new domain terms added in the change that introduces them.
  It follows the librarian glossary template, with one alphabetical H2 per Title Case term.
  Its relationship diagram is split by area to stay within the diagram gates
- **ADR layout:** `okf-yaml`, with records authored in `adrs/NNNN-slug.yml` and markdown generated from them
- **Decision Record ids:** prefixed `PRS-` in this repo, so a citation is unambiguous across bundles
- **Generated paths:** `adrs/*.md`, `adrs/index.md`, `adrs/graph.md`, `adrs/graph.json`, `adrs/graph.html`, `docs/examples/*.md`
- **Regenerate:** `make fix`, and `make ci` asserts the tree is clean afterwards
- **Agent files:** `CLAUDE.md` at root, with no nested agent files
- **Prose gates:** every markdown file is gated by `make docs-ci` using this repo's own source, generated output included
- **Code fences:** a language, then only `key="value"` options such as `title="Before"`, so the site renders them, held by `tests/fences.test.ts`
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
| `docs/engines.md` | What the markdown tree provides at each point of the check and fix engines, as entity and sequence diagrams | Plugin authors | A view, a context, an engine step or the load modes change |
| `docs/plugins.md` | How to write a local rule or a plugin package, and what each part of the contract does | Plugin authors | The plugin contract, the loader or the config changes |
| `examples/` | Working plugins that authors copy and the tests exercise | Plugin authors | The plugin contract changes |
| `docs/examples/*.md` | Generated Example Pages: the fix fixtures before and after, and the agent eval rewrites | Both | Never edited, only regenerated from the fixtures and the Sweep Snapshot |
| `docs/PUBLISHING.md` | The release speed run, the one-time npm setup and the failure table | Maintainers | The release workflow or npm setup changes |
| `.github/workflows/` | CI on every push, the Docs workflow that builds and deploys the site, and the manually triggered Publish workflow | Maintainers | The gate, the site build or the release process changes |
| `mkdocs.yml` | The site theme, the navigation and the extensions | Maintainers | A page is added to the site or the theme changes |
| `scripts/` | Build helpers: the script that assembles the site source, and the one that renders the Example Pages | Maintainers | The site build or an Example Page changes |
| `site-theme/osakanights/` | The OsakaNights MkDocs theme, copied from jpai-mermaidjs-lint, with its own README | Maintainers | The theme changes upstream and is copied again |
| `LICENSE` | The MIT license | Consumers | Never, short of relicensing |
| `dist/` | Generated Node bundles of the CLI and library, ignored by git and shipped in the npm package | Consumers | Never edited, only rebuilt |
| `tests/fixtures/` | Test inputs, not documentation, and never gated | Contributors | A rule's fix behaviour changes |
| `evals/` | Live agent evals of the finding messages, run by `make evals` and never by CI, with the shared skill in `SKILL.md` | Maintainers | A message, a rule without a fixer or the eval matrix changes |
| `evals/results/sweep.json` | The Sweep Snapshot, kept by `make evals-snapshot` from the last live sweep | Maintainers | A new sweep is kept |
| `evals/*/evals/fixtures/` | Seed documents that fail one rule each, not documentation, and never gated | Maintainers | A rule's message or refusal changes |

## Naming

- Root meta-files are UPPERCASE.
- Runbook and dialect files inside `docs/` are UPPERCASE, like `CONVENTIONS.md` and `PUBLISHING.md`.
- Every other file inside `docs/` is lowercase kebab-case.
- Decision Records are `NNNN-slug.yml`, and a number is never reused.
- Rule modules are `src/rules/<rule-id>.ts`, and fixture directories start with the rule id.

## Pointers

- ADR directory: `adrs/`
- Parent bundle: `jpai-library/adrs/`, which holds where this tool sits rather than how it works
- Docs site source: the real documents, copied into `tmp/site-src` by `scripts/assemble-site.ts` and built by `mkdocs.yml`, per [PRS-0029](../adrs/0029-the-docs-site-is-assembled-from-the-real-documents.md)
- Docs site: <https://jpeakai.github.io/jpai-prose-gates/>, deployed from main by `.github/workflows/docs.yml`

## Required cross-links

- `CLAUDE.md` points here, and at the ADR surface with a check-before-you-ask instruction.
- `CLAUDE.md` points at `GLOSSARY.md` with both standing instructions.
- `README.md` points at `CONTRIBUTING.md`.

## Split and merge triggers

- `docs/` adopts Diátaxis folders when the sectioned README passes roughly ten topics.
- The docs site navigation supplies the grouping, so authored files stay flat until a section outgrows its tab.
- Generated pages under `docs/` get a folder of their own, like `docs/examples/`, so they never sit beside authored ones.
- A rule earns its own how-to page when its refusal cases no longer fit one section of `RULES.md`.
