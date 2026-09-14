import { describe, expect, test } from "bun:test";
import { FixInvariantError, fingerprint, verify } from "../../src/fix/verify.ts";
import { buildDocModel, parse } from "../../src/model.ts";
import type { Edit } from "../../src/rules/types.ts";

const apply = (src: string, e: Edit): string => src.slice(0, e.start) + e.text + src.slice(e.end);

describe("verify", () => {
  test("a fixer that drops a word throws, it is never silently refused", () => {
    const src = "Keep every word here.\n";
    const doc = buildDocModel(src);
    const edit: Edit = { rule: "PG004", start: 5, end: 11, text: "", expect: { kind: "same-shape" } };
    expect(() => verify(edit, { src, tree: doc.tree }, parse(apply(src, edit)))).toThrow(FixInvariantError);
  });

  test("the error names the diverging word", () => {
    const src = "alpha beta gamma.\n";
    const doc = buildDocModel(src);
    const edit: Edit = { rule: "PG005", start: 6, end: 10, text: "BETA", expect: { kind: "same-shape" } };
    expect(() => verify(edit, { src, tree: doc.tree }, parse(apply(src, edit)))).toThrow(/word 1 was "beta"/);
  });

  test("a whitespace edit that changes structure is refused", () => {
    const src = "Para one\npara two.\n";
    const doc = buildDocModel(src);
    const edit: Edit = { rule: "PG001", start: 8, end: 9, text: "\n\n", expect: { kind: "same-tree" } };
    expect(verify(edit, { src, tree: doc.tree }, parse(apply(src, edit)))).toBe("refuse");
  });

  test("a glyph edit that creates emphasis is refused", () => {
    const src = "a · b*\n";
    const doc = buildDocModel(src);
    const edit: Edit = { rule: "PG005", start: 1, end: 4, text: " *", expect: { kind: "same-shape" } };
    const after = parse(apply(src, edit));
    expect(fingerprint(after)).toEqual(fingerprint(doc.tree));
    expect(verify(edit, { src, tree: doc.tree }, after)).toBe("refuse");
  });

  test("a paragraph replacement whose fragment is not one list is refused", () => {
    const src = "Items: a; b; c.\n";
    const doc = buildDocModel(src);
    const view = doc.paragraphs[0];
    if (!view) throw new Error("expected a paragraph");
    const text = "Items:\n\n- a\n- b\n\n# c\n";
    const edit: Edit = {
      rule: "PG003",
      start: 0,
      end: src.length - 1,
      text,
      expect: { kind: "replace-paragraph", view, fragment: text, listItems: 3 },
    };
    expect(verify(edit, { src, tree: doc.tree }, parse(apply(src, edit)))).toBe("refuse");
  });
});

describe("fingerprint", () => {
  test("ignores enumeration markers and joining conjunctions", () => {
    expect(fingerprint(parse("Do (a) this and (b) that.\n"))).toEqual(fingerprint(parse("1. Do\n2. this\n3. that\n")));
  });

  test("counts urls, alt text and code", () => {
    expect(fingerprint(parse("![alt](https://x.example/y) `code`\n"))).toEqual([
      "https",
      "x",
      "example",
      "y",
      "alt",
      "code",
    ]);
  });
});
