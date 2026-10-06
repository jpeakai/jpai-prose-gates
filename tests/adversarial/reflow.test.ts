// sentence-one-per-line against line starts that would become block syntax, inline
// constructs spanning the break, and line-ending encodings.

import { describe, expect, test } from "bun:test";
import { fixMarkdown } from "../../src/index.ts";
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

describe("unicode", () => {
  test.each([
    ["cjk", "中文句子 — 很好。\n", "中文句子: 很好。\n"],
    ["rtl", "שלום — עולם.\n", "שלום: עולם.\n"],
    ["emoji zwj", "Family 👨‍👩‍👧 — emoji.\n", "Family 👨‍👩‍👧: emoji.\n"],
  ])("%s dash", async (_, src, out) => await fixesTo(src, out, "punctuation-em-dash-in-prose"));
});
