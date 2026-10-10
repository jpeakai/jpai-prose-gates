// residue-chatbot-wrapper-phrase: A sentence a chat reply wraps around its content, or a note about where a model's knowledge ends.
// It reports only, because deleting a sentence changes the words.

import { CHATBOT_WRAPPER } from "../lexicons/chatbot-wrapper.ts";
import { lexiconRule } from "../tells.ts";
import { RULE } from "./types.ts";

export const residueChatbotWrapperPhrase = lexiconRule({
  id: RULE.CHATBOT_WRAPPER,
  category: "residue",
  summary: "a chat greeting, offer or knowledge note left in the text",
  defaultSeverity: "warn",
  lexicon: CHATBOT_WRAPPER,
  what: "chat wrapper left in the text",
  instruction: "Delete the wrapper sentence and keep the content it introduced.",
});
