---
type: Architecture Decision
title: A project's GLOSSARY.md or CONCEPTS.md is read as its concept model, and the language view names its terms
description: Each H2 is a concept, each Mermaid edge a relation, and every sentence lists the concepts it mentions
tags: [model, plugins, language, concepts]
status: accepted
accepted_on: 2026-10-17
provenance: Raised once compromise was in the tree, as a way to give rules the domain terms and relations that a project's own glossary already holds
enforced_in:
  - src/concepts.ts, which reads the file, builds the model and finds mentions in a sentence
  - src/project.ts, which loads the concept file at the project root once per run
  - src/model.ts and src/language.ts, where the document carries the model and each sentence its mentions
  - src/errors.ts, with ConceptsFileError and AmbiguousConceptsError
  - tests/concepts.test.ts, which pins the parse, the errors, the mentions and the plugin guide's example rule
generated: { by: human:maintainer, at: 2026-10-17T00:00:00Z }
---

<!-- GENERATED from PRS-0036 by okf_render.py. Do not edit; edit the .yml and regenerate. -->

## Relates to

- Extends [PRS-0033](0033-a-paragraph-carries-a-lazy-language-view.md) (each sentence of the language view now lists the concepts it names)
- Extends [PRS-0018](0018-config-file-and-rule-control.md) (a second file at the project root shapes a run, beside the config, and fails the same way when it is wrong)
- Extends [PRS-0019](0019-plugin-contract-and-namespace.md) (a plugin rule reads concepts from the document it already receives, with no import)

## Decision

### The lens

#### Given

a project keeps a glossary in the librarian template, one H2 per term and Mermaid diagrams that relate them

#### We prefer

reading that file as the concept model and naming its terms in the language view, over a separate vocabulary config

#### Because

the glossary is already the canonical vocabulary, so a second copy would drift from it

#### Unless

a project needs concepts from several files or from outside the root, which calls for a config key and a new record

## Consequences

### Pros

- A plugin can check a project's own dialect, such as Title Case terms or a prohibited relation, from data alone.
- A glossary diagram that names an undefined term now fails the run, so the diagram and the headings stay in step.

### Cons

- A project whose GLOSSARY.md is in another shape must move it to the template before the gates run there.
- Findings of a concept rule depend on a file other than the one checked, so a glossary edit can move them.
