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
make test      # run the test suite once
make ci        # fix, typecheck, coverage gate, then assert the tree is clean
make docs-ci   # gate every markdown file with this repo's own source
```

Both `make ci` and `make docs-ci` must pass before a change is accepted.
The coverage gate fails below 90% aggregate for functions or lines.

## Changing a fixer

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

## Commit messages

Explain the change and the reason for it, not the mechanics of the diff.
A commit that changes a generated file includes the source change that produced it.
