// phrase-sales-language-claim: Advertising language such as "nestled in" or "breathtaking".

import { SALES } from "../lexicons/sales.ts";
import { lexiconRule } from "../tells.ts";
import { RULE } from "./types.ts";

export const phraseSalesLanguageClaim = lexiconRule({
  id: RULE.SALES,
  category: "phrase",
  summary: "language that reads as an advertisement",
  lexicon: SALES,
  what: "sales language",
  instruction: "State what the thing is, without the adjective.",
});
