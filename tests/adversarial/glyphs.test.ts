// punctuation-em-dash-in-prose and punctuation-interpunct-in-prose at the edges of what a punctuation swap can safely mean.

import { describe, expect, test } from "bun:test";
import { fixMarkdown } from "../../src/index.ts";
import { fixesTo, refuses } from "./harness.ts";

describe("punctuation-em-dash-in-prose refuses", () => {
  test.each([
    ["a tight numeric range", "From 2020—2021 only.\n"],
    ["three dashes in a sentence", "A — b — c — d.\n"],
    ["a single dash where a colon exists", "Note: this — that.\n"],
    ["a dash touching strong emphasis", "**Bold** — text.\n"],
    ["a dash touching a link", "[link](u) — text.\n"],
    ["a bare dash paragraph", "—\n"],
  ])("%s", async (_, src) => await refuses(src, "punctuation-em-dash-in-prose"));
});

describe("punctuation-em-dash-in-prose fixes", () => {
  test("a pair containing a conjunction keeps it", async () => {
    await fixesTo(
      "The parser — and the lexer — work.\n",
      "The parser (and the lexer) work.\n",
      "punctuation-em-dash-in-prose",
    );
  });

  test("a pair inside parentheses nests", async () => {
    await fixesTo(
      "The (parser — fast — ok) works.\n",
      "The (parser (fast) ok) works.\n",
      "punctuation-em-dash-in-prose",
    );
  });

  test("a pair after a colon is allowed", async () => {
    await fixesTo(
      "Note: the parser — fast — works.\n",
      "Note: the parser (fast) works.\n",
      "punctuation-em-dash-in-prose",
    );
  });

  test("a pair inside emphasis", async () => {
    await fixesTo("The _parser — fast_ works.\n", "The _parser: fast_ works.\n", "punctuation-em-dash-in-prose");
  });

  test("each sentence is judged on its own", async () => {
    await fixesTo("A — b. C — d.\n", "A: b.\nC: d.\n", "punctuation-em-dash-in-prose");
  });

  test("tight dash between words", async () => {
    await fixesTo("word—word here.\n", "word: word here.\n", "punctuation-em-dash-in-prose");
  });

  test("tabs around the dash collapse", async () => {
    await fixesTo("One thing matters\t—\tspeed.\n", "One thing matters: speed.\n", "punctuation-em-dash-in-prose");
  });

  test("setext and atx headings", async () => {
    await fixesTo(
      "Title — sub\n===========\n\nBody.\n",
      "Title: sub\n===========\n\nBody.\n",
      "punctuation-em-dash-in-prose",
    );
    await fixesTo("## Title — sub\n", "## Title: sub\n", "punctuation-em-dash-in-prose");
  });

  test("inline html around the dash", async () => {
    await fixesTo("Text <span>a — b</span> end.\n", "Text <span>a: b</span> end.\n", "punctuation-em-dash-in-prose");
  });

  // Regression: two dashes inside one emphasis node are treated as a pair spanning
  // the wrong slice, and the verifier catches the dropped word.
  // Actual: throws FixInvariantError (word 2 was "b", now "c").
  // Expected: "Stars *a (b) c* end." or a refusal.
  test("a pair wholly inside emphasis does not throw", async () => {
    await expect(fixMarkdown("Stars *a — b — c* end.\n")).resolves.toBeString();
  });

  // Regression: a spaced numeric range is read as a single aside.
  // Actual: "From 2020: 2021 only." Expected: refusal like the tight range.
  test("a spaced numeric range is refused", async () => {
    await refuses("From 2020 — 2021 only.\n", "punctuation-em-dash-in-prose");
  });

  // Regression: only [ \t] is collapsed, so a no-break or zero-width space before
  // the dash is left dangling before the colon.
  // Actual: "One\u00a0: \u00a0two." Expected: "One: two." or a refusal.
  test("unicode spaces around a dash do not strand the colon", async () => {
    expect(await fixMarkdown("One\u00a0—\u00a0two.\n")).not.toMatch(/[\s\u00a0\u200b]:/u);
    expect(await fixMarkdown("One \u200b— two.\n")).not.toMatch(/[\s\u00a0\u200b]:/u);
  });
});

describe("punctuation-interpunct-in-prose", () => {
  test("a tight interpunct is refused", async () => {
    await refuses("x·y is a product.\n", "punctuation-interpunct-in-prose");
  });

  test("a bare interpunct paragraph is refused", async () => {
    await refuses("·\n", "punctuation-interpunct-in-prose");
  });

  test("a single spaced interpunct becomes a comma", async () => {
    await fixesTo("Home · About\n", "Home, About\n", "punctuation-interpunct-in-prose");
  });

  test("a two-separator heading takes commas, not a list", async () => {
    await fixesTo("# Docs · API · Blog\n", "# Docs, API, Blog\n", "punctuation-interpunct-in-prose");
  });

  test("dash and interpunct in one sentence both swap", async () => {
    await fixesTo("Where x — y and a · b.\n", "Where x: y and a, b.\n");
  });

  // Regression: a backslash before the glyph is literal text (neither glyph is
  // escapable), and list-interpunct-joined-run treats "\·" as a separator, strips "or" as a
  // conjunction and leaves a lone backslash item.
  // Actual: "Not a \\:\n\n- dash\n- \\\n- here\n". Expected: "or" survives.
  test("a backslash before a glyph does not cost a word", async () => {
    expect(await fixMarkdown("Not a \\— dash · or \\· here.\n")).toContain("or");
  });
});
