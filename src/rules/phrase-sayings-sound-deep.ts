// phrase-sayings-sound-deep: A saying such as "at its core". These have honest uses, so the rule starts off.

import { SAYING } from "../lexicons/saying.ts";
import { lexiconRule } from "../tells.ts";
import { RULE } from "./types.ts";

export const phraseSayingsSoundDeep = lexiconRule({
  id: RULE.SAYING,
  category: "phrase",
  summary: "an ordinary point dressed as a hidden truth",
  defaultSeverity: "off",
  lexicon: SAYING,
  what: "saying that sounds deep",
  instruction: "Replace the saying with the specific claim.",
});
