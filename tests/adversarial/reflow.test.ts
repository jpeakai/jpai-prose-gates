// sentence-one-per-line against line starts that would become block syntax, inline
// constructs spanning the break, and line-ending encodings.

import { describe, expect, test } from "bun:test";
import { checkMarkdown, fixMarkdown } from "../../src/index.ts";
import { fixesTo, refuses } from "./harness.ts";

describe("sentence-one-per-line leaves block syntax alone", () => {
  test.each([
    ["an ordered-list-looking line", "Intro line\n1. not a list\n"],
    ["a plus-list line", "Text here\n+ item\n"],
    ["a quote line", "Text here\n> quote\n"],
    ["a setext underline", "Text here\n---\n"],
    ["an atx heading line", "Text here\n# not heading?\n"],
    ["a table delimiter", "Text | here\n--- | ---\n"],
    ["a wrapped setext heading", "A title that\nwraps\n=====\n"],
  ])("%s", async (_, src) => await refuses(src));
});

describe("sentence-one-per-line joins across inline constructs", () => {
  test("link text", async () => {
    await fixesTo(
      "See [a wrapped\nlink text](u) now.\n",
      "See [a wrapped link text](u) now.\n",
      "sentence-one-per-line",
    );
  });

  test("inline html", async () => {
    await fixesTo("Text <b>bold\ntext</b> more.\n", "Text <b>bold text</b> more.\n", "sentence-one-per-line");
  });

  test("an abbreviation at the line end", async () => {
    await fixesTo("Use e.g.\nthis one.\n", "Use e.g. this one.\n", "sentence-one-per-line");
  });

  test("a forty-line wrap collapses to one line and sentence-word-budget-exceeded remains", async () => {
    const words = Array.from({ length: 40 }, (_, i) => `w${i}`);
    await fixesTo(`${words.join("\n")}.\n`, `${words.join(" ")}.\n`, "sentence-one-per-line");
  });

  // Regression: the join replaces "\n" and leaves the "\r" of a CRLF ending, which
  // is itself a line ending, so the paragraph is still wrapped (now with a
  // bare CR). Actual: "A wrapped sentence goes\r onward here.\r\n".
  // Expected: "A wrapped sentence goes onward here.\r\n" or a refusal.
  test("CRLF wraps do not leave a bare CR", async () => {
    expect(await fixMarkdown("A wrapped sentence goes\r\nonward here.\r\n")).not.toContain("\r ");
  });

  test("CRLF glyph swaps keep the line ending", async () => {
    await fixesTo("One thing matters — speed.\r\n", "One thing matters: speed.\r\n", "punctuation-em-dash-in-prose");
  });
});

// Regression: the check looked only for a break inside a sentence, while the
// fixer splits every sentence onto its own line. A paragraph with several
// sentences on one line passed the check and was rewritten by --fix. Found in
// a live eval, where gpt-6-luna packed three sentences on one line.
describe("sentence-one-per-line reports exactly what its fixer changes", () => {
  const LUNA =
    "The maintainers test it on macOS, Linux and Windows, under Bun and Node. They test the lowest and latest supported versions of each runtime. They run these tests before every release that the Publish workflow builds from main.\n";

  test("several sentences on one line are reported, and the fix splits them", async () => {
    const findings = await checkMarkdown(`# T\n\n${LUNA}`, "doc.md");
    expect(findings.map((f) => [f.rule, f.line, f.message])).toEqual([
      ["sentence-one-per-line", 3, "several sentences on one line; write one sentence per line"],
    ]);
    await fixesTo(LUNA, `${LUNA.replace(/\. (?=They)/g, ".\n")}`, "sentence-one-per-line");
  });

  // A refusal (a hard break, a blockquote) still reports, so a finding may stay
  // for a human, but the fixer never changes a paragraph the check passed.
  test.each([
    ["two sentences on one line", "First one. Second one.\n", true],
    ["a wrap and a packed line together", "One wraps\nhere. Two sit here.\n", true],
    ["a question then a statement", "Is it done? It is.\n", true],
    ["two sentences inside link text", "See [step one. Step two](u) now.\n", true],
    ["a hard break, which the fixer refuses", "First one.  \nSecond one. Third one.\n", true],
    ["a blockquote, which the fixer refuses", "> First one. Second one.\n", true],
    ["one sentence per line", "First one.\nSecond one.\n", false],
    ["an abbreviation before lower case", "Use e.g. this one.\n", false],
    ["a terminal inside a code span", "Run `a. B` now.\n", false],
  ])("%s", async (_, src, expected) => {
    const reported = (await checkMarkdown(src, "doc.md")).some((f) => f.rule === "sentence-one-per-line");
    expect(reported).toBe(expected);
    if ((await fixMarkdown(src)) !== src) expect(reported).toBe(true);
  });
});

describe("unicode", () => {
  test.each([
    ["cjk", "中文句子 — 很好。\n", "中文句子: 很好。\n"],
    ["rtl", "שלום — עולם.\n", "שלום: עולם.\n"],
    ["emoji zwj", "Family 👨‍👩‍👧 — emoji.\n", "Family 👨‍👩‍👧: emoji.\n"],
  ])("%s dash", async (_, src, out) => await fixesTo(src, out, "punctuation-em-dash-in-prose"));
});
