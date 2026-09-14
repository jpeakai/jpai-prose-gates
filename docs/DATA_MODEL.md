# Data Model

How a markdown file becomes findings and fixes, and what every prose gate reads to do its work.

Read this before writing a new rule or changing a fixer.
It is the map behind `src/model.ts`, `src/rules/types.ts` and `src/fix/`.

`RULES.md` shows what each gate catches.
This document shows the shapes the gates are built from.

## Contents

- [The two models](#the-two-models)
- [Document model](#document-model)
- [Rule model](#rule-model)
- [Check pipeline](#check-pipeline)
- [Fix pipeline](#fix-pipeline)
- [Verification](#verification)
- [Fix order](#fix-order)
- [Extending the model](#extending-the-model)

## The two models

There are exactly two data models in this package.

The **document model** is built once per file and is read only.
It flattens the mdast tree into the views a rule needs, so no rule walks the tree itself.

The **rule model** is the contract a prose gate implements.
A rule turns the document model into findings, and optionally into edits the engine may apply.

Code spans, code blocks, tables and frontmatter are exempt by construction, never by pattern matching.
A fence tagged `markdown` or `md` is the one exception, since it holds a template whose body is audited recursively.

## Document model

`buildDocModel` parses the source once, then walks the tree once, filling three views.

```mermaid
erDiagram
    DOC_MODEL ||--|| MDAST_ROOT : "parsed once into"
    DOC_MODEL ||--o{ PARAGRAPH_VIEW : "paragraphs"
    DOC_MODEL ||--o{ TEXT_VIEW : "texts"
    DOC_MODEL ||--o{ FENCE_VIEW : "fences"
    PARAGRAPH_VIEW ||--o{ DIRECT_TEXT : "directTexts"
    PARAGRAPH_VIEW ||--o{ CODE_RANGE : "codeRanges"
    FENCE_VIEW ||--|| DOC_MODEL : "audited as a nested"

    DOC_MODEL {
        string src "exact file source"
        Root tree "mdast, frontmatter and gfm enabled"
    }
    MDAST_ROOT {
        string type "root"
        Node children "positions carry source offsets"
    }
    PARAGRAPH_VIEW {
        string raw "exact source slice"
        string prose "text joined, inline code becomes CODE"
        number startOffset "absolute, for splicing"
        number endOffset "absolute, for splicing"
        number startColumn "indent of a nested paragraph"
        boolean hasBreak "a hard break is authored structure"
        boolean inTable "check rules skip table cells"
        boolean inBlockquote "fixers skip quoted prose"
        boolean inListItem "promotion is restricted here"
    }
    DIRECT_TEXT {
        string value "parsed text, entities resolved"
        number start "absolute source offset"
        number end "absolute source offset"
    }
    CODE_RANGE {
        number start "inline code span opens"
        number end "inline code span closes"
    }
    TEXT_VIEW {
        string value "every prose text node"
        number line "for the finding"
        Node block "nearest paragraph, heading or cell"
    }
    FENCE_VIEW {
        string value "fence body, markdown or md only"
        number line "opening fence, for line offsetting"
    }

    classDef source   fill:#2563eb,stroke:#bfdbfe,color:#ffffff
    classDef derived  fill:#7c3aed,stroke:#ddd6fe,color:#ffffff
    classDef span     fill:#334155,stroke:#cbd5e1,color:#ffffff

    class DOC_MODEL,MDAST_ROOT source
    class PARAGRAPH_VIEW,TEXT_VIEW,FENCE_VIEW derived
    class DIRECT_TEXT,CODE_RANGE span
```

*The document model, built once per file.* | 7 entities, VCS 10.5

Three distinctions carry most of the weight.

`raw` versus `prose`.
`raw` is the exact source slice a fixer splices over.
`prose` is what a check reads, with soft wraps collapsed and each inline code span replaced by the single token `CODE`.

`texts` versus `directTexts`.
`texts` holds every prose text node in the document, including headings and list items.
`directTexts` holds only the text nodes that are immediate children of their paragraph.
Text inside a link, emphasis or code span is cargo, so a fixer may move it whole but never split inside it.

Offsets versus values.
Every offset is absolute into `src`, and is only valid for the source it was computed from.
`matchesIn` refuses whenever a source slice and its parsed value disagree, which is how an entity or an escape stops a fixer.

## Rule model

A rule is data plus two functions.
The catalogue in `src/rules/index.ts` is the only registry.

```mermaid
erDiagram
    RULE ||--o{ FINDING : "check emits"
    RULE ||--o{ EDIT : "fix proposes"
    RULE_CONTEXT ||--|{ RULE : "both halves read"
    RULE_CONTEXT ||--o{ INTERPUNCT_RUN : "runs"
    RULE_CONTEXT ||--|| CHECK_CONTEXT : "a check adds"
    EDIT ||--|| EXPECTATION : "declares"
    PROMOTION ||--|{ PROMOTED_ITEM : "items"
    PROMOTION ||--o| EDIT : "promote returns"

    RULE {
        RuleId id "PG001 to PG009"
        Category category "sentence, list or punctuation"
        string summary "one line, shown in help"
        function check "required"
        function fix "absent for PG002"
    }
    RULE_CONTEXT {
        DocModel doc "the document model"
        InterpunctRun runs "computed once, shared"
    }
    CHECK_CONTEXT {
        string file "reported path"
        number maxWords "PG002 budget, default 25"
    }
    INTERPUNCT_RUN {
        Range range "paragraph bounds"
        number separators "middle dots in the prose"
        number lines "source lines carrying one"
    }
    FINDING {
        string file "path as given"
        number line "1 based"
        RuleId rule "which gate fired"
        string message "what to do about it"
    }
    EDIT {
        RuleId rule "who proposed it"
        number start "absolute source offset"
        number end "absolute source offset"
        string text "replacement"
        Expectation expect "proof obligation"
    }
    EXPECTATION {
        string kind "same-tree, same-shape or replace-paragraph"
        ParagraphView view "replace-paragraph only"
        string fragment "replace-paragraph only"
        number listItems "replace-paragraph only"
    }
    PROMOTION {
        RuleId rule "which list gate"
        Range span "sentences the list replaces"
        string leadIn "text ending in a colon, or null"
        boolean ordered "numbered or bulleted"
    }
    PROMOTED_ITEM {
        string text "one bullet, sliced from source"
        string children "nested bullets, PG009 only"
    }

    classDef contract fill:#047857,stroke:#a7f3d0,color:#ffffff
    classDef output   fill:#fef3c7,stroke:#b45309,color:#1e293b
    classDef shared   fill:#334155,stroke:#cbd5e1,color:#ffffff

    class RULE,PROMOTION,PROMOTED_ITEM contract
    class FINDING,EDIT,EXPECTATION output
    class RULE_CONTEXT,CHECK_CONTEXT,INTERPUNCT_RUN shared
```

*The rule contract and what it produces.* | 9 entities, VCS 12.5

`ruleContext` builds the shared half once per document, and both halves of every rule read it.
A check adds the file it reports against and the sentence budget; a fix needs nothing more, so `FixContext` is `RuleContext`.
An interpunct run is the one piece of derived data shared between rules.
It is what lets PG005 stay quiet inside a run that PG006 or PG009 already reports.

## Check pipeline

Checking never mutates anything.

```mermaid
flowchart LR
    SRC["Markdown source"]:::source
    MODEL["buildDocModel<br/>one parse, one walk"]:::build
    RUNS["interpunctRuns<br/>shared derived data"]:::build
    GATES["9 prose gates<br/>each reads CheckContext"]:::gate
    NESTED["markdown fences<br/>audited recursively"]:::gate
    OUT["Findings<br/>sorted by line then rule"]:::out

    SRC --> MODEL --> RUNS --> GATES --> OUT
    MODEL --> NESTED
    NESTED -- "line offset added" --> OUT

    classDef source fill:#2563eb,stroke:#bfdbfe,color:#ffffff
    classDef build  fill:#7c3aed,stroke:#ddd6fe,color:#ffffff
    classDef gate   fill:#047857,stroke:#a7f3d0,color:#ffffff
    classDef out    fill:#fef3c7,stroke:#b45309,color:#1e293b
```

*Check path.* | 6 nodes, VCS 9.0

<details>
<summary>Complete check pipeline, with the shared data each gate reads (17 nodes)</summary>

```mermaid
flowchart TB
    SRC["Markdown source"]:::source

    subgraph build["Document model"]
        PARSE["parse<br/>mdast, frontmatter, gfm"]:::build
        WALK["visitParents<br/>single walk"]:::build
        PARA["paragraphs"]:::view
        TEXT["texts"]:::view
        FENCE["fences"]:::view
    end

    subgraph derived["Shared derived data"]
        RUNS["interpunctRuns<br/>range, separators, lines"]:::build
    end

    subgraph gates["Prose gates"]
        SENT["Sentence<br/>PG001 PG002"]:::gate
        LIST["List<br/>PG003 PG006 PG007 PG008 PG009"]:::gate
        PUNC["Punctuation<br/>PG004 PG005"]:::gate
    end

    RECUR["checkModel on the fence body"]:::gate
    SORT["sort by line, then rule id"]:::out
    OUT["Finding list"]:::out

    SRC --> PARSE --> WALK
    WALK --> PARA
    WALK --> TEXT
    WALK --> FENCE
    PARA --> RUNS
    PARA --> SENT
    PARA --> LIST
    TEXT --> PUNC
    RUNS --> LIST
    RUNS --> PUNC
    FENCE --> RECUR
    SENT --> SORT
    LIST --> SORT
    PUNC --> SORT
    RECUR --> SORT --> OUT

    classDef source fill:#2563eb,stroke:#bfdbfe,color:#ffffff
    classDef build  fill:#7c3aed,stroke:#ddd6fe,color:#ffffff
    classDef view   fill:#c4b5fd,stroke:#7c3aed,color:#1e293b
    classDef gate   fill:#047857,stroke:#a7f3d0,color:#ffffff
    classDef out    fill:#fef3c7,stroke:#b45309,color:#1e293b

    style build fill:#ede9fe,stroke:#6d28d9,color:#1e293b
    style derived fill:#f1f5f9,stroke:#334155,color:#1e293b
    style gates fill:#d1fae5,stroke:#065f46,color:#1e293b
```

</details>

Every gate reads the same `CheckContext`, which is the shared `RuleContext` plus the file it reports against and the sentence budget.
A gate never writes a file, never mutates the model and never sees another gate's output.

## Fix pipeline

Fixing is a fixpoint loop over splice edits.
Offsets are only valid for the source they were computed from, so every accepted edit restarts the pass.

```mermaid
flowchart TB
    START(["fixMarkdownReport(src)"]):::source
    BUILD["ruleContext over the current source<br/>model and runs, rebuilt each pass"]:::build
    ASK["ask the next rule in FIX_ORDER for edits"]:::build
    FILTER["drop no-op edits and edits already refused"]:::build
    BATCH{"batchable?<br/>no overlap, no paragraph replacement"}:::decide
    SPLICE["splice, then reparse"]:::build
    VERIFY{"verify"}:::decide
    ACCEPT["keep the edit, restart the pass"]:::ok
    REFUSE["remember the refusal, try the next edit"]:::bad
    DONE(["no rule progressed: return the report"]):::out

    START --> BUILD --> ASK --> FILTER --> BATCH
    BATCH -- "yes, whole batch" --> SPLICE
    BATCH -- "no, one at a time" --> SPLICE
    SPLICE --> VERIFY
    VERIFY -- "accept" --> ACCEPT --> BUILD
    VERIFY -- "refuse" --> REFUSE --> ASK
    ASK -- "no rule left" --> DONE

    classDef source fill:#2563eb,stroke:#bfdbfe,color:#ffffff
    classDef build  fill:#7c3aed,stroke:#ddd6fe,color:#ffffff
    classDef decide fill:#334155,stroke:#cbd5e1,color:#ffffff
    classDef ok     fill:#047857,stroke:#a7f3d0,color:#ffffff
    classDef bad    fill:#b91c1c,stroke:#fecaca,color:#ffffff
    classDef out    fill:#fef3c7,stroke:#b45309,color:#1e293b
```

*The fixpoint loop in `src/fix/engine.ts`.* | 10 nodes, VCS 17.0

A refused edit is remembered by the triple of rule, source slice and replacement text.
It stays refused while that slice is unchanged, so a stubborn fixer cannot spin the loop.
The loop throws after ten thousand passes, which means a fixer is proposing an edit it never converges on.

## Verification

A fixer proposes.
The engine, not the fixer, decides whether an edit is safe to keep.

```mermaid
flowchart TB
    EDIT(["an edit and the reparsed tree"]):::source
    FP{"fingerprint unchanged?"}:::decide
    THROW["FixInvariantError<br/>the fixer lost content, so the run fails"]:::bad
    KIND{"expectation kind"}:::decide
    TREE["same-tree<br/>whitespace collapsed, trees equal"]:::build
    SHAPE["same-shape<br/>text blanked, trees equal"]:::build
    REPL["replace-paragraph<br/>fragment shape, then swapped tree equal"]:::build
    OK(["accept: write it"]):::ok
    NO(["refuse: the finding stays"]):::bad

    EDIT --> FP
    FP -- "no" --> THROW
    FP -- "yes" --> KIND
    KIND -- "same-tree" --> TREE
    KIND -- "same-shape" --> SHAPE
    KIND -- "replace-paragraph" --> REPL
    TREE --> OK
    SHAPE --> OK
    REPL --> OK
    TREE --> NO
    SHAPE --> NO
    REPL --> NO

    classDef source fill:#2563eb,stroke:#bfdbfe,color:#ffffff
    classDef build  fill:#7c3aed,stroke:#ddd6fe,color:#ffffff
    classDef decide fill:#334155,stroke:#cbd5e1,color:#ffffff
    classDef ok     fill:#047857,stroke:#a7f3d0,color:#ffffff
    classDef bad    fill:#b91c1c,stroke:#fecaca,color:#ffffff
```

*Two obligations, in order.* | 9 nodes, VCS 15.0

The fingerprint is every word, url, alt text and code value of the document, in order.
Joining conjunctions and enumeration markers are excluded, because a fixer is allowed to rewrite those.
A fingerprint change is a bug in the fixer, so it throws rather than refusing.

The expectation is a claim about structure that the fixer could not fully verify from inside one paragraph.
A mismatch means a context the fixer could not see, so the edit is refused and the finding stays for a human.

| Expectation | Claim | Comparison | Used by |
|---|---|---|---|
| `same-tree` | Whitespace moved and nothing else | Trees equal once text whitespace is collapsed | PG001 |
| `same-shape` | Glyphs swapped inside text | Trees equal once every text value is blanked | PG004, PG005 |
| `replace-paragraph` | One paragraph became a lead-in and a list | Fragment has the declared shape, and swapping it into the old tree reproduces the new tree | PG003, PG006, PG007, PG008, PG009 |

## Fix order

Structure first, then glyphs, then layout.
A promotion needs the separators a glyph swap would erase, and reflow only makes sense over settled blocks.

```mermaid
flowchart LR
    P9["PG009<br/>stacked runs"]:::list
    P7["PG007<br/>inline enum"]:::list
    P8["PG008<br/>labelled run"]:::list
    P6["PG006<br/>interpunct run"]:::list
    P3["PG003<br/>semicolon list"]:::list
    P5["PG005<br/>interpunct"]:::punc
    P4["PG004<br/>em dash"]:::punc
    P1["PG001<br/>reflow"]:::sent

    P9 --> P7 --> P8 --> P6 --> P3 --> P5 --> P4 --> P1

    classDef list fill:#047857,stroke:#a7f3d0,color:#ffffff
    classDef punc fill:#7c3aed,stroke:#ddd6fe,color:#ffffff
    classDef sent fill:#2563eb,stroke:#bfdbfe,color:#ffffff
```

*`FIX_ORDER` in `src/rules/index.ts`.* | 8 nodes, VCS 11.5

PG002 has no fixer.
Shortening a sentence changes its words, and that needs discretion.

The five list gates share one fixer helper, `promote`, in `src/fix/promote.ts`.
Each gate decides where the list starts and what each item is, then hands `promote` a `Promotion`.
Item text is sliced from the source and never re-serialised, so links, emphasis, escapes and code spans travel unchanged.

```mermaid
flowchart LR
    subgraph gates["List gates"]
        G3["PG003"]:::gate
        G6["PG006"]:::gate
        G7["PG007"]:::gate
        G8["PG008"]:::gate
        G9["PG009"]:::gate
    end
    PROM["promote<br/>lead-in plus items"]:::build
    GUARD{"safe to promote?"}:::decide
    NULL(["null: the finding stays"]):::bad
    EDIT(["Edit with replace-paragraph"]):::ok

    G3 --> PROM
    G6 --> PROM
    G7 --> PROM
    G8 --> PROM
    G9 --> PROM
    PROM --> GUARD
    GUARD -- "table, quote, hard break, under two items, unsafe line start" --> NULL
    GUARD -- "otherwise" --> EDIT

    classDef gate   fill:#047857,stroke:#a7f3d0,color:#ffffff
    classDef build  fill:#7c3aed,stroke:#ddd6fe,color:#ffffff
    classDef decide fill:#334155,stroke:#cbd5e1,color:#ffffff
    classDef ok     fill:#fef3c7,stroke:#b45309,color:#1e293b
    classDef bad    fill:#b91c1c,stroke:#fecaca,color:#ffffff

    style gates fill:#d1fae5,stroke:#065f46,color:#1e293b
```

*The shared promotion path.* | 9 nodes, VCS 17.6

## Extending the model

### Adding a rule

One rule is one file, named `src/rules/pgNNN-slug.ts`, exporting one `Rule`.

Every rule module has the same shape, so a reader who has read one has read them all.

```ts
// What the rule guards, and what the fix will and will not do.

import ...

// Rule-local constants and helpers, each with the reason it exists.

const check: Rule["check"] = (ctx) => { ... };

const fix: Rule["fix"] = (ctx) => { ... };

export const pgNNN: Rule = { id: RULE.NAME, category: "...", summary: "...", check, fix };
```

1. Pick the next free id and add it to the `RULE` map in `src/rules/types.ts`.
2. Choose a category from `CATEGORIES`, which is what groups the rule in help and in `RULES.md`.
3. Write `check`, reading only `CheckContext`.
   Skip `inTable` paragraphs unless the rule is about a glyph.
4. Write `fix` if the rule can be fixed without discretion, and leave it out if it cannot.
   A fix reads `FixContext`, which is the same shared data the check read.
   Data derived from the whole document belongs in `ruleContext`, never recomputed inside the rule.
5. Register the rule in `RULES` in `src/rules/index.ts`, in id order.
6. Place it in `FIX_ORDER` if it has a fixer, respecting the structure before glyphs before layout sequence.
7. Add a section to `RULES.md` under the rule's category heading.
   `tests/rules-doc.test.ts` holds that document to the code, so a missing section fails CI.
8. Add an adversarial test under `tests/adversarial/` and a fixture pair under `tests/fixtures/fix/` if the rule fixes.

Nothing else needs to change.
The CLI help, the category grouping and the documentation test all read the catalogue.

### Choosing an expectation

The expectation is the strongest claim the edit can honestly make.

Reach for `same-tree` when the edit only moves whitespace.
Reach for `same-shape` when the edit swaps glyphs inside text and leaves node boundaries alone.
Reach for `replace-paragraph` when one paragraph becomes several blocks.

A weaker claim is not safer.
`same-shape` blanks text before comparing, so it would wave through an edit that changed a word.
That is why the fingerprint check runs first, and runs unconditionally.

### Reusing the helpers

| Helper | Module | Use it for |
|---|---|---|
| `words` | `model.ts` | Counting the words of a sentence or an item, the one way every rule counts them |
| `matchesIn` | `fix/spans.ts` | Absolute offsets of a pattern inside one text node, or null when source and value disagree |
| `matchesInAll` | `fix/spans.ts` | The same across every direct text of a paragraph |
| `splittableSeparators` | `fix/spans.ts` | Every separator a fixer may split on, or null when one of them cannot be trusted |
| `sentenceSpan` | `fix/spans.ts` | The sentence bounds covering a range a fixer found |
| `sentenceSpans` | `fix/spans.ts` | Every sentence of a paragraph, in order |
| `spansBetween` | `fix/spans.ts` | The spans a run of cut points carves out, with the fencepost written once |
| `escaped` | `fix/spans.ts` | Refusing a glyph the author escaped |
| `collapse` | `fix/spans.ts` | Folding soft line breaks into single spaces |
| `first`, `last` | `fix/ends.ts` | The ends of a list a rule has already proved non-empty, without a cast per rule |
| `promote` | `fix/promote.ts` | Turning a span into a lead-in and a real markdown list |
| `cleanItem` | `fix/promote.ts` | Trimming a trailing separator or a joining conjunction off one item |
| `itemsOf` | `fix/promote.ts` | A run of source spans as cleaned item text, in document order |
| `itemsBetween` | `fix/promote.ts` | The same from cut points: the shared body of every hidden-list fixer |
| `cleanLeadIn` | `fix/promote.ts` | Normalising the text before a promoted list to end in a colon |
| `ruleContext` | `rules/index.ts` | Building the shared half of the context once per document |
| `interpunctRuns` | `rules/interpunct.ts` | The shared run data behind PG005, PG006 and PG009 |
| `isFlat`, `isStacked` | `rules/interpunct.ts` | Partitioning runs into the flat ones PG006 owns and the stacked ones PG009 owns |

### Rules the extension must not break

- A fixer never guesses.
  An ambiguous case returns no edit, and the finding stays.
- A fixer never re-serialises prose.
  Item and sentence text is sliced from the source.
- An offset belongs to one source.
  Recompute after every accepted edit, which the engine already does by restarting the pass.
- A fence tagged `markdown` or `md` is check only.
  No fix ever rewrites through a fence boundary.
- A fix bug gets its adversarial test before it gets its fix.

## See also

- [`RULES.md`](../RULES.md) for a failing example and the fix for every gate.
- [`GLOSSARY.md`](../GLOSSARY.md) for the canonical name of every term used here.
- [`adrs/index.md`](../adrs/index.md) for the decisions behind these shapes.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) for setup and how a change is accepted.
