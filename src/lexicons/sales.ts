// Language that reads as an advertisement, usually about a place or an organisation (humanizer pattern
// 16). A product README may use some of it on purpose, and a project that does turns the rule off.

import type { Lexicon } from "../lexicon.ts";

export const SALES: Lexicon = {
  id: "sales",
  reviewed: "2026-10-10",
  sources: ["blader/humanizer 3.1.0 (MIT), pattern 16", "Wikipedia: Signs of AI writing, promotional language"],
  entries: [
    { pattern: "nestled (?:in|within|among|between|at)" },
    { phrase: "breathtaking" },
    { phrase: "must-visit" },
    { phrase: "stunning" },
    { phrase: "renowned for" },
    { phrase: "diverse array" },
    { phrase: "rich cultural heritage" },
    { phrase: "in the heart of" },
    { pattern: "boasts (?:a|an|over|more than)" },
  ],
};
