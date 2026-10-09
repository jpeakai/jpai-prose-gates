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
| [PRS-0015](0015-a-rule-reads-one-shared-context.md) | A check and a fix both read one context built once per document | accepted |
| [PRS-0016](0016-modules-group-by-what-a-function-takes.md) | A module groups functions by what they take, not by who calls them | accepted |
| [PRS-0017](0017-rule-ids-are-category-and-short-name.md) | A rule id is its category followed by a short name | accepted |
| [PRS-0018](0018-config-file-and-rule-control.md) | An optional config file switches rules off and sets their options | accepted |
| [PRS-0019](0019-plugin-contract-and-namespace.md) | A plugin rule is a built-in rule with a namespace, and the plugin names it | accepted |
| [PRS-0020](0020-plugin-fixers-stay-under-verification.md) | A plugin fixer is held to the same proof as a built-in one | accepted |
| [PRS-0021](0021-plugins-declare-their-categories.md) | A plugin adds a category by declaring it | accepted |
| [PRS-0022](0022-plugins-load-automatically.md) | Plugins and local rules load on their own from declared sources | accepted |
| [PRS-0023](0023-frontmatter-is-a-read-only-view.md) | Frontmatter is a read-only view that built-in rules never see | accepted |
| [PRS-0024](0024-failures-are-named-errors-with-codes.md) | Every deliberate failure is a named error class with a stable code | accepted |
| [PRS-0025](0025-plugin-loading-strictness.md) | Strict loading is the default, lenient and validated loading are opt-in and loud | accepted |
| [PRS-0026](0026-typescript-local-rules-need-a-runtime-that-imports-them.md) | A local rule may be TypeScript where the runtime can import it | accepted |
| [PRS-0027](0027-rules-may-be-async.md) | Rules may be async, checks run concurrently, and fixers run in priority order | accepted |
| [PRS-0028](0028-frontmatter-edits-are-verified-by-data-equality.md) | A frontmatter edit is verified by comparing the YAML data before and after | accepted |
| [PRS-0029](0029-the-docs-site-is-assembled-from-the-real-documents.md) | The docs site is assembled from the real documents and deploys only from main | accepted |
# By group

## architecture

* [PRS-0008](0008-one-file-per-rule.md) - A rule module exports its id, summary, check and optional fix, and a registry lists them in order
* [PRS-0015](0015-a-rule-reads-one-shared-context.md) - Both halves of a rule read one RuleContext, so a check and its fix can never disagree about the document
* [PRS-0016](0016-modules-group-by-what-a-function-takes.md) - Shared code sits in the layer whose data it reads, and the layers import strictly downwards
## config

* [PRS-0018](0018-config-file-and-rule-control.md) - A config is checked against the loaded rules, and a rule that is off loses both its halves
## documentation

* [PRS-0029](0029-the-docs-site-is-assembled-from-the-real-documents.md) - MkDocs Material builds from a copy of the repo's own layout, so the prose gates keep reading the real files
## engine

* [PRS-0027](0027-rules-may-be-async.md) - The engines are async, checks overlap, fixers are awaited one at a time, and the order stays a hand-kept list
## errors

* [PRS-0024](0024-failures-are-named-errors-with-codes.md) - Usage errors exit 2 and plugin errors exit 1, each class carrying a code and the fields to act on
## fixing

* [PRS-0003](0003-splice-source-never-restringify.md) - An edit replaces a byte range with text built from source slices, so untouched bytes stay identical
* [PRS-0004](0004-a-fixer-refuses-when-unsure.md) - An unfixable case leaves the source untouched and the finding reported, never a best guess
* [PRS-0005](0005-every-fix-is-verified.md) - A lost word throws, and an unexpected tree shape refuses the edit before it is applied
## frontmatter

* [PRS-0028](0028-frontmatter-edits-are-verified-by-data-equality.md) - A fixer may rewrite frontmatter if the YAML data is unchanged, and the view walks the whole document
## gates

* [PRS-0002](0002-generated-markdown-is-gated.md) - Rendered output passes the same gates, and a finding there is fixed in its source or template
## model

* [PRS-0023](0023-frontmatter-is-a-read-only-view.md) - DocModel.frontmatter lists the top-level string keys of a YAML block, and built-in rules stay exempt
## packaging

* [PRS-0012](0012-node-runs-a-published-bundle.md) - The npm package ships Node bundles of the CLI and library that are built when it is packed, and git never tracks them
* [PRS-0013](0013-releases-publish-from-github-actions.md) - The Publish workflow releases @jpeakai/prose-gates to npm with provenance and no stored token
## parsing

* [PRS-0001](0001-parse-once-to-mdast.md) - Rules query a shared syntax tree instead of scanning raw lines with their own regexes
## plugins

* [PRS-0019](0019-plugin-contract-and-namespace.md) - A plugin is { meta, rules }, its rules see the built-in context, and its ids carry a namespace
* [PRS-0020](0020-plugin-fixers-stay-under-verification.md) - Plugin fixers are allowed, every edit is verified, and a malformed edit is refused before it is spliced
* [PRS-0021](0021-plugins-declare-their-categories.md) - A new one-word category is declared in meta.categories, and a word is declared once
* [PRS-0022](0022-plugins-load-automatically.md) - Local rule files and declared plugin dependencies load with no config, and every run says so
* [PRS-0025](0025-plugin-loading-strictness.md) - A lenient run skips a failed plugin and names it, and a validation run reports every failure and runs no engine
* [PRS-0026](0026-typescript-local-rules-need-a-runtime-that-imports-them.md) - .ts and .mts rules are imported as they are, and a runtime that cannot says how to fix it
## release

* [PRS-0014](0014-main-changes-only-through-pull-requests.md) - Main is protected so every change lands by a pull request that passes CI, and only main can publish
## rules

* [PRS-0006](0006-sentence-length-is-never-autofixed.md) - PG002 has no fixer, because shortening a sentence is a decision about what it means
* [PRS-0007](0007-em-dash-becomes-parentheses-or-colon.md) - PG004 rewrites only the two dash patterns whose replacement punctuation is unambiguous
* [PRS-0010](0010-length-findings-guide-a-split.md) - PG002 reports potential clauses and a target sentence count, steering a rewrite away from compression
* [PRS-0011](0011-rules-carry-a-category.md) - Rules are tagged sentence, list or punctuation, and their documented examples run through the real fixer
* [PRS-0017](0017-rule-ids-are-category-and-short-name.md) - Rules are named category-short-name, such as sentence-one-per-line, instead of by a number
## testing

* [PRS-0009](0009-adversarial-and-property-tests-gate-fixes.md) - Fix behaviour is proven by exact fixtures, hostile inputs and generated documents, all without mocks
# Relationship graph

Open [graph.html](graph.html) to explore the records visually: click a node to read it, and links between records navigate the graph.
The same edge set is rendered as prose in [graph.md](graph.md), and as data in [graph.json](graph.json).

* PRS-0001 --depended_on_by--> PRS-0012
* PRS-0001 --depended_on_by--> PRS-0003
* PRS-0001 --depended_on_by--> PRS-0015
* PRS-0001 --depended_on_by--> PRS-0023
* PRS-0003 --depends_on--> PRS-0001
* PRS-0003 --depended_on_by--> PRS-0005
* PRS-0004 --extended_by--> PRS-0005
* PRS-0004 --depended_on_by--> PRS-0007
* PRS-0004 --tested_by--> PRS-0009
* PRS-0005 --depends_on--> PRS-0003
* PRS-0005 --extends--> PRS-0004
* PRS-0005 --depended_on_by--> PRS-0006
* PRS-0005 --tested_by--> PRS-0009
* PRS-0005 --depended_on_by--> PRS-0020
* PRS-0005 --depended_on_by--> PRS-0028
* PRS-0006 --depends_on--> PRS-0005
* PRS-0006 --extended_by--> PRS-0010
* PRS-0007 --depends_on--> PRS-0004
* PRS-0008 --extended_by--> PRS-0011
* PRS-0008 --depended_on_by--> PRS-0015
* PRS-0008 --depended_on_by--> PRS-0016
* PRS-0008 --extended_by--> PRS-0017
* PRS-0008 --depended_on_by--> PRS-0019
* PRS-0009 --tests--> PRS-0004
* PRS-0009 --tests--> PRS-0005
* PRS-0010 --extends--> PRS-0006
* PRS-0011 --extends--> PRS-0008
* PRS-0011 --extended_by--> PRS-0017
* PRS-0011 --extended_by--> PRS-0021
* PRS-0012 --depends_on--> PRS-0001
* PRS-0012 --depended_on_by--> PRS-0013
* PRS-0012 --depended_on_by--> PRS-0022
* PRS-0012 --depended_on_by--> PRS-0026
* PRS-0013 --depends_on--> PRS-0012
* PRS-0013 --extended_by--> PRS-0014
* PRS-0014 --extends--> PRS-0013
* PRS-0015 --depends_on--> PRS-0008
* PRS-0015 --depends_on--> PRS-0001
* PRS-0015 --depended_on_by--> PRS-0016
* PRS-0015 --depended_on_by--> PRS-0018
* PRS-0016 --depends_on--> PRS-0015
* PRS-0016 --depends_on--> PRS-0008
* PRS-0017 --extends--> PRS-0008
* PRS-0017 --extends--> PRS-0011
* PRS-0017 --depended_on_by--> PRS-0018
* PRS-0017 --depended_on_by--> PRS-0019
* PRS-0018 --depends_on--> PRS-0015
* PRS-0018 --depends_on--> PRS-0017
* PRS-0018 --depended_on_by--> PRS-0019
* PRS-0018 --depended_on_by--> PRS-0022
* PRS-0018 --depended_on_by--> PRS-0024
* PRS-0019 --depends_on--> PRS-0018
* PRS-0019 --depends_on--> PRS-0008
* PRS-0019 --depends_on--> PRS-0017
* PRS-0019 --depended_on_by--> PRS-0020
* PRS-0019 --depended_on_by--> PRS-0021
* PRS-0019 --depended_on_by--> PRS-0022
* PRS-0019 --depended_on_by--> PRS-0023
* PRS-0019 --depended_on_by--> PRS-0027
* PRS-0020 --depends_on--> PRS-0019
* PRS-0020 --depends_on--> PRS-0005
* PRS-0020 --depended_on_by--> PRS-0027
* PRS-0021 --depends_on--> PRS-0019
* PRS-0021 --extends--> PRS-0011
* PRS-0021 --depended_on_by--> PRS-0022
* PRS-0022 --depends_on--> PRS-0019
* PRS-0022 --depends_on--> PRS-0021
* PRS-0022 --depends_on--> PRS-0018
* PRS-0022 --depends_on--> PRS-0012
* PRS-0022 --extended_by--> PRS-0025
* PRS-0022 --depended_on_by--> PRS-0026
* PRS-0023 --depends_on--> PRS-0019
* PRS-0023 --depends_on--> PRS-0001
* PRS-0023 --extended_by--> PRS-0028
* PRS-0024 --depends_on--> PRS-0018
* PRS-0024 --depended_on_by--> PRS-0025
* PRS-0025 --extends--> PRS-0022
* PRS-0025 --depends_on--> PRS-0024
* PRS-0026 --depends_on--> PRS-0022
* PRS-0026 --depends_on--> PRS-0012
* PRS-0027 --depends_on--> PRS-0019
* PRS-0027 --depends_on--> PRS-0020
* PRS-0028 --extends--> PRS-0023
* PRS-0028 --depends_on--> PRS-0005
