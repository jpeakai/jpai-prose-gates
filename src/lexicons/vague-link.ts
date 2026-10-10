// Two things said to be connected without saying how (humanizer pattern 14). Technical writing uses
// these words honestly all the time, so the rule starts off and a project turns it on.

import type { Lexicon } from "../lexicon.ts";

export const VAGUE_LINK: Lexicon = {
  id: "vague-link",
  reviewed: "2026-10-10",
  sources: [
    "blader/humanizer 3.1.0 (MIT), pattern 14",
    "Wikipedia: Signs of AI writing, vague expression of connection",
  ],
  entries: [
    { phrase: "associated with" },
    { phrase: "in association with" },
    { phrase: "in connection with" },
    { phrase: "linked to" },
    { phrase: "tied to" },
  ],
};
