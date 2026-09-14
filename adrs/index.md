<!-- GENERATED from the bundle's *.yml by okf_render.py. Do not edit; regenerate. -->

# Decision Records

| Record | Decision | Status |
|---|---|---|
| [PRS-0001](0001-parse-once-to-mdast.md) | Every rule reads one mdast tree parsed once per file | accepted |
| [PRS-0002](0002-generated-markdown-is-gated.md) | Generated markdown is gated like hand-written markdown | accepted |
| [PRS-0003](0003-splice-source-never-restringify.md) | Fixes splice source slices and never re-stringify the tree | accepted |
| [PRS-0004](0004-a-fixer-refuses-when-unsure.md) | A fixer refuses whenever the input is ambiguous | accepted |
| [PRS-0005](0005-every-fix-is-verified.md) | Every fix is verified against a content fingerprint and an expected shape | accepted |
| [PRS-0006](0006-sentence-length-is-never-autofixed.md) | Sentence length is reported and never autofixed | accepted |
| [PRS-0007](0007-em-dash-becomes-parentheses-or-colon.md) | An em-dash pair becomes parentheses and a lone em-dash becomes a colon | accepted |
| [PRS-0008](0008-one-file-per-rule.md) | Each rule lives in its own file with its check and its fix together | accepted |
| [PRS-0009](0009-adversarial-and-property-tests-gate-fixes.md) | Adversarial and property tests gate every change to fix behaviour | accepted |
| [PRS-0010](0010-length-findings-guide-a-split.md) | A sentence length finding estimates clauses to guide a split | accepted |
| [PRS-0011](0011-rules-carry-a-category.md) | Each rule carries a category, and RULES.md is held true by a test | accepted |
| [PRS-0012](0012-node-runs-a-published-bundle.md) | Node runs a bundle built at publish time, and Bun runs the source | accepted |
| [PRS-0013](0013-releases-publish-from-github-actions.md) | Releases publish to npm from GitHub Actions through trusted publishing | accepted |
| [PRS-0014](0014-main-changes-only-through-pull-requests.md) | Main changes only through pull requests, and releases run only from main | accepted |
# By group

## architecture

* [PRS-0008](0008-one-file-per-rule.md) - A rule module exports its id, summary, check and optional fix, and a registry lists them in order
## fixing

* [PRS-0003](0003-splice-source-never-restringify.md) - An edit replaces a byte range with text built from source slices, so untouched bytes stay identical
* [PRS-0004](0004-a-fixer-refuses-when-unsure.md) - An unfixable case leaves the source untouched and the finding reported, never a best guess
* [PRS-0005](0005-every-fix-is-verified.md) - A lost word throws, and an unexpected tree shape refuses the edit before it is applied
## gates

* [PRS-0002](0002-generated-markdown-is-gated.md) - Rendered output passes the same gates, and a finding there is fixed in its source or template
## packaging

* [PRS-0012](0012-node-runs-a-published-bundle.md) - The npm package ships Node bundles of the CLI and library that are built when it is packed, and git never tracks them
* [PRS-0013](0013-releases-publish-from-github-actions.md) - The Publish workflow releases @jpeakai/prose-gates to npm with provenance and no stored token
## parsing

* [PRS-0001](0001-parse-once-to-mdast.md) - Rules query a shared syntax tree instead of scanning raw lines with their own regexes
## release

* [PRS-0014](0014-main-changes-only-through-pull-requests.md) - Main is protected so every change lands by a pull request that passes CI, and only main can publish
## rules

* [PRS-0006](0006-sentence-length-is-never-autofixed.md) - PG002 has no fixer, because shortening a sentence is a decision about what it means
* [PRS-0007](0007-em-dash-becomes-parentheses-or-colon.md) - PG004 rewrites only the two dash patterns whose replacement punctuation is unambiguous
* [PRS-0010](0010-length-findings-guide-a-split.md) - PG002 reports potential clauses and a target sentence count, steering a rewrite away from compression
* [PRS-0011](0011-rules-carry-a-category.md) - Rules are tagged sentence, list or punctuation, and their documented examples run through the real fixer
## testing

* [PRS-0009](0009-adversarial-and-property-tests-gate-fixes.md) - Fix behaviour is proven by exact fixtures, hostile inputs and generated documents, all without mocks
# Relationship graph

Open [graph.html](graph.html) to explore the records visually: click a node to read it, and links between records navigate the graph.
The same edge set is rendered as prose in [graph.md](graph.md), and as data in [graph.json](graph.json).

* PRS-0001 --depended_on_by--> PRS-0012
* PRS-0001 --depended_on_by--> PRS-0003
* PRS-0003 --depends_on--> PRS-0001
* PRS-0003 --depended_on_by--> PRS-0005
* PRS-0004 --extended_by--> PRS-0005
* PRS-0004 --depended_on_by--> PRS-0007
* PRS-0004 --tested_by--> PRS-0009
* PRS-0005 --depends_on--> PRS-0003
* PRS-0005 --extends--> PRS-0004
* PRS-0005 --depended_on_by--> PRS-0006
* PRS-0005 --tested_by--> PRS-0009
* PRS-0006 --depends_on--> PRS-0005
* PRS-0006 --extended_by--> PRS-0010
* PRS-0007 --depends_on--> PRS-0004
* PRS-0008 --extended_by--> PRS-0011
* PRS-0009 --tests--> PRS-0004
* PRS-0009 --tests--> PRS-0005
* PRS-0010 --extends--> PRS-0006
* PRS-0011 --extends--> PRS-0008
* PRS-0012 --depends_on--> PRS-0001
* PRS-0012 --depended_on_by--> PRS-0013
* PRS-0013 --depends_on--> PRS-0012
* PRS-0013 --extended_by--> PRS-0014
* PRS-0014 --extends--> PRS-0013
