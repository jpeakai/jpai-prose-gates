// residue-unfilled-placeholder-text: A fill-in-the-blank left blank, such as [Your Name] or Lorem ipsum.
// A template document holds placeholders on purpose, so the rule starts off.

import { PLACEHOLDER } from "../lexicons/placeholder.ts";
import { lexiconRule } from "../tells.ts";
import { RULE } from "./types.ts";

export const residueUnfilledPlaceholderText = lexiconRule({
  id: RULE.PLACEHOLDER,
  category: "residue",
  summary: "a placeholder that was never filled in",
  defaultSeverity: "off",
  lexicon: PLACEHOLDER,
  what: "unfilled placeholder",
  instruction: "Fill it in with the real value, or delete the line.",
});
