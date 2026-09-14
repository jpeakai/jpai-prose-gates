# CLAUDE.md

Operating instructions for agents working in `jpai-prose-gates`, the deterministic markdown gates and their fixers.

Read [docs/CONVENTIONS.md](docs/CONVENTIONS.md) before creating, moving or renaming any document.
It is the declared dialect and it outranks any general convention.

## Commands

```sh
make fix       # biome autofix, then regenerate the ADR bundle
make check     # the gate GitHub Actions and npm publish run, with no private tooling
make ci        # fix, typecheck, tests at 90% coverage, then assert the tree is clean
make docs-ci   # run this repo's own gates over every markdown file
```

## Decisions

Accepted decisions live in [`adrs/`](adrs/), covering how the gates parse, fix and verify.
Check them before raising an open question, and self-answer from an existing record where one applies.
Record a new binding decision as a new `.yml` record in the same change that makes it.
An accepted record is never rewritten, and a later decision supersedes it through a typed relation.

## Language

[GLOSSARY.md](GLOSSARY.md) is the canonical vocabulary for this repo.
Use its terms for every identifier, filename and piece of prose, never an ad-hoc synonym.
When a new domain term enters the code or the conversation, add it to the glossary in the same change.

## Never

- Never edit a generated file.
  Everything in `adrs/` except the `.yml` records is generated.
  So is `dist/`, which `make build` bundles from `src/` for Node and git ignores.
- Never let a fixer guess.
  An ambiguous case refuses and stays reported, per [PRS-0004](adrs/0004-a-fixer-refuses-when-unsure.md).
- Never add a fixer for PG002.
  Shortening a sentence changes its words, per [PRS-0006](adrs/0006-sentence-length-is-never-autofixed.md).
- Never fix a fix bug without first adding the adversarial test that reproduces it.
- Never use a Bun global in `src/`.
  The Node bundle must run without Bun, and a test checks it.
- Never push to main.
  Every change lands through a pull request that passes CI, per [PRS-0014](adrs/0014-main-changes-only-through-pull-requests.md).
- Never publish from a laptop or from a branch, except the first version of a new package.
  Releases run through the Publish workflow on main, per [PRS-0013](adrs/0013-releases-publish-from-github-actions.md).
- Never use mocks in tests.
  Tests run the real parser over real strings and files.

## More

- [CONTRIBUTING.md](CONTRIBUTING.md) for setup and how a change is accepted.
- [README.md](README.md) for what this repo is and what it contains.
