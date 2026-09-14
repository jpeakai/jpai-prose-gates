// Constructs the fixers must see through or stay out of: code, HTML,
// frontmatter, blockquotes, tables, footnotes and indented code.

import { describe, test } from "bun:test";
import { fixesTo, refuses } from "./harness.ts";

describe("code is never rewritten", () => {
  test.each([
    ["inline code with a dash", "Use `a — b` here.\n"],
    ["inline code with semicolons", "Run `a;b;c` then `d;e`.\n"],
    ["inline code with markers", "Call `(a)` then `(b)` and `(c)`.\n"],
    ["indented code with every glyph", "Para.\n\n    code — here · there; a; b\n"],
    ["fenced code with every glyph", "Para.\n\n```\na — b · c; d; e (a) x (b) y\n```\n"],
    ["html block", "<div>\na — b · c · d\n</div>\n"],
    ["frontmatter values", "---\ntitle: a — b\ntags: x · y\n---\n\nBody.\n"],
    ["image alt text", "![a — b](x.png) text.\n"],
  ])("%s", (_, src) => refuses(src));

  test("a separator inside a code span travels whole into its item", () => {
    fixesTo("Tools: `a · b` · c · d.\n", "Tools:\n\n- `a · b`\n- c\n- d\n", "PG006");
  });

  test("a url containing a dash is left alone while the link text is fixed", () => {
    fixesTo("See [a — b](https://x.example/a—b) now.\n", "See [a: b](https://x.example/a—b) now.\n", "PG004");
  });

  test("a separator inside link text blocks the run", () => {
    refuses("Links: [a · b](u) · c · d.\n", "PG006");
  });

  test("an interpunct in an autolink url is not touched", () => {
    refuses("Go <https://x.example/a·b> now.\n");
  });

  test("entities are reported but never decoded", () => {
    refuses("An &mdash; entity &middot; here.\n", "PG004");
  });
});

describe("block containers", () => {
  test("a wrap inside a blockquote is refused", () => {
    refuses("> A wrapped sentence goes\n> onward here.\n", "PG001");
  });

  test("a lazy continuation line is refused", () => {
    refuses("> Quote starts here and\ncontinues lazily.\n", "PG001");
  });

  test("glyph swaps inside a blockquote keep the quote", () => {
    fixesTo("> The parser — which is fast — handles this.\n", "> The parser (which is fast) handles this.\n", "PG004");
  });

  test("table cells take glyph swaps without breaking the table", () => {
    fixesTo("| a | b |\n| - | - |\n| x — y | p · q |\n", "| a | b |\n| - | - |\n| x: y | p, q |\n");
  });

  test("footnote definitions take glyph swaps", () => {
    fixesTo("Text[^1] here.\n\n[^1]: A note — with a dash.\n", "Text[^1] here.\n\n[^1]: A note: with a dash.\n");
  });

  test("a footnote reference travels with its item", () => {
    fixesTo("Needs: a[^1]; b; c.\n\n[^1]: n.\n", "Needs:\n\n- a[^1]\n- b\n- c\n\n[^1]: n.\n", "PG003");
  });

  test("a reference link keeps resolving after promotion", () => {
    fixesTo(
      "Items: [a] · b · c.\n\n[a]: https://x.example 'T — t'\n",
      "Items:\n\n- [a]\n- b\n- c\n\n[a]: https://x.example 'T — t'\n",
      "PG006",
    );
  });

  test("a run in a list item's second paragraph is refused", () => {
    fixesTo(
      "- Item one — first.\n\n  Second para · x · y.\n- two\n",
      "- Item one: first.\n\n  Second para · x · y.\n- two\n",
    );
  });

  test("a labelled run inside a list item nests", () => {
    fixesTo(
      "- Rules: `A` wraps, `B` counts, `C` finds.\n",
      "- Rules:\n  - `A` wraps\n  - `B` counts\n  - `C` finds\n",
      "PG008",
    );
  });
});
