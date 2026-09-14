# Glossary

The ubiquitous language for `jpai-prose-gates`.
One canonical name per concept, used in code, in documents and in conversation.

Agents and contributors: use these terms rather than synonyms.
When a new domain term enters the code or the conversation, add it here in the same change.

| Term | Meaning |
|---|---|
| Prose gate | One deterministic markdown rule, identified as PG001 to PG009. Also called a rule in code. |
| Category | The group a prose gate belongs to: sentence, list or punctuation. |
| Finding | One reported violation of a prose gate, with a file, a line, a rule id and a message. |
| Fixer | The optional fix function of a rule. It proposes edits and never writes files itself. |
| Edit | A proposed change: a start offset, an end offset, replacement text and an expectation. |
| Expectation | What an edit claims about the reparsed tree: same-tree, same-shape or replace-paragraph. |
| Refusal | A fixer or the verifier declining an edit. The source is untouched and the finding stays. |
| Fixpoint | The engine's loop of applying verified edits in a fixed rule order until nothing changes. |
| Fingerprint | Every word, url, alt text and code value of a document in order. A fix must preserve it. |
| Potential clause | A span of a sentence bounded by a clause marker. PG002 counts them to suggest how many sentences a split needs. |
| Promotion | Turning an inline hidden list into a lead-in and a real markdown list. |
| Lead-in | The text before a promoted list, ending in a colon. |
| Interpunct run | Items joined by the middle dot glyph inside one paragraph. |
| Stacked run | Interpunct runs on consecutive lines, each with a label. Promoted to a nested list. |
| Adversarial test | A hostile input written to break a fixer, asserting a refusal or an exact safe output. |
| Record | One decision, authored as YAML in `adrs/`. Its markdown is generated and never edited. |
| Bundle | The `adrs/` directory as a whole, including the records and everything generated from them. |
| Dialect | This repo's declared documentation conventions, in `docs/CONVENTIONS.md`. |
