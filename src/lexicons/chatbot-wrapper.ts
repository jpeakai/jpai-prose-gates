// The greeting, praise, offer or sign-off a chat reply wraps around its content, and the notes a model
// writes about where its own knowledge ends. Each is a sentence a writer would not put in a document,
// so a match means the wrapper was pasted in with the content (humanizer patterns 22 and 23).

import type { Lexicon } from "../lexicon.ts";

export const CHATBOT_WRAPPER: Lexicon = {
  id: "chatbot-wrapper",
  reviewed: "2026-10-10",
  sources: [
    "blader/humanizer 3.1.0 (MIT), patterns 22 and 23",
    "Wikipedia: Signs of AI writing, collaborative communication",
  ],
  entries: [
    { phrase: "I hope this helps" },
    { phrase: "I hope that helps" },
    { phrase: "Great question" },
    { phrase: "Excellent question" },
    { phrase: "Certainly!" },
    { phrase: "Of course!" },
    { phrase: "You're absolutely right" },
    { phrase: "You are absolutely right" },
    { phrase: "Would you like me to" },
    { phrase: "Want me to" },
    { phrase: "Let me know if you'd like" },
    { phrase: "Let me know if you need" },
    { phrase: "Let me know if you have any" },
    { phrase: "Is there anything else" },
    { phrase: "Feel free to ask" },
    { phrase: "I'd be happy to" },
    { phrase: "As an AI language model" },
    { phrase: "As a large language model" },
    {
      pattern:
        "(?:here is|here's) an? (?:revised|rewritten|updated|brief overview|detailed breakdown|summary of|overview of)",
    },
    {
      pattern:
        "(?:as of|up to) my (?:last |latest )?(?:knowledge cutoff|training (?:update|data|cutoff)|knowledge update)",
      label: "knowledge-limit note",
      instruction: "Delete the note. State what the source shows, or say the source does not cover it.",
    },
    {
      phrase: "not extensively documented in readily available sources",
      label: "knowledge-limit note",
      instruction: "Delete the note. State what the source shows, or say the source does not cover it.",
    },
    {
      phrase: "while specific details are limited",
      label: "knowledge-limit note",
      instruction: "Delete the note. State what the source shows, or say the source does not cover it.",
    },
    {
      pattern: "I (?:do not|don't) have (?:access to )?(?:real-time|current|up-to-date)",
      label: "knowledge-limit note",
      instruction: "Delete the note. State what the source shows, or say the source does not cover it.",
    },
  ],
};
