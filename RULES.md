# The rules

Every prose gate, grouped by what it guards, with a failing example and what `--fix` does to it.
Each example is real output: `tests/rules-doc.test.ts` runs every block below through the fixer and fails when this page drifts from the code.

A block labelled before is followed by its after, which is exactly what `--fix` writes.
A block labelled reported is a case the fixer leaves alone, so the finding stays for a human.
Rules marked with a star in `--help` have a fixer.

A rule is on, and its findings fail the run, or it is off.
There are no warnings, because a finding that does not fail the run is a finding nobody reads.
The config sets `"error"` or `"off"` for each rule.
A rule that starts off says so in its section, and the config turns it on.

## Categories

| Category | Rules | What it guards |
|---|---|---|
| Sentence | sentence-one-per-line, sentence-word-budget-exceeded, sentence-repeated-opening-run, sentence-short-fragment-run | How a sentence is laid out, how long it runs, and how a run of them repeats |
| List | list-semicolon-delimited-run, list-interpunct-joined-run, list-inline-enumeration-markers, list-comma-labelled-run, list-stacked-interpunct-runs | A list hidden in running prose, promoted to a real markdown list |
| Punctuation | punctuation-em-dash-in-prose, punctuation-interpunct-in-prose, punctuation-spaced-dash-in-prose, punctuation-curly-quote-in-prose | A glyph that reads as generated text |
| Residue | residue-tool-markup-artifact, residue-chatbot-wrapper-phrase, residue-unfilled-placeholder-text | Text left over from a chat or a draft |
| Phrase | phrase-ai-overused-word, phrase-staged-run-up, phrase-stock-closer-line, phrase-inflated-significance-claim, phrase-sales-language-claim, phrase-negative-contrast-pair, phrase-arguing-with-no-one, phrase-vague-connection-link, phrase-borrowed-authority-claim, phrase-sayings-sound-deep, phrase-document-self-reference, phrase-avoided-copula-verb, phrase-shallow-participle-rider, phrase-stacked-hedge-run | Stock phrasing that signals importance or authority instead of stating a fact |
| Structure | structure-emoji-in-heading, structure-thematic-break-density, structure-title-case-heading, structure-heading-restating-sentence, structure-bold-label-list-item | Headings, rules and lists that decorate a document |

The list rules run before the punctuation rules, because a promotion needs the separators a glyph swap would erase.

## Sentence

### sentence-one-per-line

A sentence wrapped across lines, where one sentence per line is wanted.
One sentence per line keeps diffs to the sentence that changed.
The fix reflows the paragraph so each line holds one whole sentence.

```text before
The parser reads the file
and hands the tree to every rule. Each rule
reports what it finds.
```

```text after
The parser reads the file and hands the tree to every rule.
Each rule reports what it finds.
```

### sentence-word-budget-exceeded

A sentence longer than the word budget, which defaults to 25 words.
It has no fixer, because shortening a sentence changes what it says.

```text reported
The fixer reads the tree and proposes an edit because the rule fired, which the engine verifies when it reparses the document and compares the words it finds.
```

The finding counts potential clauses and suggests how many sentences to split into:

```text
sentence-word-budget-exceeded sentence has 28 words (budget 25) and 4 potential clauses; split it into about 4 shorter sentences, one idea each, rather than compressing the wording
```

The clause count is a guide, not a parse, so a human or agent decides the real split.
Split at the clauses and keep the connective words, rather than deleting words until the sentence fits:

```text
The fixer reads the tree and proposes an edit.
The edit exists because the rule fired.
The engine verifies it by reparsing the document.
It then compares the words it finds.
```

### sentence-repeated-opening-run

Three or more sentences in a row that begin with the same word.
A person repeats an opening on purpose for rhythm, so the rule starts off.
It skips `the`, `a` and `an`, and it ignores a sentence that opens with inline code.
The option `minRun` changes the length of a run, which defaults to 3.

```text reported
She noted the door.
She noted the lock.
She filed both away.
```

### sentence-short-fragment-run

A row of very short sentences, where each asks the reader to pause on a weight it has not earned.
A sentence of four words or fewer counts as a fragment.
This rule starts off, and the option `minRun` changes the length of a run, which defaults to 3.

```text reported
It had no taste.
No prior.
No nostalgia.
No fear.
```

## List

### list-semicolon-delimited-run

A semicolon-delimited list, meaning two or more semicolons in one sentence.
A single joining semicolon is allowed.
When the sentence has a colon lead-in, the fix promotes the items to a bullet list.

```text before
A release needs: a signed tag; a changelog entry; and a green build.
```

```text after
A release needs:

- a signed tag
- a changelog entry
- a green build
```

Without a colon there is no lead-in to keep, so the fixer refuses.

```text reported
A release needs a signed tag; a changelog entry; a green build.
```

### list-interpunct-joined-run

Items joined by interpuncts inside one paragraph.
The fix promotes them to a bullet list after the label.

```text before
Stack: Bun · TypeScript · biome.
```

```text after
Stack:

- Bun
- TypeScript
- biome
```

### list-inline-enumeration-markers

Enumeration markers such as `(a)` and `(b)`, or `(1)` and `(2)`, inlined in prose.
The fix promotes them to a numbered list.

```text before
The engine (a) parses the file, (b) runs each fixer and (c) verifies the result.
```

```text after
The engine:

1. parses the file
2. runs each fixer
3. verifies the result
```

Markers used as back-references are not a list, so the fixer refuses.

```text reported
See (a) above and (b) below.
```

### list-comma-labelled-run

A run of three or more comma-joined items that each start with a label.
The fix promotes them to a bullet list and keeps each label.

```text before
Targets: `fix` regenerates the bundle, `ci` asserts a clean tree, and `docs-ci` gates the prose.
```

```text after
Targets:

- `fix` regenerates the bundle
- `ci` asserts a clean tree
- `docs-ci` gates the prose
```

### list-stacked-interpunct-runs

Interpunct runs stacked on consecutive lines, each with its own label.
The fix promotes them to a nested list, one parent item per label.

```text before
Runtime: Bun · Node
Tooling: biome · tsc
```

```text after
- Runtime
  - Bun
  - Node
- Tooling
  - biome
  - tsc
```

A line without a label has no parent item to hang under, so the fixer refuses.

```text reported
Runtime: Bun · Node
no label · here
```

## Punctuation

### punctuation-em-dash-in-prose

An em-dash used as a connector in prose.
A pair of em-dashes becomes parentheses, and a lone one becomes a colon.

```text before
The engine — not the fixer — decides what is kept.
```

```text after
The engine (not the fixer) decides what is kept.
```

```text before
One rule matters — never guess.
```

```text after
One rule matters: never guess.
```

An em-dash between numbers is a range that wants an en-dash rather than a colon, so the fixer refuses.

```text reported
Pages 10 — 12 cover it.
```

### punctuation-interpunct-in-prose

A stray interpunct in prose, outside a run of items.
A spaced interpunct becomes a comma.

```text before
Written in TypeScript · run on Bun.
```

```text after
Written in TypeScript, run on Bun.
```

### punctuation-spaced-dash-in-prose

A spaced en dash or a spaced double hyphen used as a dash.
A range such as `3–5` and a flag such as `--fix` have no space on both sides, so they never match.
The em-dash has its own rule above, with a fixer.
This rule starts off and has no fixer, because the right replacement depends on the sentence.

```text reported
The policy – announced without warning – affects workers.
```

### punctuation-curly-quote-in-prose

A curly double quote where a straight one is expected.
Most editors curl quotes on their own, so this is weak evidence, and the rule starts off.
An apostrophe is not reported.

```text reported
He said “the project is on track” today.
```

## Residue

Text left over from a chat or a draft.
These rules read prose, link and image addresses, and raw html.
Code and quoted text are exempt, because a document about these forms shows them.
None has a fixer, because deleting the text changes the words, and the author decides what the text stood for.

### residue-tool-markup-artifact

Markup that a chat tool leaves behind when its output is pasted as text.
Examples are a citation object, a tracking parameter on a link, and a wrapper tag.
Each form is a string no person types, so the rule fails the run by default.
The forms follow the vendor sections of Wikipedia's field guide to AI writing.

```text reported
Sial are a Rajput clan :contentReference[oaicite:20]{index=20}.
Maloo founded the agency in 2010 [cite: 17].
```

### residue-chatbot-wrapper-phrase

A greeting, praise, offer or sign-off that a chat reply wraps around its content.
Notes about where a model's knowledge ends are included.
This rule fails the run by default.
The message says to delete the wrapper sentence and keep the content it introduced.

```text reported
Great question!
The French Revolution began in 1789.
I hope this helps!
```

### residue-unfilled-placeholder-text

A fill-in-the-blank that was never filled in, such as a bracketed name or a filler text.
A template document holds placeholders on purpose, so the rule starts off.
An angle-bracket form such as `<short-topic>` is not reported.

```text reported
Best regards,

[Your Name]
```

## Phrase

Stock phrasing that signals importance or authority instead of stating a fact.
Each rule reads a short list kept as data in `src/lexicons/`, with a review date and its sources.
None has a fixer, because a phrase that signals more than it states cannot be mended without choosing new words.
Each message ends with what to do, and the JSON adds the evidence, the instruction and what a rewrite must preserve.

### phrase-ai-overused-word

A word from a short list of words that models use far more often than people do.
Only forms with no ordinary use are listed, because a word such as `key` or `gate` is plain technical prose.
This rule fails the run by default.

```text reported
We delve into the intricacies of the archive.
```

### phrase-staged-run-up

An opener that announces the point or stages a moment of candour instead of making the point.
This rule fails the run by default.

```text reported
Let's dive into how caching works.
Here's what you need to know.
```

### phrase-stock-closer-line

A one-sentence paragraph that tells the reader how to feel about the paragraph before it.
Only the whole sentence matches, so a longer sentence that contains the words is left alone.
This rule fails the run by default.

```text reported
Caching cuts repeat work.

That is the real win.
```

### phrase-inflated-significance-claim

An ordinary fact dressed as a turning point, a legacy or a bright future.
The message says to keep the fact and drop the claim that it matters.
This rule fails the run by default.

```text reported
The institute opened in 1989, marking a pivotal moment in regional statistics.
```

### phrase-sales-language-claim

Language that reads as an advertisement, usually about a place or an organisation.
A product README may use some of it on purpose, and a project that does turns the rule off.

```text reported
Nestled within the breathtaking region of Gonder, the town is small.
```

### phrase-negative-contrast-pair

A `not X but Y` contrast, where the negative half names something nobody claimed.
It reads inside one paragraph, so a contrast split across two sentences is found too.
A contrast that corrects a belief the reader holds is fine, which is why the rule starts off.

```text reported
It's not just a feature; it's a shift.
```

### phrase-arguing-with-no-one

A reply to an objection nobody raised, or the rejection of an option nobody offered.
It is usually a leftover from an earlier draft.
This rule starts off, and the config turns it on with `"error"`.

```text reported
To be clear, I'm not saying the docs do not matter.
```

### phrase-vague-connection-link

Two things said to be connected without saying how.
Technical writing uses these words honestly all the time, so the rule starts off.

```text reported
He is associated with the Rajhans Orchestra.
```

### phrase-borrowed-authority-claim

An unnamed authority standing in for what was said.
A missing citation is not reported, because most writing is unsourced.
This rule fails the run by default.

```text reported
Experts argue the river sustains the whole valley.
```

### phrase-sayings-sound-deep

An ordinary point dressed as a hidden truth.
These phrases have honest uses, so the rule starts off.

```text reported
At its core, what really matters is readiness.
```

### phrase-document-self-reference

A sentence about the document's own sourcing, assembly or layout instead of its subject.
Documents explain their own layout often and honestly, so the rule starts off.

```text reported
The table below compares the vendors.
```

### phrase-avoided-copula-verb

A longer verb phrase where `is`, `are` or `has` would do.
`Serves as` has honest uses in technical writing, so the rule starts off.

```text reported
Gallery 825 serves as the exhibition space and boasts four rooms.
```

### phrase-shallow-participle-rider

A participle phrase bolted onto a plain fact to make it sound deeper.
It matches a comma followed by one of a short list of participles.
This rule starts off, and the config turns it on with `"error"`.

```text reported
The temple is painted blue, symbolizing the bluebonnets of Texas.
```

### phrase-stacked-hedge-run

Several hedging words packed into one stretch of a sentence.
One hedge is ordinary, so only three within eight words are reported.
The option `min` changes that count, and the rule starts off.

```text reported
It could potentially possibly be argued that the policy might help.
```

## Structure

Headings, rules and lists that decorate a document instead of organising it.
These rules read the markdown tree, and a quotation or code is exempt.
None has a fixer.

### structure-emoji-in-heading

An emoji or a decorative arrow in a heading.
A heading names what its section holds, and a pictograph in front of it decorates every section alike.
Trade mark and copyright signs are not reported, and neither is code.
This rule starts off, and the config turns it on with `"error"`.

```text reported
## 🚀 Launch phase

The product launches in the third quarter.
```

### structure-thematic-break-density

A horizontal rule directly before several headings.
A heading already divides sections, so a rule before each one is decoration.
It reports once, on the first, when at least three sit before a heading.
The option `min` changes that count, and the rule starts off.

```text reported
Intro.

---

## One

Text.

---

## Two

Text.

---

## Three

Text.
```

### structure-title-case-heading

A heading that capitalises every main word.
The signal is a small word such as `And` or `Of` written with a capital, with at least two main words also capitalised.
A heading made of proper names can still match, so the rule starts off.

```text reported
## Strategic Negotiations And Global Partnerships
```

### structure-heading-restating-sentence

A heading followed by a short sentence whose every content word is already in the heading.
The test has no judgement in it, so a sentence that adds one word passes.
This rule starts off, and the config turns it on with `"error"`.

```text reported
## Configuration options

Configuration options.
```

### structure-bold-label-list-item

A list of at least three items in which every item opens with a bold label and a colon.
The bold is on every item alike, so it carries no information.
Many documents choose this style on purpose, this repo's own among them, so the rule starts off.

```text reported
- **User experience:** A new interface.
- **Performance:** Faster algorithms.
- **Security:** End-to-end encryption.
```

## Exemptions

Code is exempt, both inline and in fences.
Fences tagged `markdown` or `md` are the exception, since they hold templates whose body is audited recursively and never fixed.
YAML and TOML frontmatter is metadata, so no rule reads it.
