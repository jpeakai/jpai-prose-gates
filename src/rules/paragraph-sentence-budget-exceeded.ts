// paragraph-sentence-budget-exceeded: a paragraph of more sentences than the
// budget renders as a wall of text, even when every sentence is short. Never
// autofixed: where a paragraph breaks is a judgement about its topics. The
// message counts the topics and names the sentences to break after.
//
// It runs after the list rules. A list hidden in a paragraph is theirs to
// report, and promoting it often brings the paragraph within budget on its
// own, so a paragraph a list rule reports is counted only once the list is out.

import { gapCohesion, planBreaks } from "../cohesion.ts";
import type { LanguageSentence } from "../language.ts";
import type { ParagraphView } from "../model.ts";
import { proseParagraphs } from "../query.ts";
import { type Finding, RULE, type Rule } from "./types.ts";

export const DEFAULT_MAX_SENTENCES = 5;

// A list of sentence numbers as prose: "3", "3 and 6", "2, 3 and 6".
const series = (ns: number[]): string =>
  ns.length === 1 ? `${ns[0]}` : `${ns.slice(0, -1).join(", ")} and ${ns.at(-1)}`;

const plural = (n: number, word: string): string => `${word}${n === 1 ? "" : "s"}`;

export const paragraphMessage = (sentences: readonly LanguageSentence[], maxSentences: number): string => {
  const { topics, breaks } = planBreaks(gapCohesion(sentences), maxSentences);
  const where = `break it after ${plural(breaks.length, "sentence")} ${series(breaks)}`;
  const counted = `paragraph has ${sentences.length} sentences (budget ${maxSentences})`;
  return topics === 1
    ? `${counted} and one topic throughout; ${where}, where neighbouring sentences share the fewest words`
    : `${counted} and about ${topics} topics; ${where}, one topic per paragraph`;
};

const budgetOf = (option: unknown): number => (typeof option === "number" ? option : DEFAULT_MAX_SENTENCES);

// Whether a list rule reported a line of this paragraph. A list rule may
// report the paragraph's first line or the line its run starts on.
const holdsListFinding = (view: ParagraphView, earlier: readonly Finding[]): boolean => {
  const last = view.line + view.raw.split("\n").length - 1;
  return earlier.some((f) => f.line >= view.line && f.line <= last);
};

const check: Rule["check"] = ({ doc, file, options, earlier }) => {
  const maxSentences = budgetOf(options.maxSentences);
  return proseParagraphs(doc)
    .filter((view) => !holdsListFinding(view, earlier))
    .map((view) => ({ view, sentences: view.language.sentences }))
    .filter(({ sentences }) => sentences.length > maxSentences)
    .map(({ view, sentences }) => ({
      file,
      line: view.line,
      rule: RULE.PARAGRAPH_LENGTH,
      message: paragraphMessage(sentences, maxSentences),
    }));
};

// No fixer: breaking a paragraph is a judgement about its topics, per PRS-0030.
export const paragraphSentenceBudgetExceeded: Rule = {
  id: RULE.PARAGRAPH_LENGTH,
  category: "paragraph",
  summary: `paragraph with more sentences than the budget (default ${DEFAULT_MAX_SENTENCES})`,
  options: { maxSentences: "number" },
  after: ["list"],
  check,
};
