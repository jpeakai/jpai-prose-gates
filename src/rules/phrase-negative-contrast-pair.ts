// phrase-negative-contrast-pair: A "not just X, it's Y" contrast, including one split across two sentences.

import { NEGATIVE_CONTRAST } from "../lexicons/negative-contrast.ts";
import { lexiconRule } from "../tells.ts";
import { RULE } from "./types.ts";

export const phraseNegativeContrastPair = lexiconRule({
  id: RULE.NEGATIVE_CONTRAST,
  category: "phrase",
  summary: 'a "not X but Y" contrast that names something nobody claimed',
  defaultSeverity: "warn",
  lexicon: NEGATIVE_CONTRAST,
  what: "negative contrast",
  instruction:
    "State the point directly. Keep a contrast only when the negative half corrects a belief the reader already holds.",
});
