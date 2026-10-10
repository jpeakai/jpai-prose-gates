// Words that models use far more often than people do. Only forms with no ordinary use are listed,
// because an ambiguous word such as "key" or "gate" fires on plain technical prose and cannot be told
// apart without reading meaning (measured on this repo's own docs). The list ages quickly, since word
// habits change with each model release, so each review is dated.

import type { Lexicon } from "../lexicon.ts";

export const AI_WORD: Lexicon = {
  id: "ai-word",
  reviewed: "2026-10-10",
  sources: [
    "Wikipedia: Signs of AI writing, high density of AI vocabulary words",
    "blader/humanizer 3.1.0 (MIT), pattern 12",
  ],
  entries: [
    { pattern: "delv(?:e|es|ed|ing)" },
    { phrase: "tapestry" },
    { pattern: "meticulous(?:ly)?" },
    { phrase: "intricacies" },
    { phrase: "interplay" },
    { phrase: "bolstered" },
    { phrase: "pivotal" },
    { pattern: "garner(?:s|ed|ing)?" },
    { pattern: "underscor(?:es|ed|ing) (?:the|its|their|how|that|a|an)" },
    { phrase: "evolving landscape" },
  ],
};
