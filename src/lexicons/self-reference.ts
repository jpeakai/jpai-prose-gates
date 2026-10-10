// Text that describes its own sourcing, assembly or layout instead of its subject (humanizer pattern
// 25). Documents explain their own layout often and honestly, so the rule starts off.

import type { Lexicon } from "../lexicon.ts";

export const SELF_REFERENCE: Lexicon = {
  id: "self-reference",
  reviewed: "2026-10-10",
  sources: ["blader/humanizer 3.1.0 (MIT), pattern 25"],
  entries: [
    { phrase: "the table below" },
    { pattern: "this section is organi[sz]ed" },
    { phrase: "generated from" },
    { phrase: "compiled from" },
    { phrase: "was added to replace" },
    { phrase: "is flagged rather than guessed" },
  ],
};
