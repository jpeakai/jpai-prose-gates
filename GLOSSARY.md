# Glossary

The ubiquitous language for `jpai-prose-gates`.
One canonical name per concept, used in code, in documents and in conversation.

Agents and contributors: use these terms rather than synonyms.
When a new domain term enters the code or the conversation, add it here in the same change.

| Term | Meaning |
|---|---|
| Prose gate | One deterministic markdown rule, identified by a rule id. Also called a rule in code. |
| Category | The group a prose gate belongs to: sentence, list or punctuation, or a one-word category a plugin declares. |
| Plugin | A module that adds rules to a run, with a name, a namespace, a contract version and optional categories. |
| Namespace | The word before the slash in a plugin rule id, such as acme in acme/sentence-no-passive-voice. A core id has none. |
| Local rule | A plugin rule that is one file in `.prose-gates/rules`, under the reserved namespace local. |
| Config file | The optional `prose-gates.config.json` or `.mjs` that switches rules off and sets their options. |
| Project root | The nearest ancestor of the working directory with a package.json, a config file or a `.prose-gates` directory. |
| Registry | The rules a run uses: the built-ins plus loaded plugins, with the config applied. |
| Plugin mode | How a plugin that fails to load is treated: off, strict, lenient or collect. Strict stops the run and is the default. |
| Lenient loading | A plugin mode that leaves a failed plugin out, names it on stderr with its code, and runs the rest. |
| Validation run | A run of --validate-plugins, which loads every plugin, reports every failure, and runs no check or fix. |
| Error code | The stable kebab-case name of a failure, such as unknown-rule or plugin-contract, shown as error[code] and carried on the error class. |
| Loaded line | The one stderr line a run prints naming each plugin namespace it loaded and how many rules it brought. |
| Frontmatter view | The top-level string keys of a leading YAML block, with a line and source offsets, read by plugin rules only. |
| Rule id | The name of a prose gate, written category-short-name, such as sentence-one-per-line. The category is one lower-case word and the short name is three or four words. |
| Finding | One reported violation of a prose gate, with a file, a line, a rule id and a message. |
| Fixer | The optional fix function of a rule. It proposes edits and never writes files itself. |
| Edit | A proposed change: a start offset, an end offset, replacement text and an expectation. |
| Expectation | What an edit claims about the reparsed tree: same-tree, same-shape or replace-paragraph. |
| Stable text | The text a fix run ends at. No fixer, asked again after the last accepted edit, has a verifiable edit left, so fixing it again changes nothing. |
| Refusal | A fixer or the verifier declining an edit. The source is untouched and the finding stays. |
| Fixpoint | The engine's loop of applying verified edits in a fixed rule order until nothing changes. |
| Fingerprint | Every word, url, alt text and code value of a document in order. A fix must preserve it. |
| Potential clause | A span of a sentence bounded by a clause marker. sentence-word-budget-exceeded counts them to suggest how many sentences a split needs. |
| Promotion | Turning an inline hidden list into a lead-in and a real markdown list. |
| Lead-in | The text before a promoted list, ending in a colon. |
| Interpunct run | Items joined by the middle dot glyph inside one paragraph. |
| Stacked run | Interpunct runs on consecutive lines, each with a label. Promoted to a nested list. |
| Adversarial test | A hostile input written to break a fixer, asserting a refusal or an exact safe output. |
| Record | One decision, authored as YAML in `adrs/`. Its markdown is generated and never edited. |
| Bundle | The `adrs/` directory as a whole, including the records and everything generated from them. |
| Dialect | This repo's declared documentation conventions, in `docs/CONVENTIONS.md`. |
| Release | One version published to npm by the Publish workflow, with a matching tag and GitHub release. |
| Pull request | The only way a change lands on main. It merges once both CI checks pass. |
| Branch protection | The GitHub rule on main that requires a pull request and passing CI, for admins too. |
| npm environment | The GitHub environment the publish job runs in. It admits only main. |
| Trusted publishing | npm accepting an upload from a named GitHub workflow in place of a stored token. |
