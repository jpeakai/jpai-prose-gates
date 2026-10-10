// phrase-stacked-hedge-run: several hedging words packed into one stretch of a sentence ("could potentially
// possibly be argued"). Repeated editing adds one qualifier after another until every claim sounds
// unsure. One hedge is ordinary, so only three or more within eight words are reported, a number the
// config can change. The words are a closed list, so no part of speech is read.

import { lineWithin, tellFinding, tellParagraphs } from "../tells.ts";
import { sentences } from "../text.ts";
import { type Finding, RULE, type Rule } from "./types.ts";

const HEDGES = new Set([
  "could",
  "might",
  "may",
  "potentially",
  "possibly",
  "arguably",
  "perhaps",
  "somewhat",
  "relatively",
  "apparently",
  "seemingly",
  "conceivably",
]);
const WINDOW = 8;
const DEFAULT_MIN = 3;

const stacked = (sentence: string, min: number): boolean => {
  const words = (sentence.toLowerCase().match(/[\p{L}'’]+/gu) ?? []).map((w) => HEDGES.has(w));
  return words.some((_, i) => words.slice(i, i + WINDOW).filter(Boolean).length >= min);
};

const check: Rule["check"] = ({ doc, file, options }) => {
  const min = typeof options.min === "number" ? options.min : DEFAULT_MIN;
  const found: Finding[] = [];
  for (const view of tellParagraphs(doc)) {
    for (const sentence of sentences(view.prose)) {
      if (!stacked(sentence, min)) continue;
      found.push(
        tellFinding(RULE.HEDGE_RUN, file, lineWithin(view, sentence), {
          what: "stacked hedging words",
          evidence: sentence,
          instruction: "Keep only the qualifier the source supports, and state the claim once.",
        }),
      );
    }
  }
  return found;
};

export const phraseStackedHedgeRun: Rule = {
  id: RULE.HEDGE_RUN,
  category: "phrase",
  summary: "three or more hedging words within one stretch of a sentence",
  defaultSeverity: "warn",
  options: { min: "number" },
  check,
};
