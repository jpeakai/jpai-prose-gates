// Markup a chat tool leaves behind when its output is pasted as text: citation objects, tracking
// parameters and wrapper tags. Each form is a string no person types, so a match is a certainty that
// text was copied out of a tool, which is why this is the one tell rule that fails the run by default.
// The list follows the vendor sections of Wikipedia's "Signs of AI writing", in our own wording.

import type { Lexicon } from "../lexicon.ts";

export const TOOL_MARKUP: Lexicon = {
  id: "tool-markup",
  reviewed: "2026-10-10",
  boundary: "none",
  sources: [
    "Wikipedia: Signs of AI writing, internal formatting and reference markup bugs",
    "slopless artifact rule (ideas only)",
  ],
  entries: [
    { pattern: "(?::)?contentReference\\[oaicite:\\d+\\](?:\\{index=\\d+\\})?", label: "OpenAI citation marker" },
    { pattern: "\\boaicite:\\d+", label: "OpenAI citation marker" },
    { pattern: "\\boai_citation(?::\\d+)?", label: "OpenAI citation marker" },
    { pattern: "\\bturn\\d+(?:search|image|news|file|view|product)\\d+", label: "OpenAI search reference" },
    { pattern: "attributableIndex", label: "OpenAI attribution data" },
    { phrase: "sandbox:/mnt/data/", label: "OpenAI sandbox path" },
    { phrase: "utm_source=chatgpt.com", label: "ChatGPT tracking parameter" },
    { phrase: "utm_source=openai", label: "OpenAI tracking parameter" },
    { phrase: "utm_source=copilot.com", label: "Copilot tracking parameter" },
    { phrase: "referrer=grok.com", label: "Grok tracking parameter" },
    { pattern: "\\[cite:\\s*\\d+(?:,\\s*\\d+)*\\]", label: "Gemini citation marker" },
    { pattern: "\\b(?:start|end)_span\\b", label: "Gemini span marker" },
    { phrase: "grok_card", label: "Grok card marker" },
    { phrase: "grok-card", label: "Grok card tag" },
    { phrase: "grok_render_citation_card_json", label: "Grok citation card" },
    { pattern: "【\\d+†[^】\\n]{0,40}】", label: "DeepSeek citation marker" },
    { pattern: "\\[(?:attached_file|web):\\d+\\]", label: "Perplexity source marker" },
    { phrase: "ppl-ai-file-upload", label: "Perplexity upload path" },
    { pattern: ":::\\s*writing\\{[^}\\n]*\\}", label: "chat writing wrapper" },
  ],
};
