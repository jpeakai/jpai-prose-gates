// phrase-vague-connection-link: "Associated with" and its kin. Technical writing uses them honestly, so the rule starts off.

import { VAGUE_LINK } from "../lexicons/vague-link.ts";
import { lexiconRule } from "../tells.ts";
import { RULE } from "./types.ts";

export const phraseVagueConnectionLink = lexiconRule({
  id: RULE.VAGUE_LINK,
  category: "phrase",
  summary: "two things said to be connected without saying how",
  defaultSeverity: "off",
  lexicon: VAGUE_LINK,
  what: "vague connection",
  instruction: "Name the relationship the source gives. If the source does not say, keep the vague wording.",
});
