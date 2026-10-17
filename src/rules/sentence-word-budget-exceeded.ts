// sentence-word-budget-exceeded: sentences over the word budget are hard to unpack, especially for
// ESL readers and translators. Never autofixed: shortening a sentence is a
// rewrite, and a rewrite needs discretion. The message estimates the clauses
// in the sentence so the rewrite splits it rather than compressing it.

import { type LanguageSentence, sentenceOf } from "../language.ts";
import { proseParagraphs } from "../query.ts";
import { words } from "../text.ts";
import { RULE, type Rule } from "./types.ts";

// A clause boundary is a semicolon or colon with text after it, a comma
// before a coordinating conjunction, or a subordinating or relative word.
// ", which" matches once, through the subordinator alone. An Oxford comma in
// a list reads as a boundary too.
const CLAUSE_BOUNDARY =
  /[;:](?=\s+\S)|,\s+(?:and|but|or|so|yet|nor)\b|\b(?:because|although|though|whereas|unless|whenever|wherever|while|when|if|which|who|whom|whose)\b/gi;

// Two signals, and the count is the larger. Every clause has a verb, so the
// verb phrases compromise finds catch a series of verbs and a clause joined
// with no marker word. Its tagger misses some verbs, such as "reparses", so
// the punctuation and marker words stay as a floor. The count is a guide,
// not a parse.
export const clausesOf = (sentence: LanguageSentence): number =>
  Math.max(1 + [...sentence.text.matchAll(CLAUSE_BOUNDARY)].length, sentence.verbPhrases);

export const countClauses = (sentence: string): number => clausesOf(sentenceOf(sentence));

const excerpt = (sentence: string): string => (sentence.length > 60 ? `${sentence.slice(0, 60)}...` : sentence);

const messageOf = (sentence: LanguageSentence, maxWords: number): string => {
  const count = words(sentence.text);
  const clauses = clausesOf(sentence);
  const target = Math.max(2, clauses, Math.ceil(count / maxWords));
  const clauseNote = `${clauses} potential clause${clauses === 1 ? "" : "s"}`;
  return `sentence has ${count} words (budget ${maxWords}) and ${clauseNote}; split it into about ${target} shorter sentences, one idea each, rather than compressing the wording: "${excerpt(sentence.text)}"`;
};

// The message for one sentence, as a plugin's helpers give it.
export const lengthMessage = (sentence: string, maxWords: number): string => messageOf(sentenceOf(sentence), maxWords);

// Sentences come from each paragraph's language view, so an abbreviation or
// a decimal never ends one early.
const check: Rule["check"] = ({ doc, file, maxWords }) =>
  proseParagraphs(doc).flatMap((view) =>
    view.language.sentences
      .filter((sentence) => words(sentence.text) > maxWords)
      .map((sentence) => ({ file, line: view.line, rule: RULE.LENGTH, message: messageOf(sentence, maxWords) })),
  );

// No fixer: shortening a sentence changes its words, per PRS-0006.
export const sentenceWordBudgetExceeded: Rule = {
  id: RULE.LENGTH,
  category: "sentence",
  summary: "sentence longer than the word budget (default 25)",
  options: { maxWords: "number" },
  check,
};
