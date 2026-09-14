// PG002: sentences over the word budget are hard to unpack, especially for
// ESL readers and translators. Never autofixed: shortening a sentence is a
// rewrite, and a rewrite needs discretion. The message estimates the clauses
// in the sentence so the rewrite splits it rather than compressing it.

import { proseSentences } from "../query.ts";
import { words } from "../text.ts";
import { RULE, type Rule } from "./types.ts";

// A clause boundary is a semicolon or colon with text after it, a comma
// before a coordinating conjunction, or a subordinating or relative word.
// ", which" matches once, through the subordinator alone. The count is a
// guide, not a parse: an Oxford comma in a list reads as a boundary too.
const CLAUSE_BOUNDARY =
  /[;:](?=\s+\S)|,\s+(?:and|but|or|so|yet|nor)\b|\b(?:because|although|though|whereas|unless|whenever|wherever|while|when|if|which|who|whom|whose)\b/gi;

export const countClauses = (sentence: string): number => 1 + [...sentence.matchAll(CLAUSE_BOUNDARY)].length;

const excerpt = (sentence: string): string => (sentence.length > 60 ? `${sentence.slice(0, 60)}...` : sentence);

export const lengthMessage = (sentence: string, maxWords: number): string => {
  const count = words(sentence);
  const clauses = countClauses(sentence);
  const target = Math.max(2, clauses, Math.ceil(count / maxWords));
  const clauseNote = `${clauses} potential clause${clauses === 1 ? "" : "s"}`;
  return `sentence has ${count} words (budget ${maxWords}) and ${clauseNote}; split it into about ${target} shorter sentences, one idea each, rather than compressing the wording: "${excerpt(sentence)}"`;
};

const check: Rule["check"] = ({ doc, file, maxWords }) =>
  proseSentences(doc)
    .filter(({ sentence }) => words(sentence) > maxWords)
    .map(({ view, sentence }) => ({
      file,
      line: view.line,
      rule: RULE.LENGTH,
      message: lengthMessage(sentence, maxWords),
    }));

// No fixer: shortening a sentence changes its words, per PRS-0006.
export const pg002: Rule = {
  id: RULE.LENGTH,
  category: "sentence",
  summary: "sentence longer than the word budget (default 25)",
  check,
};
