// phrase-borrowed-authority-claim: A stock attribution such as "experts argue", with no one named.

import { AUTHORITY } from "../lexicons/authority.ts";
import { lexiconRule } from "../tells.ts";
import { RULE } from "./types.ts";

export const phraseBorrowedAuthorityClaim = lexiconRule({
  id: RULE.AUTHORITY,
  category: "phrase",
  summary: "an unnamed authority standing in for what was said",
  lexicon: AUTHORITY,
  what: "unnamed authority",
  instruction: "Name the source and what it said, or cut the claim.",
});
