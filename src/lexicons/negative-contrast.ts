// "Not X but Y": the negative half names something nobody claimed, so the positive half sounds larger
// (humanizer pattern 1). Some contrasts correct a real belief and are fine, which is why the rule
// warns. These patterns are broad on purpose and read inside one paragraph, so a contrast split across
// two sentences is caught too.

import type { Lexicon } from "../lexicon.ts";

export const NEGATIVE_CONTRAST: Lexicon = {
  id: "negative-contrast",
  reviewed: "2026-10-10",
  sources: ["blader/humanizer 3.1.0 (MIT), pattern 1", "slopless negation-reframe rule (ideas only)"],
  entries: [
    {
      pattern:
        "(?:it|this|that)(?:['’]s| is) not (?:just|only|merely|simply)\\b[^.!?\\n]{0,120}[,;:] ?(?:it|this|that)(?:['’]s| is)",
    },
    { pattern: "not (?:just|only|merely) [^.!?]{0,80}\\bbut (?:also )?\\w+" },
    { pattern: "this (?:does not|doesn['’]t) mean\\b[^.!?]{0,100}[.!?]\\s+it means" },
  ],
};
