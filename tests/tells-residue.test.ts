// The residue rules: text left over from a chat or a draft. The tool-markup strings are the forms
// Wikipedia's field guide records for each vendor, so these tests run real strings through the real rule.

import { describe, expect, test } from "bun:test";
import { checkMarkdown } from "../src/index.ts";
import { BUILTIN } from "../src/rules/registry.ts";
import { tell, tellsOn } from "./helpers.ts";

const MARKUP = "residue-tool-markup-artifact";
const WRAPPER = "residue-chatbot-wrapper-phrase";
const PLACEHOLDER = "residue-unfilled-placeholder-text";

describe(MARKUP, () => {
  test("is the one tell rule that fails the run by default", () => {
    expect(BUILTIN.levels.get(MARKUP as never)).toBe("error");
    expect(BUILTIN.levels.get(WRAPPER as never)).toBe("warn");
  });

  test.each([
    ["OpenAI citation object", "Sial are Rajputs :contentReference[oaicite:20]{index=20}.\n"],
    ["OpenAI citation marker alone", "Sial are Rajputs [oaicite:3].\n"],
    ["OpenAI search reference", "The school offers the SAT. turn0search1\n"],
    ["OpenAI citation with a number", "Patrick Denice [oai_citation:0‡IMDb] wrote it.\n"],
    ["OpenAI attribution data", 'Born in 1939. ({"attribution":{"attributableIndex":"1009-1"}})\n'],
    ["OpenAI sandbox path", "Download it from sandbox:/mnt/data/report.csv today.\n"],
    ["Gemini citation marker", "Maloo founded Kreative Machinez in February 2010 [cite: 17].\n"],
    ["Gemini several citations", "It employs over 100 people [cite: 19, 20, 21].\n"],
    ["Perplexity source marker", "His reputation was debated [attached_file:1].\n"],
    ["Perplexity web marker", "It is sold worldwide [web:2].\n"],
    ["Perplexity upload path", "See ppl-ai-file-upload for the original.\n"],
    ["Grok card text", "A piston-engine UAV. grok_render_citation_card_json for sources.\n"],
    ["DeepSeek citation marker", "Vacancy was 6.2 percent【85†L261-269】.\n"],
    ["chat writing wrapper", ':::writing{variant="document" id="68427"}\n'],
  ])("reports %s", async (_name, src) => {
    const found = await tell(src, MARKUP);
    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe("error");
  });

  test("reads the address of a link, where a tracking parameter lives", async () => {
    const src = "See [the report](https://wellington.scoop.co.nz/?p=171473&utm_source=chatgpt.com) for more.\n";
    const [finding] = await tell(src, MARKUP);
    expect(finding?.message).toContain("ChatGPT tracking parameter");
    expect(finding?.evidence).toBe("utm_source=chatgpt.com");
  });

  test.each([
    ["utm_source=openai", "[a](https://example.com/?utm_source=openai)\n"],
    ["utm_source=copilot.com", "[a](https://example.com/?utm_source=copilot.com)\n"],
    ["referrer=grok.com", "[a](https://example.com/?referrer=grok.com)\n"],
  ])("reports a %s address", async (_name, src) => {
    expect(await tell(src, MARKUP)).toHaveLength(1);
  });

  test("reads an image address and its alt text", async () => {
    expect(await tell("![chart](https://example.com/c.png?utm_source=chatgpt.com)\n", MARKUP)).toHaveLength(1);
  });

  test("reads a Gemini span marker, which markdown parses as a link", async () => {
    expect(await tell("The album [span_2](start_span)topped the chart[span_2](end_span).\n", MARKUP)).toHaveLength(2);
  });

  test("reads raw html such as a Grok card tag", async () => {
    expect(
      await tell('Facts here.\n\n<grok-card data-id="e8ff4f" data-type="citation_card"></grok-card>\n', MARKUP),
    ).toHaveLength(1);
  });

  test("reports each marker once, even when a link shows its own address as its text", async () => {
    const found = await tell("<https://example.com/?utm_source=chatgpt.com>\n", MARKUP);
    expect(found).toHaveLength(1);
  });

  test("gives the line of a marker inside a paragraph that wraps", async () => {
    const [finding] = await tell("A first line.\nA second line.\nA marker here [cite: 4].\n", MARKUP);
    expect(finding?.line).toBe(3);
  });

  test.each([
    ["inline code", "Strip `utm_source=chatgpt.com` from links.\n"],
    ["a fenced code block", "```text\n:contentReference[oaicite:0]{index=0}\n```\n"],
    ["a quotation", "> Sial are Rajputs [oaicite:3].\n"],
    ["a similar word", "Do not turn0 the search over, and utm_source=newsletter is fine.\n"],
  ])("leaves %s alone", async (_name, src) => {
    expect(await tell(src, MARKUP)).toEqual([]);
  });

  test("checks a markdown fence as a document of its own", async () => {
    expect(await tell("```markdown\nA claim [cite: 4].\n```\n", MARKUP)).toHaveLength(1);
  });

  test("never edits, so --fix leaves the document alone", async () => {
    const { fixMarkdown } = await import("../src/index.ts");
    const src = "A claim [cite: 4].\n";
    expect(await fixMarkdown(src, tellsOn())).toBe(src);
  });

  test("writes the finding as an instruction with the parts apart", async () => {
    const [finding] = await tell("A claim [cite: 4].\n", MARKUP);
    expect(finding?.message).toBe(
      'tool markup left in the text (Gemini citation marker): "[cite: 4]". Delete the marker. If the claim needs a source, add a real citation.',
    );
    expect(finding?.instruction).toBe("Delete the marker. If the claim needs a source, add a real citation.");
    expect(finding?.preserve).toBe("The sentence the marker was attached to.");
  });

  test("fails a plain run, because it is on by default", async () => {
    const found = await checkMarkdown("A claim [cite: 4].\n", "doc.md");
    expect(found.map((f) => [f.rule, f.severity])).toEqual([[MARKUP, "error"]]);
  });
});

describe(WRAPPER, () => {
  test.each([
    "Great question! Here is an overview of the French Revolution.",
    "It began in 1789. I hope this helps!",
    "Certainly! The report is attached.",
    "Of course! Here is the summary.",
    "You're absolutely right, and I apologise.",
    "Would you like me to expand on any section?",
    "Let me know if you'd like a shorter version.",
    "Is there anything else you need?",
    "As an AI language model, I cannot verify this.",
    "Here is a revised version of the paragraph.",
  ])("reports %s", async (sentence) => {
    expect((await tell(`${sentence}\n`, WRAPPER)).length).toBeGreaterThan(0);
  });

  test.each([
    ["as of my last training update, the company had 50 staff.", "knowledge-limit note"],
    ["While specific details are limited, it appears to date from the 1990s.", "knowledge-limit note"],
    ["It is not extensively documented in readily available sources.", "knowledge-limit note"],
    ["I don't have access to real-time data.", "knowledge-limit note"],
  ])("calls a knowledge note by its name: %s", async (sentence, label) => {
    const [finding] = await tell(`${sentence}\n`, WRAPPER);
    expect(finding?.message).toContain(label);
    expect(finding?.instruction).toContain("State what the source shows");
  });

  test("accepts a curly apostrophe", async () => {
    expect(await tell("You’re absolutely right.\n", WRAPPER)).toHaveLength(1);
  });

  test("says what to do with the sentence", async () => {
    const [finding] = await tell("I hope this helps!\n", WRAPPER);
    expect(finding?.message).toBe(
      'chat wrapper left in the text: "I hope this helps". Delete the wrapper sentence and keep the content it introduced.',
    );
  });

  test.each([
    ["a quotation of the phrase", "> Great question! Here is an overview.\n"],
    ["code", "Run `I hope this helps` as a test string.\n"],
    ["ordinary prose", "The question was great, and certainly the answer was long.\n"],
    ["a table cell", "| Reply |\n|---|\n| Great question! |\n"],
  ])("leaves %s alone", async (_name, src) => {
    expect(await tell(src, WRAPPER)).toEqual([]);
  });
});

describe(PLACEHOLDER, () => {
  test.each([
    ["a bracketed name", "Best regards, [Your Name]\n"],
    ["a bracketed instruction", "[Describe the specific section that needs editing]\n"],
    ["a bracketed link", "Please find our article [link to the revised article].\n"],
    ["an add-your hint", "Official channel: (Add your channel URL here)\n"],
    ["an insert marker", "[INSERT TEXT] goes here.\n"],
    ["a date placeholder", "Accessed 2025-xx-xx.\n"],
    ["a filler text", "Lorem ipsum dolor sit amet.\n"],
  ])("reports %s", async (_name, src) => {
    expect(await tell(src, PLACEHOLDER)).toHaveLength(1);
  });

  test.each([
    ["an angle-bracket template", "Run `git switch -c <short-topic>` first.\n"],
    ["an ordinary link", "See [the guide](https://example.com/guide).\n"],
    ["a footnote-style bracket", "It is long [1] and short [2].\n"],
    ["a quotation", "> [Your Name]\n"],
  ])("leaves %s alone", async (_name, src) => {
    expect(await tell(src, PLACEHOLDER)).toEqual([]);
  });
});
