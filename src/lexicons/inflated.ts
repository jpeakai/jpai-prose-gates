// An ordinary fact dressed as a turning point or a legacy (humanizer pattern 13). The fact underneath
// is usually sound, so the advice is to keep it and drop the dressing.

import type { Lexicon } from "../lexicon.ts";

export const INFLATED: Lexicon = {
  id: "inflated",
  reviewed: "2026-10-10",
  sources: [
    "blader/humanizer 3.1.0 (MIT), pattern 13",
    "Wikipedia: Signs of AI writing, undue emphasis on significance",
  ],
  entries: [
    { pattern: "(?:stands?|serves?|served) as a testament" },
    { phrase: "a testament to" },
    { pattern: "marking a (?:pivotal|crucial|key) moment" },
    { pattern: "a (?:pivotal|crucial) moment in" },
    { pattern: "plays? an? (?:pivotal|crucial|vital) role" },
    { pattern: "underscores? (?:its|their|the) importance" },
    { pattern: "(?:leaves?|left|leaving) an indelible mark" },
    { pattern: "(?:enduring|lasting) legacy" },
    { phrase: "setting the stage for" },
    { phrase: "the future looks bright" },
    { pattern: "exciting times (?:lie )?ahead" },
    { phrase: "continues to thrive" },
    { phrase: "despite these challenges" },
  ],
};
