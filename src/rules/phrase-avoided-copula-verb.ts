// phrase-avoided-copula-verb: "Serves as", "stands as" and their kin, where a plain verb is clearer.

import { COPULA } from "../lexicons/copula.ts";
import { lexiconRule } from "../tells.ts";
import { RULE } from "./types.ts";

export const phraseAvoidedCopulaVerb = lexiconRule({
  id: RULE.COPULA,
  category: "phrase",
  summary: 'a longer verb phrase where "is", "are" or "has" would do',
  defaultSeverity: "warn",
  lexicon: COPULA,
  what: "longer verb for is, are or has",
  instruction: 'Use "is", "are" or "has".',
});
