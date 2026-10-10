// sentence-repeated-opening-run: several sentences in a row that begin with the same word. A person repeats an
// opening on purpose for rhythm, so the rule starts off. It skips "the", "a" and "an", which technical prose
// repeats constantly, and counts only runs of at least three, a number the config can change.

import { lineWithin, tellFinding, tellParagraphs } from "../tells.ts";
import { sentences } from "../text.ts";
import { type Finding, RULE, type Rule } from "./types.ts";

const DEFAULT_MIN_RUN = 3;
const EXEMPT = new Set(["the", "a", "an"]);

// The first word of a sentence. A paragraph's prose shows inline code as the token CODE, which is
// not a word the author chose, so a sentence that opens with code has no opening word to repeat.
const openingOf = (sentence: string): string => {
  const first = sentence.match(/[\p{L}\p{N}'’]+/u)?.[0] ?? "";
  return first === "CODE" ? "" : first.toLowerCase();
};

const check: Rule["check"] = ({ doc, file, options }) => {
  const minRun = typeof options.minRun === "number" ? options.minRun : DEFAULT_MIN_RUN;
  const found: Finding[] = [];
  for (const view of tellParagraphs(doc)) {
    const all = sentences(view.prose);
    let from = 0;
    while (from < all.length) {
      const word = openingOf(all[from] ?? "");
      let to = from + 1;
      while (to < all.length && openingOf(all[to] ?? "") === word) to += 1;
      if (word !== "" && !EXEMPT.has(word) && to - from >= minRun) {
        found.push(
          tellFinding(RULE.OPENING_RUN, file, lineWithin(view, all[from] ?? ""), {
            what: `${to - from} sentences in a row begin with "${word}"`,
            evidence: all[from] ?? "",
            instruction:
              "Merge the sentences, change a subject, or begin with the action. Keep it only if the repetition is the rhythm you want.",
          }),
        );
      }
      from = to;
    }
  }
  return found;
};

export const sentenceRepeatedOpeningRun: Rule = {
  id: RULE.OPENING_RUN,
  category: "sentence",
  summary: "three or more sentences in a row that begin with the same word",
  defaultSeverity: "off",
  options: { minRun: "number" },
  check,
};
