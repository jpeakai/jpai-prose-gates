// phrase-shallow-participle-rider: A comma followed by a participle such as "highlighting" or "reflecting".

import { RIDER } from "../lexicons/rider.ts";
import { lexiconRule } from "../tells.ts";
import { RULE } from "./types.ts";

export const phraseShallowParticipleRider = lexiconRule({
  id: RULE.RIDER,
  category: "phrase",
  summary: "a participle phrase bolted onto a fact to make it sound deeper",
  defaultSeverity: "warn",
  lexicon: RIDER,
  what: "participle rider",
  instruction: "Keep the fact. Drop the participle phrase unless the source supports what it claims.",
});
