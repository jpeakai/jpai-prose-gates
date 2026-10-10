// A fill-in-the-blank that was never filled in. The bracket forms are narrow on purpose, because a
// template document holds placeholders on purpose, and an angle-bracket form such as <topic> is how
// this repo's own docs write one.

import type { Lexicon } from "../lexicon.ts";

export const PLACEHOLDER: Lexicon = {
  id: "placeholder",
  reviewed: "2026-10-10",
  sources: [
    "Wikipedia: Signs of AI writing, phrasal templates and placeholder text",
    "slopless artifact rule (ideas only)",
  ],
  entries: [
    {
      pattern:
        "\\[(?:your|insert|add your|describe|enter your|link to|company name|name of|specific topic)\\b[^\\]\\n]{0,70}\\]",
    },
    { pattern: "\\((?:add|insert|enter) your [^)\\n]{0,60}\\)" },
    { pattern: "\\[(?:placeholder|insert text|citation needed)\\]" },
    { pattern: "\\d{4}-xx-xx", label: "date placeholder" },
    { phrase: "Lorem ipsum" },
  ],
};
