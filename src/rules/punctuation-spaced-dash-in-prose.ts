// punctuation-spaced-dash-in-prose: A spaced en dash or double hyphen in prose. The em dash has its own rule and fixer.

import { SPACED_DASH } from "../lexicons/glyphs.ts";
import { lexiconRule } from "../tells.ts";
import { RULE } from "./types.ts";

export const punctuationSpacedDashInProse = lexiconRule({
  id: RULE.SPACED_DASH,
  category: "punctuation",
  summary: "a spaced en dash or double hyphen used as a dash",
  defaultSeverity: "warn",
  lexicon: SPACED_DASH,
  what: "dash used as a connector",
  instruction: "Use a period, a comma, a colon or parentheses, or rewrite the sentence.",
  scope: "texts",
});
