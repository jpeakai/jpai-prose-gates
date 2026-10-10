// phrase-ai-overused-word: A word from a short list of words models overuse. Only forms with no ordinary use are listed.

import { AI_WORD } from "../lexicons/ai-word.ts";
import { lexiconRule } from "../tells.ts";
import { RULE } from "./types.ts";

export const phraseAiOverusedWord = lexiconRule({
  id: RULE.AI_WORD,
  category: "phrase",
  summary: "a word that models use far more often than people do",
  defaultSeverity: "warn",
  lexicon: AI_WORD,
  what: "word that models overuse",
  instruction: "Replace it with the plain word, or state the specific fact it stands in for.",
});
