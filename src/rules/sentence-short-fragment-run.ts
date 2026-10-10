// sentence-short-fragment-run: a row of very short sentences ("No prior. No nostalgia. No taste."). Each
// asks the reader to pause on a weight it has not earned, and the row usually merges into one sentence
// with a specific claim. A sentence of four words or fewer counts as a fragment, and a run of three or
// more is reported, a number the config can change. Emphasis by a single short sentence is ordinary and
// is left alone.

import { lineWithin, tellFinding, tellParagraphs } from "../tells.ts";
import { sentences, words } from "../text.ts";
import { type Finding, RULE, type Rule } from "./types.ts";

const FRAGMENT_WORDS = 4;

// A lone initial such as "P." is how a name is written, and our splitter reads it as a sentence of its own.
const INITIAL = /^[A-Z]\.$/;

const isFragment = (sentence: string): boolean => words(sentence) <= FRAGMENT_WORDS && !INITIAL.test(sentence.trim());
const DEFAULT_MIN_RUN = 3;

const check: Rule["check"] = ({ doc, file, options }) => {
  const minRun = typeof options.minRun === "number" ? options.minRun : DEFAULT_MIN_RUN;
  const found: Finding[] = [];
  for (const view of tellParagraphs(doc)) {
    const all = sentences(view.prose);
    let from = 0;
    while (from < all.length) {
      let to = from;
      while (to < all.length && isFragment(all[to] ?? "")) to += 1;
      if (to - from >= minRun) {
        found.push(
          tellFinding(RULE.FRAGMENT_RUN, file, lineWithin(view, all[from] ?? ""), {
            what: `${to - from} short fragments in a row`,
            evidence: all.slice(from, to).join(" "),
            instruction: "Merge the fragments into one sentence that makes a specific claim.",
          }),
        );
      }
      from = Math.max(to, from + 1);
    }
  }
  return found;
};

export const sentenceShortFragmentRun: Rule = {
  id: RULE.FRAGMENT_RUN,
  category: "sentence",
  summary: "three or more very short sentences in a row",
  defaultSeverity: "warn",
  options: { minRun: "number" },
  check,
};
