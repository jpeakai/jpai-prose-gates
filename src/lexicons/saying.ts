// An ordinary point dressed as a hidden truth (humanizer pattern 3). These phrases have honest uses,
// so the rule starts off.

import type { Lexicon } from "../lexicon.ts";

export const SAYING: Lexicon = {
  id: "saying",
  reviewed: "2026-10-10",
  sources: ["blader/humanizer 3.1.0 (MIT), pattern 3"],
  entries: [
    { phrase: "at its core" },
    { phrase: "the real question is" },
    { phrase: "what really matters" },
    { phrase: "the heart of the matter" },
    { phrase: "the deeper issue" },
    { pattern: "is the (?:language|currency) of" },
    { phrase: "becomes a trap" },
  ],
};
