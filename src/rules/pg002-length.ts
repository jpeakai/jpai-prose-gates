// PG002: sentences over the word budget are hard to unpack, especially for
// ESL readers and translators. Never autofixed: shortening a sentence is a
// rewrite, and a rewrite needs discretion. The message estimates the clauses
// in the sentence so the rewrite splits it rather than compressing it.

import { sentences } from "../model.ts";
import { type Finding, RULE, type Rule } from "./types.ts";

// A clause boundary is a semicolon or colon with text after it, a comma
// before a coordinating conjunction, or a subordinating or relative word.
// ", which" matches once, through the subordinator alone. The count is a
// guide, not a parse: an Oxford comma in a list reads as a boundary too.
const CLAUSE_BOUNDARY =
  /[;:](?=\s+\S)|,\s+(?:and|but|or|so|yet|nor)\b|\b(?:because|although|though|whereas|unless|whenever|wherever|while|when|if|which|who|whom|whose)\b/gi;

export const countClauses = (sentence: string): number => 1 + [...sentence.matchAll(CLAUSE_BOUNDARY)].length;

const excerpt = (s: string): string => (s.length > 60 ? `${s.slice(0, 60)}...` : s);

export const lengthMessage = (sentence: string, maxWords: number): string => {
  const words = sentence.split(/\s+/).length;
  const clauses = countClauses(sentence);
  const target = Math.max(2, clauses, Math.ceil(words / maxWords));
  const clauseNote = `${clauses} potential clause${clauses === 1 ? "" : "s"}`;
  return `sentence has ${words} words (budget ${maxWords}) and ${clauseNote}; split it into about ${target} shorter sentences, one idea each, rather than compressing the wording: "${excerpt(sentence)}"`;
};

export const pg002: Rule = {
  id: RULE.LENGTH,
  category: "sentence",
  summary: "sentence longer than the word budget (default 25)",
  check: ({ doc, file, maxWords }) => {
    const findings: Finding[] = [];
    for (const p of doc.paragraphs) {
      if (p.inTable) continue;
      for (const s of sentences(p.prose)) {
        if (s.split(/\s+/).length > maxWords) {
          findings.push({ file, line: p.line, rule: RULE.LENGTH, message: lengthMessage(s, maxWords) });
        }
      }
    }
    return findings;
  },
};
