// phrase-document-self-reference: A sentence about the document's own sourcing, assembly or layout. The rule starts off.

import { SELF_REFERENCE } from "../lexicons/self-reference.ts";
import { lexiconRule } from "../tells.ts";
import { RULE } from "./types.ts";

export const phraseDocumentSelfReference = lexiconRule({
  id: RULE.SELF_REFERENCE,
  category: "phrase",
  summary: "text about the document instead of its subject",
  defaultSeverity: "off",
  lexicon: SELF_REFERENCE,
  what: "text about the document",
  instruction:
    "Describe the subject instead of the document. Say how it was assembled only when the reader can act on that.",
});
