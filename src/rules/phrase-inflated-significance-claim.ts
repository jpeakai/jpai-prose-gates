// phrase-inflated-significance-claim: A fact dressed as a pivotal moment, a legacy or a bright future.

import { INFLATED } from "../lexicons/inflated.ts";
import { lexiconRule } from "../tells.ts";
import { RULE } from "./types.ts";

export const phraseInflatedSignificanceClaim = lexiconRule({
  id: RULE.INFLATED,
  category: "phrase",
  summary: "an ordinary fact dressed as a turning point or a legacy",
  lexicon: INFLATED,
  what: "inflated significance",
  instruction: "Keep the fact and drop the claim that it matters. End on the last concrete fact.",
});
