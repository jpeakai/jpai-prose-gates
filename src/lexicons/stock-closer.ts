// A one-sentence paragraph that tells the reader how to feel about the paragraph before it
// (humanizer pattern 2). Each entry is the whole sentence, so a longer sentence that happens to
// contain the words does not match.

import type { Lexicon } from "../lexicon.ts";

export const STOCK_CLOSER: Lexicon = {
  id: "stock-closer",
  reviewed: "2026-10-10",
  sources: ["blader/humanizer 3.1.0 (MIT), pattern 2"],
  entries: [
    { phrase: "That is the real win" },
    { phrase: "That's the real win" },
    { phrase: "That is the real takeaway" },
    { phrase: "That's the real takeaway" },
    { phrase: "That distinction matters" },
    { phrase: "Read that again" },
    { phrase: "Let that sink in" },
    { phrase: "And that changes everything" },
    { phrase: "Full stop" },
  ],
};
