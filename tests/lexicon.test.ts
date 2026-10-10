// The lexicon engine matches plain text the same way every time: whole words, any case, any whitespace,
// either apostrophe. These tests run the real matcher over real strings.

import { describe, expect, test } from "bun:test";
import { type Lexicon, scan } from "../src/lexicon.ts";
import { AI_WORD } from "../src/lexicons/ai-word.ts";
import { CURLY_QUOTE, SPACED_DASH } from "../src/lexicons/glyphs.ts";
import { STAGED_RUN_UP } from "../src/lexicons/staged-run-up.ts";
import { RULES } from "../src/rules/index.ts";

const lex = (entries: Lexicon["entries"], boundary?: Lexicon["boundary"]): Lexicon => ({
  id: "test",
  reviewed: "2026-10-10",
  sources: ["test"],
  ...(boundary ? { boundary } : {}),
  entries,
});

describe("scan", () => {
  test("matches whole words only", () => {
    const l = lex([{ phrase: "key" }]);
    expect(scan(l, "The key role.").map((m) => m.text)).toEqual(["key"]);
    expect(scan(l, "A monkey, a keyboard and turkey_key.")).toEqual([]);
  });

  test("ignores case", () => {
    expect(scan(lex([{ phrase: "let's dive in" }]), "LET'S Dive In today.")).toHaveLength(1);
  });

  test("lets a run of whitespace stand for one space", () => {
    expect(scan(lex([{ phrase: "stands as a testament" }]), "It stands   as\ta testament.")).toHaveLength(1);
  });

  test("accepts a curly apostrophe for a straight one", () => {
    expect(scan(lex([{ phrase: "let's dive in" }]), "Let’s dive in.")).toHaveLength(1);
  });

  test("matches regular-expression characters in a phrase as themselves", () => {
    const l = lex([{ phrase: "a (b) c" }]);
    expect(scan(l, "x a (b) c y")).toHaveLength(1);
    expect(scan(l, "x a b c y")).toEqual([]);
  });

  test("runs a pattern entry inside the same word boundaries", () => {
    const l = lex([{ pattern: "delv(?:e|es|ed|ing)" }]);
    expect(scan(l, "We delve into it, then delved deeper.").map((m) => m.text)).toEqual(["delve", "delved"]);
    expect(scan(l, "Delvecchio is a name.")).toEqual([]);
  });

  test("reports in order, and the longer match when two start together", () => {
    const l = lex([{ phrase: "a testament" }, { phrase: "a testament to" }]);
    expect(scan(l, "It is a testament to care.").map((m) => m.text)).toEqual(["a testament to"]);
  });

  test("drops a match that overlaps an earlier one", () => {
    const l = lex([{ phrase: "very good" }, { phrase: "good idea" }]);
    expect(scan(l, "a very good idea").map((m) => m.text)).toEqual(["very good"]);
  });

  test("keeps the entry that matched, so a message can use its label", () => {
    const l = lex([{ phrase: "oaicite", label: "OpenAI citation marker" }]);
    expect(scan(l, "x oaicite y")[0]?.entry.label).toBe("OpenAI citation marker");
  });

  test("fails loudly on an entry with nothing to match", () => {
    expect(() => scan(lex([{ label: "empty" }]), "text")).toThrow(/needs a phrase or a pattern/);
  });

  test("is the same on every call, including after the compiled form is cached", () => {
    const first = scan(STAGED_RUN_UP, "Let's dive in. Here's the thing.");
    const second = scan(STAGED_RUN_UP, "Let's dive in. Here's the thing.");
    expect(second).toEqual(first);
    expect(first).toHaveLength(2);
  });

  test("bounds nothing for a glyph list", () => {
    expect(scan(SPACED_DASH, "one – two -- three")).toHaveLength(2);
    expect(scan(SPACED_DASH, "pages 3–5 and --flag")).toEqual([]);
    expect(scan(CURLY_QUOTE, "He said “stop”.")).toHaveLength(2);
  });
});

describe("the shipped lexicons", () => {
  test("every rule that reads a lexicon names a reviewed date and its sources", async () => {
    const lexicons = await Promise.all(
      [
        "ai-word",
        "arguing",
        "authority",
        "chatbot-wrapper",
        "copula",
        "glyphs",
        "inflated",
        "negative-contrast",
        "placeholder",
        "rider",
        "sales",
        "saying",
        "self-reference",
        "staged-run-up",
        "stock-closer",
        "tool-markup",
        "vague-link",
      ].map(async (name) => Object.values(await import(`../src/lexicons/${name}.ts`)) as Lexicon[]),
    );
    const all = lexicons.flat();
    expect(all.length).toBeGreaterThanOrEqual(17);
    for (const l of all) {
      expect(l.reviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(l.sources.length).toBeGreaterThan(0);
      expect(l.entries.length).toBeGreaterThan(0);
    }
  });

  test("an ambiguous word stays out of the AI word list", () => {
    for (const word of ["key", "gate", "robust", "highlight", "landscape", "vibrant", "crucial"]) {
      expect(scan(AI_WORD, `A ${word} thing.`)).toEqual([]);
    }
  });

  test("the catalogue has no two rules with one id", () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
