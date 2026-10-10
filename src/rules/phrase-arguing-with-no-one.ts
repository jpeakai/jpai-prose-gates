// phrase-arguing-with-no-one: A defence against an objection that appears nowhere else, such as "To be clear" or "I'm not saying".

import { ARGUING } from "../lexicons/arguing.ts";
import { lexiconRule } from "../tells.ts";
import { RULE } from "./types.ts";

export const phraseArguingWithNoOne = lexiconRule({
  id: RULE.ARGUING,
  category: "phrase",
  summary: "a reply to an objection nobody raised",
  defaultSeverity: "off",
  lexicon: ARGUING,
  what: "objection nobody raised",
  instruction: "Remove the defence. If it holds a real claim, state the claim.",
});
