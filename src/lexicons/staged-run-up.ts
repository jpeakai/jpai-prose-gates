// An opener that announces the point or stages a moment of candour instead of making the point
// (humanizer pattern 4). "Honestly" inside a casual sentence is ordinary, so only the standalone
// question form is listed.

import type { Lexicon } from "../lexicon.ts";

export const STAGED_RUN_UP: Lexicon = {
  id: "staged-run-up",
  reviewed: "2026-10-10",
  sources: ["blader/humanizer 3.1.0 (MIT), pattern 4"],
  entries: [
    { pattern: "let's (?:dive|delve) (?:in|into)" },
    { phrase: "let's explore" },
    { pattern: "let's (?:break|unpack) (?:this|it|that) (?:down|open)" },
    { phrase: "here's what you need to know" },
    { phrase: "here is what you need to know" },
    { phrase: "without further ado" },
    { phrase: "here's the thing" },
    { phrase: "let's be honest" },
    { phrase: "real talk" },
    { phrase: "now let's look at" },
    { pattern: "(?<=^|[.!?]\\s)honestly\\?" },
  ],
};
