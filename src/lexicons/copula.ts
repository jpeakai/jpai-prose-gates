// A longer verb phrase where "is", "are" or "has" would do (humanizer pattern 18). "Serves as" has
// honest uses in technical writing, so the rule warns.

import type { Lexicon } from "../lexicon.ts";

export const COPULA: Lexicon = {
  id: "copula",
  reviewed: "2026-10-10",
  sources: ["blader/humanizer 3.1.0 (MIT), pattern 18"],
  entries: [
    { pattern: "(?:serves?|served|serving) as" },
    { pattern: "(?:stands?|stood) as" },
    { pattern: "(?:functions?|functioned) as" },
    { pattern: "(?:operates?|operated) as" },
    { pattern: "boasts" },
  ],
};
