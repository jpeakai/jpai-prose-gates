// Two glyph lists for the punctuation tells. They bound nothing, because a glyph has no word around it.

import type { Lexicon } from "../lexicon.ts";

// A dash set apart by spaces. An en dash or a double hyphen inside a number range or a flag has no
// space on both sides, so it never matches. The em dash has its own rule and its own fixer.
export const SPACED_DASH: Lexicon = {
  id: "spaced-dash",
  reviewed: "2026-10-10",
  sources: ["blader/humanizer 3.1.0 (MIT), pattern 8", "Wikipedia: Signs of AI writing, overuse of dashes"],
  boundary: "none",
  entries: [{ pattern: "(?<=\\s)(?:–|--)(?=\\s)", label: "spaced en dash or double hyphen" }],
};

// A curly double quote where a straight one is expected. Most editors curl quotes on their own, so this
// is weak evidence and the rule starts off.
export const CURLY_QUOTE: Lexicon = {
  id: "curly-quote",
  reviewed: "2026-10-10",
  sources: ["blader/humanizer 3.1.0 (MIT), pattern 21", "Wikipedia: Signs of AI writing, curly quotation marks"],
  boundary: "none",
  entries: [{ pattern: "[“”]", label: "curly double quote" }],
};
