// docs/language.md shows worked examples of the language and concept models.
// Each output block is built again here from the input block before it, so
// the page cannot drift from the code. An input is a block titled Sentence,
// Paragraph or GLOSSARY.md, and the output block after it says what to build.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { Code } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gapCohesion, planBreaks } from "../src/cohesion.ts";
import { type ConceptModel, NO_CONCEPTS, parseConcepts } from "../src/concepts.ts";
import type { LanguageSentence } from "../src/language.ts";
import { buildDocModel } from "../src/model.ts";
import { DEFAULT_MAX_SENTENCES, paragraphMessage } from "../src/rules/paragraph-sentence-budget-exceeded.ts";
import { clausesOf } from "../src/rules/sentence-word-budget-exceeded.ts";
import { PROJECT_ROOT } from "./helpers.ts";

const doc = await Bun.file(join(PROJECT_ROOT, "docs", "language.md")).text();
const fences = fromMarkdown(doc)
  .children.filter((n): n is Code => n.type === "code" && n.meta !== null && n.meta !== undefined)
  .map((c) => ({ title: /^title="([^"]*)"$/.exec(c.meta ?? "")?.[1] ?? "", body: c.value }));

const sentencesOf = (text: string, concepts: ConceptModel): readonly LanguageSentence[] =>
  buildDocModel(`${text}\n`, concepts).paragraphs[0]?.language.sentences ?? [];

const onlySentence = (text: string, concepts: ConceptModel): LanguageSentence => {
  const sentences = sentencesOf(text, concepts);
  if (sentences.length !== 1) throw new Error(`expected one sentence in "${text}"`);
  return sentences[0] as LanguageSentence;
};

// What each output title shows, built from the input before it.
const BUILDS: Record<string, (input: string, concepts: ConceptModel) => unknown> = {
  "Language view": (input, concepts) => {
    const s = onlySentence(input, concepts);
    return {
      text: s.text,
      words: s.words.map((w) => ({ text: w.text, lemma: w.lemma, tags: [...w.tags], content: w.content })),
      terms: [...s.terms],
      opener: s.opener,
      refersBack: s.refersBack,
      verbPhrases: s.verbPhrases,
      concepts: s.concepts,
    };
  },
  Clauses: (input, concepts) => {
    const s = onlySentence(input, concepts);
    return { verbPhrases: s.verbPhrases, clauses: clausesOf(s) };
  },
  "Concept mentions": (input, concepts) => onlySentence(input, concepts).concepts,
  Cohesion: (input, concepts) => {
    const sentences = sentencesOf(input, concepts);
    const cohesion = gapCohesion(sentences);
    return {
      cohesion,
      ...planBreaks(cohesion, DEFAULT_MAX_SENTENCES),
      message: paragraphMessage(sentences, DEFAULT_MAX_SENTENCES),
    };
  },
  "Concept model": (input) => parseConcepts("GLOSSARY.md", input),
};
const INPUTS = new Set(["Sentence", "Paragraph", "GLOSSARY.md"]);

const examples: { title: string; input: string; concepts: ConceptModel; shown: string }[] = [];
let input = "";
let concepts = NO_CONCEPTS;
for (const { title, body } of fences) {
  if (title === "GLOSSARY.md") concepts = parseConcepts("GLOSSARY.md", body);
  if (INPUTS.has(title)) {
    input = body;
    continue;
  }
  if (!(title in BUILDS)) throw new Error(`docs/language.md: a fence has an unknown title, "${title}"`);
  examples.push({ title, input, concepts, shown: body });
}

describe("docs/language.md", () => {
  test("shows every kind of example", () => {
    expect(new Set(examples.map((e) => e.title))).toEqual(new Set(Object.keys(BUILDS)));
  });

  test.each(examples)("$title matches what the code builds", ({ title, input: from, concepts: model, shown }) => {
    expect(JSON.parse(shown)).toEqual(BUILDS[title]?.(from, model));
  });
});
