// Promotions (list-semicolon-delimited-run, list-interpunct-joined-run-list-stacked-interpunct-runs): what counts as an item, what a lead-in
// is, and where the heuristics would change meaning.

import { describe, expect, test } from "bun:test";
import { fixMarkdown } from "../../src/index.ts";
import { fixesTo, refuses } from "./harness.ts";

describe("list-semicolon-delimited-run", () => {
  test("without a colon lead-in it refuses", async () => {
    await refuses("We need a token; a config; a server.\n", "list-semicolon-delimited-run");
  });

  test("a trailing conjunction is stripped", async () => {
    await fixesTo("Needs: a; b; and c.\n", "Needs:\n\n- a\n- b\n- c\n", "list-semicolon-delimited-run");
  });

  test("a conjunction inside an item is kept", async () => {
    await fixesTo(
      "Needs: salt and pepper; bread; butter.\n",
      "Needs:\n\n- salt and pepper\n- bread\n- butter\n",
      "list-semicolon-delimited-run",
    );
  });

  test("a semicolon inside emphasis travels whole", async () => {
    await fixesTo("Needs: *a; b*; c; d.\n", "Needs:\n\n- *a; b*\n- c\n- d\n", "list-semicolon-delimited-run");
  });

  test("a semicolon inside link text travels whole", async () => {
    await fixesTo("Needs: [a; b](u); c; d.\n", "Needs:\n\n- [a; b](u)\n- c\n- d\n", "list-semicolon-delimited-run");
  });
});

describe("list-interpunct-joined-run", () => {
  test("emphasis spanning a separator refuses", async () => {
    await refuses("Stack: *Bun · TypeScript* · biome.\n", "list-interpunct-joined-run");
  });

  test("a tight whole-paragraph footer promotes", async () => {
    await fixesTo("a·b·c\n", "- a\n- b\n- c\n", "list-interpunct-joined-run");
  });

  test("cjk items promote", async () => {
    await fixesTo("東京 · 大阪 · 京都\n", "- 東京\n- 大阪\n- 京都\n", "list-interpunct-joined-run");
  });

  test("an item that is only a conjunction is kept", async () => {
    await fixesTo("Pick: this · or · that.\n", "Pick:\n\n- this\n- or\n- that\n", "list-interpunct-joined-run");
  });
});

describe("list-inline-enumeration-markers", () => {
  test.each([
    ["a lone citation marker", "See (a) above for details.\n"],
    ["a gap in the sequence", "Do (a) this and (c) that.\n"],
    ["mixed families", "Do (a) this, (2) that.\n"],
    ["a sequence not starting at one", "Steps (9) x (10) y.\n"],
  ])("refuses %s", async (_, src) => await refuses(src));

  test("roman numerals", async () => {
    await fixesTo(
      "Do (i) this, (ii) that and (iii) more.\n",
      "Do:\n\n1. this\n2. that\n3. more\n",
      "list-inline-enumeration-markers",
    );
  });

  test("parentheses inside an item are not markers", async () => {
    await fixesTo(
      "Do: (a) call f(x) (b) return.\n",
      "Do:\n\n1. call f(x)\n2. return\n",
      "list-inline-enumeration-markers",
    );
  });

  test("two unannounced markers joined without punctuation are refused", async () => {
    await refuses("Do (a) call f(x) (b) return.\n", "list-inline-enumeration-markers");
  });

  test("markers at paragraph start give a bare list", async () => {
    await fixesTo(
      "(a) first (b) second (c) third.\n",
      "1. first\n2. second\n3. third\n",
      "list-inline-enumeration-markers",
    );
  });

  test("inner conjunctions survive", async () => {
    await fixesTo(
      "Do (a) rock and roll, (b) salt and pepper.\n",
      "Do:\n\n1. rock and roll\n2. salt and pepper\n",
      "list-inline-enumeration-markers",
    );
  });

  // "(a) above and (b) below" are cross-references, not an enumeration.
  test("paired cross-references are refused", async () => {
    await refuses("See (a) above and (b) below.\n", "list-inline-enumeration-markers");
  });

  // A span across a sentence terminal once stranded "Then" inside item 1.
  // list-inline-enumeration-markers now refuses; sentence-one-per-line still puts each sentence on its own line.
  test("markers in different sentences are not promoted", async () => {
    await fixesTo("Do (a) this. Then (b) that.\n", "Do (a) this.\nThen (b) that.\n");
  });
});

describe("list-comma-labelled-run", () => {
  test("inner conjunctions survive", async () => {
    await fixesTo(
      "Rules: `A` salt and pepper, `B` counts, and `C` finds.\n",
      "Rules:\n\n- `A` salt and pepper\n- `B` counts\n- `C` finds\n",
      "list-comma-labelled-run",
    );
  });
});

describe("list-stacked-interpunct-runs", () => {
  test("inner conjunctions survive and trailing ones strip", async () => {
    await fixesTo(
      "Food: salt and pepper · bread\nDrink: tea · or coffee\n",
      "- Food\n  - salt and pepper\n  - bread\n- Drink\n  - tea\n  - coffee\n",
      "list-stacked-interpunct-runs",
    );
  });

  // Regression: when one line lacks a label list-stacked-interpunct-runs refuses, then sentence-one-per-line joins the
  // lines and list-interpunct-joined-run merges the last item of line one with the first of line
  // two. Actual: "Runtime:\n\n- Bun\n- Node no colon\n- here\n".
  // Expected: refusal, the list-stacked-interpunct-runs finding stays.
  test("a stack with an unlabelled line is not merged", async () => {
    expect(await fixMarkdown("Runtime: Bun · Node\nno colon · here\n")).not.toContain("Node no colon");
  });
});
