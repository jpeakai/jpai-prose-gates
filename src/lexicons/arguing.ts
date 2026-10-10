// A reply to an objection nobody raised, or the rejection of an option nobody offered (humanizer
// pattern 5). Usually a leftover from an earlier draft. "To be clear" is sometimes honest, so the
// rule starts off.

import type { Lexicon } from "../lexicon.ts";

export const ARGUING: Lexicon = {
  id: "arguing",
  reviewed: "2026-10-10",
  sources: ["blader/humanizer 3.1.0 (MIT), pattern 5"],
  entries: [
    { phrase: "to be clear" },
    { pattern: "I(?:'m| am) not saying" },
    { phrase: "don't get me wrong" },
    { phrase: "this is not to say" },
    { pattern: "this isn't (?:mainly |primarily )?about" },
    { phrase: "a tempting approach" },
    { phrase: "one might be tempted" },
    { phrase: "you might think" },
    { phrase: "some might say" },
    { phrase: "an obvious approach would be" },
    { phrase: "it would be easy to just" },
  ],
};
