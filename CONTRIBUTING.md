# Contributing

How to set up `jpai-prose-gates`, make a change, and get it accepted.

## Setup

This repo is a bun project with a uv side for tooling.
The bun side is the package itself, and the uv side supplies the `meta` command that renders the decision bundle.

```sh
make install   # uv sync, then bun install
```

## Making a change

```sh
make fix       # biome autofix, then regenerate the ADR bundle
make check     # typecheck, coverage, docs-ci and lint, with Bun alone, as GitHub Actions runs it
make build     # bundle src into dist for Node, which git ignores
make test      # build, then run the test suite once
make ci        # fix, typecheck, coverage gate, then assert the tree is clean
make docs-ci   # gate every markdown file with this repo's own source
```

`dist/` holds the Node bundles and is never committed.
The test targets rebuild it first, so the Node tests never run a stale bundle.

Both `make ci` and `make docs-ci` must pass before a change is accepted.
The coverage gate fails below 90% aggregate for functions or lines.

## Landing a change

Main is protected, per [PRS-0014](adrs/0014-main-changes-only-through-pull-requests.md).
Every change lands through a pull request, and nobody pushes to main directly.

```sh
git switch -c <short-topic>
git push -u origin <short-topic>
gh pr create --fill
```

A pull request merges once Check (Node 20) and Check (Node 24) pass on its latest commit.

## Changing a fixer

[docs/DATA_MODEL.md](docs/DATA_MODEL.md) diagrams the document model, the rule contract and the two pipelines.
It also carries the steps for adding a rule and choosing its expectation.

The test suite has four layers, and a fix change touches the ones that apply.

- `tests/fixtures/fix/<rule>-<case>/` holds an exact `input.md` and `expected.md` pair.
- `tests/adversarial/` holds hostile inputs, asserted with `refuses` or `fixesTo`.
- `tests/property/` holds fast-check properties over generated documents.
- `tests/fix/verify.test.ts` covers the verifier itself.

A bug found in a fixer gets an adversarial test that fails before the fix lands.

## Recording a decision

A binding decision is recorded as a new `.yml` record in `adrs/` in the same change that makes it.
Copy the shape of an existing record, give it the next number, and keep the `PRS-` prefix.
Every typed relation needs its back-edge in the target record.
Run `make fix` to validate the record and regenerate the bundle.
A record that fails the schema stops the build, which is deliberate.

## Publishing a release

Releases go through the Publish workflow in GitHub Actions.
[docs/PUBLISHING.md](docs/PUBLISHING.md) has the speed run, the one-time setup and the failure table.

## Commit messages

Explain the change and the reason for it, not the mechanics of the diff.
A commit that changes a generated file includes the source change that produced it.
