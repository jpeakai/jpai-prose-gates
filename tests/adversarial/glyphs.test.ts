// PG004 and PG005 at the edges of what a punctuation swap can safely mean.

import { describe, expect, test } from "bun:test";
import { fixMarkdown } from "../../src/index.ts";
import { fixesTo, refuses } from "./harness.ts";

describe("PG004 refuses", () => {
  test.each([
    ["a tight numeric range", "From 2020—2021 only.\n"],
    ["three dashes in a sentence", "A — b — c — d.\n"],
    ["a single dash where a colon exists", "Note: this — that.\n"],
    ["a dash touching strong emphasis", "**Bold** — text.\n"],
    ["a dash touching a link", "[link](u) — text.\n"],
    ["a bare dash paragraph", "—\n"],
  ])("%s", (_, src) => refuses(src, "PG004"));
});

describe("PG004 fixes", () => {
  test("a pair containing a conjunction keeps it", () => {
    fixesTo("The parser — and the lexer — work.\n", "The parser (and the lexer) work.\n", "PG004");
  });

  test("a pair inside parentheses nests", () => {
    fixesTo("The (parser — fast — ok) works.\n", "The (parser (fast) ok) works.\n", "PG004");
  });

  test("a pair after a colon is allowed", () => {
    fixesTo("Note: the parser — fast — works.\n", "Note: the parser (fast) works.\n", "PG004");
  });

  test("a pair inside emphasis", () => {
    fixesTo("The _parser — fast_ works.\n", "The _parser: fast_ works.\n", "PG004");
  });

  test("each sentence is judged on its own", () => {
    fixesTo("A — b. C — d.\n", "A: b.\nC: d.\n", "PG004");
  });

  test("tight dash between words", () => {
    fixesTo("word—word here.\n", "word: word here.\n", "PG004");
  });

  test("tabs around the dash collapse", () => {
    fixesTo("One thing matters\t—\tspeed.\n", "One thing matters: speed.\n", "PG004");
  });

  test("setext and atx headings", () => {
    fixesTo("Title — sub\n===========\n\nBody.\n", "Title: sub\n===========\n\nBody.\n", "PG004");
    fixesTo("## Title — sub\n", "## Title: sub\n", "PG004");
  });

  test("inline html around the dash", () => {
    fixesTo("Text <span>a — b</span> end.\n", "Text <span>a: b</span> end.\n", "PG004");
  });

  // Regression: two dashes inside one emphasis node are treated as a pair spanning
  // the wrong slice, and the verifier catches the dropped word.
  // Actual: throws FixInvariantError (word 2 was "b", now "c").
  // Expected: "Stars *a (b) c* end." or a refusal.
  test("a pair wholly inside emphasis does not throw", () => {
    expect(() => fixMarkdown("Stars *a — b — c* end.\n")).not.toThrow();
  });

  // Regression: a spaced numeric range is read as a single aside.
  // Actual: "From 2020: 2021 only." Expected: refusal like the tight range.
  test("a spaced numeric range is refused", () => {
    refuses("From 2020 — 2021 only.\n", "PG004");
  });

  // Regression: only [ \t] is collapsed, so a no-break or zero-width space before
  // the dash is left dangling before the colon.
  // Actual: "One\u00a0: \u00a0two." Expected: "One: two." or a refusal.
  test("unicode spaces around a dash do not strand the colon", () => {
    expect(fixMarkdown("One\u00a0—\u00a0two.\n")).not.toMatch(/[\s\u00a0\u200b]:/u);
    expect(fixMarkdown("One \u200b— two.\n")).not.toMatch(/[\s\u00a0\u200b]:/u);
  });
});

describe("PG005", () => {
  test("a tight interpunct is refused", () => {
    refuses("x·y is a product.\n", "PG005");
  });

  test("a bare interpunct paragraph is refused", () => {
    refuses("·\n", "PG005");
  });

  test("a single spaced interpunct becomes a comma", () => {
    fixesTo("Home · About\n", "Home, About\n", "PG005");
  });

  test("a two-separator heading takes commas, not a list", () => {
    fixesTo("# Docs · API · Blog\n", "# Docs, API, Blog\n", "PG005");
  });

  test("dash and interpunct in one sentence both swap", () => {
    fixesTo("Where x — y and a · b.\n", "Where x: y and a, b.\n");
  });

  // Regression: a backslash before the glyph is literal text (neither glyph is
  // escapable), and PG006 treats "\·" as a separator, strips "or" as a
  // conjunction and leaves a lone backslash item.
  // Actual: "Not a \\:\n\n- dash\n- \\\n- here\n". Expected: "or" survives.
  test("a backslash before a glyph does not cost a word", () => {
    expect(fixMarkdown("Not a \\— dash · or \\· here.\n")).toContain("or");
  });
});
