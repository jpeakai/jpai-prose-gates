// punctuation-curly-quote-in-prose: A curly double quote. Editors curl quotes on their own, so this is weak evidence and the rule starts off.

import { CURLY_QUOTE } from "../lexicons/glyphs.ts";
import { lexiconRule } from "../tells.ts";
import { RULE } from "./types.ts";

export const punctuationCurlyQuoteInProse = lexiconRule({
  id: RULE.CURLY_QUOTE,
  category: "punctuation",
  summary: "a curly double quote where a straight one is expected",
  defaultSeverity: "off",
  lexicon: CURLY_QUOTE,
  what: "curly double quote",
  instruction: "Use a straight double quote, to match the rest of the document.",
  scope: "texts",
});
