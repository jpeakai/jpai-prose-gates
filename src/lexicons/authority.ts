// An unnamed authority standing in for what was said (humanizer pattern 17). A missing citation is
// not a tell on its own, since most writing is unsourced, so only the stock attributions are listed.

import type { Lexicon } from "../lexicon.ts";

export const AUTHORITY: Lexicon = {
  id: "authority",
  reviewed: "2026-10-10",
  sources: ["blader/humanizer 3.1.0 (MIT), pattern 17", "Wikipedia: Signs of AI writing, vague attributions"],
  entries: [
    { pattern: "experts (?:argue|believe|say|agree|suggest)" },
    { phrase: "observers have cited" },
    { phrase: "industry reports" },
    { phrase: "some critics" },
    { phrase: "several publications" },
    { phrase: "critics argue" },
  ],
};
