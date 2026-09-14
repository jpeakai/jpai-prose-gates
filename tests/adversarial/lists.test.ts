// Promotions (PG003, PG006-PG009): what counts as an item, what a lead-in
// is, and where the heuristics would change meaning.

import { describe, expect, test } from "bun:test";
import { fixMarkdown } from "../../src/index.ts";
import { fixesTo, refuses } from "./harness.ts";

describe("PG003", () => {
  test("without a colon lead-in it refuses", () => {
    refuses("We need a token; a config; a server.\n", "PG003");
  });

  test("a trailing conjunction is stripped", () => {
    fixesTo("Needs: a; b; and c.\n", "Needs:\n\n- a\n- b\n- c\n", "PG003");
  });

  test("a conjunction inside an item is kept", () => {
    fixesTo("Needs: salt and pepper; bread; butter.\n", "Needs:\n\n- salt and pepper\n- bread\n- butter\n", "PG003");
  });

  test("a semicolon inside emphasis travels whole", () => {
    fixesTo("Needs: *a; b*; c; d.\n", "Needs:\n\n- *a; b*\n- c\n- d\n", "PG003");
  });

  test("a semicolon inside link text travels whole", () => {
    fixesTo("Needs: [a; b](u); c; d.\n", "Needs:\n\n- [a; b](u)\n- c\n- d\n", "PG003");
  });
});

describe("PG006", () => {
  test("emphasis spanning a separator refuses", () => {
    refuses("Stack: *Bun · TypeScript* · biome.\n", "PG006");
  });

  test("a tight whole-paragraph footer promotes", () => {
    fixesTo("a·b·c\n", "- a\n- b\n- c\n", "PG006");
  });

  test("cjk items promote", () => {
    fixesTo("東京 · 大阪 · 京都\n", "- 東京\n- 大阪\n- 京都\n", "PG006");
  });

  test("an item that is only a conjunction is kept", () => {
    fixesTo("Pick: this · or · that.\n", "Pick:\n\n- this\n- or\n- that\n", "PG006");
  });
});

describe("PG007", () => {
  test.each([
    ["a lone citation marker", "See (a) above for details.\n"],
    ["a gap in the sequence", "Do (a) this and (c) that.\n"],
    ["mixed families", "Do (a) this, (2) that.\n"],
    ["a sequence not starting at one", "Steps (9) x (10) y.\n"],
  ])("refuses %s", (_, src) => refuses(src));

  test("roman numerals", () => {
    fixesTo("Do (i) this, (ii) that and (iii) more.\n", "Do:\n\n1. this\n2. that\n3. more\n", "PG007");
  });

  test("parentheses inside an item are not markers", () => {
    fixesTo("Do: (a) call f(x) (b) return.\n", "Do:\n\n1. call f(x)\n2. return\n", "PG007");
  });

  test("two unannounced markers joined without punctuation are refused", () => {
    refuses("Do (a) call f(x) (b) return.\n", "PG007");
  });

  test("markers at paragraph start give a bare list", () => {
    fixesTo("(a) first (b) second (c) third.\n", "1. first\n2. second\n3. third\n", "PG007");
  });

  test("inner conjunctions survive", () => {
    fixesTo("Do (a) rock and roll, (b) salt and pepper.\n", "Do:\n\n1. rock and roll\n2. salt and pepper\n", "PG007");
  });

  // "(a) above and (b) below" are cross-references, not an enumeration.
  test("paired cross-references are refused", () => {
    refuses("See (a) above and (b) below.\n", "PG007");
  });

  // A span across a sentence terminal once stranded "Then" inside item 1.
  // PG007 now refuses; PG001 still puts each sentence on its own line.
  test("markers in different sentences are not promoted", () => {
    fixesTo("Do (a) this. Then (b) that.\n", "Do (a) this.\nThen (b) that.\n");
  });
});

describe("PG008", () => {
  test("inner conjunctions survive", () => {
    fixesTo(
      "Rules: `A` salt and pepper, `B` counts, and `C` finds.\n",
      "Rules:\n\n- `A` salt and pepper\n- `B` counts\n- `C` finds\n",
      "PG008",
    );
  });
});

describe("PG009", () => {
  test("inner conjunctions survive and trailing ones strip", () => {
    fixesTo(
      "Food: salt and pepper · bread\nDrink: tea · or coffee\n",
      "- Food\n  - salt and pepper\n  - bread\n- Drink\n  - tea\n  - coffee\n",
      "PG009",
    );
  });

  // Regression: when one line lacks a label PG009 refuses, then PG001 joins the
  // lines and PG006 merges the last item of line one with the first of line
  // two. Actual: "Runtime:\n\n- Bun\n- Node no colon\n- here\n".
  // Expected: refusal, the PG009 finding stays.
  test("a stack with an unlabelled line is not merged", () => {
    expect(fixMarkdown("Runtime: Bun · Node\nno colon · here\n")).not.toContain("Node no colon");
  });
});
