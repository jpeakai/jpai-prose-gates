// The same-frontmatter-data expectation: an edit inside the frontmatter is kept only
// if the YAML parses to identical data before and after, and nothing outside it moves.

import { describe, expect, test } from "bun:test";
import { verify } from "../src/fix/verify.ts";
import { fixMarkdownReport, setUp } from "../src/index.ts";
import { parse } from "../src/model.ts";
import type { Edit } from "../src/rules/types.ts";
import { tempProject } from "./helpers.ts";

const SAME: Edit["expect"] = { kind: "same-frontmatter-data" };

const apply = (src: string, e: Edit): string => src.slice(0, e.start) + e.text + src.slice(e.end);

// Verifies an edit that replaces the first occurrence of `from` with `to`.
const verdict = (src: string, from: string, to: string): "accept" | "refuse" => {
  const start = src.indexOf(from);
  const edit: Edit = { rule: "punctuation-em-dash-in-prose", start, end: start + from.length, text: to, expect: SAME };
  return verify(edit, { src, tree: parse(src) }, parse(apply(src, edit)));
};

describe("verify: same-frontmatter-data", () => {
  const src = "---\nname: demo\ndescription: One. Two.\n---\n\nBody text.\n";

  test("accepts a rewrite that writes the same data a different way", () => {
    expect(verdict(src, "One. Two.", ">-\n  One.\n  Two.")).toBe("accept");
    expect(verdict(src, "One. Two.", '"One. Two."')).toBe("accept");
    expect(verdict(src, "One. Two.", "'One. Two.'")).toBe("accept");
  });

  test("refuses a rewrite that changes the data, even when the words are the same", () => {
    // Same words, but the final full stop is gone, so the string is different.
    expect(verdict(src, "One. Two.", "One. Two")).toBe("refuse");
    // A folded block with a trailing newline keeps one, so it is not the same string.
    expect(verdict(src, "One. Two.", ">\n  One.\n  Two.")).toBe("refuse");
  });

  test("refuses a rewrite that turns the YAML invalid", () => {
    expect(verdict(src, "One. Two.", "[One. Two.")).toBe("refuse");
  });

  test("reordering keys changes the word order, so it throws before data is compared", () => {
    const reorder = "---\nb: 1\na: 2\n---\n";
    const start = reorder.indexOf("b: 1\na: 2");
    const edit: Edit = {
      rule: "punctuation-em-dash-in-prose",
      start,
      end: start + 9,
      text: "a: 2\nb: 1",
      expect: SAME,
    };
    expect(() => verify(edit, { src: reorder, tree: parse(reorder) }, parse(apply(reorder, edit)))).toThrow(
      /lost content/,
    );
  });

  test("refuses an edit that moves anything outside the frontmatter", () => {
    const body = "---\nname: demo\n---\n\nBody text.\n";
    const start = body.indexOf("Body text") + 4;
    const edit: Edit = { rule: "punctuation-em-dash-in-prose", start, end: start + 1, text: "\n\n", expect: SAME };
    expect(verify(edit, { src: body, tree: parse(body) }, parse(apply(body, edit)))).toBe("refuse");
  });

  test("a changed word still throws first, as it does for every expectation", () => {
    expect(() => verdict(src, "One. Two.", "One. Three.")).toThrow(/fixer lost content/);
  });

  test("a document with no frontmatter compares its body only", () => {
    const plain = "Text here.\n";
    const edit: Edit = { rule: "punctuation-em-dash-in-prose", start: 4, end: 5, text: "  ", expect: SAME };
    expect(verify(edit, { src: plain, tree: parse(plain) }, parse(apply(plain, edit)))).toBe("accept");
  });
});

describe("a plugin fixer that claims same-frontmatter-data", () => {
  const fixer = (body: string): Record<string, string> => ({
    "package.json": "{}",
    ".prose-gates/rules/frontmatter-edit.mjs": `export const categories = { frontmatter: "Keys in the metadata block" };
export default { category: "frontmatter", summary: "edits frontmatter", check: () => [], fix: ({ doc }) => { ${body} } };
`,
  });

  const run = async (body: string, src: string) =>
    fixMarkdownReport(src, (await setUp({ cwd: tempProject(fixer(body)) })).registry);

  const replace = (from: string, to: string): string =>
    `const i = doc.src.indexOf(${JSON.stringify(from)}); return i < 0 ? [] : [{ start: i, end: i + ${from.length}, text: ${JSON.stringify(to)}, expect: { kind: "same-frontmatter-data" } }];`;

  const src = "---\ndescription: One. Two.\n---\n\nBody.\n";

  test("is applied when the data is unchanged", async () => {
    const out = await run(replace("One. Two.", '"One. Two."'), src);
    expect(out.output).toBe('---\ndescription: "One. Two."\n---\n\nBody.\n');
    expect(out.applied).toHaveLength(1);
  });

  test("is refused, and the text left alone, when it changes the data", async () => {
    const out = await run(replace("One. Two.", "One. Two"), src);
    expect(out.output).toBe(src);
    expect(out.refused).toHaveLength(1);
  });

  test("is refused when it breaks the YAML", async () => {
    const out = await run(replace("One. Two.", ": : One. Two."), src);
    expect(out.output).toBe(src);
    expect(out.refused).toHaveLength(1);
  });

  test("is refused when it changes another key", async () => {
    const two = "---\ndescription: One. Two.\nname: demo\n---\n\nBody.\n";
    const out = await run(replace("name: demo", "name: demo."), two);
    expect(out.output).toBe(two);
  });

  test("an expectation of another kind cannot rewrite the frontmatter at all", async () => {
    const body = `const i = doc.src.indexOf("One. Two."); return i < 0 ? [] : [{ start: i, end: i + 9, text: '"One. Two."', expect: { kind: "same-tree" } }];`;
    const out = await run(body, src);
    expect(out.output).toBe(src);
    expect(out.refused).toHaveLength(1);
  });
});
