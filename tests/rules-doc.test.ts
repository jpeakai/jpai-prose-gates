// RULES.md is documentation that the code must keep true. Every block titled
// Before is fixed and compared with the After block that follows it, every
// Reported block must fire its rule and survive a fix run, and every Rewritten
// block after a reported one must pass every rule. A title is a superfences
// option, `text title="Before"`, so the site renders the fence.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { Code, Heading, RootContent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { CATEGORIES, checkMarkdown, fixMarkdown, RULES } from "../src/index.ts";
import { PROJECT_ROOT } from "./helpers.ts";

interface Example {
  rule: string;
  label: "before" | "after" | "reported" | "rewritten";
  body: string;
}

const LABELS: Record<string, Example["label"]> = {
  Before: "before",
  "After --fix": "after",
  Reported: "reported",
  Rewritten: "rewritten",
};

const doc = await Bun.file(join(PROJECT_ROOT, "RULES.md")).text();
const tree = fromMarkdown(doc);

const examples: Example[] = [];
const sections: { rule: string; category: string }[] = [];
let category = "";
let rule = "";
for (const node of tree.children as RootContent[]) {
  if (node.type === "heading") {
    const text = (node as Heading).children.map((c) => ("value" in c ? c.value : "")).join("");
    if (node.depth === 2) category = text.toLowerCase();
    if (node.depth === 3) {
      rule = text;
      sections.push({ rule, category });
    }
  }
  const code = node as Code;
  if (node.type === "code" && code.lang === "text" && code.meta) {
    const title = /^title="([^"]*)"$/.exec(code.meta)?.[1] ?? "";
    const label = LABELS[title];
    if (!label) throw new Error(`${rule}: a text fence has an unknown title, ${code.meta}`);
    examples.push({ rule, label, body: `${code.value}\n` });
  }
}

const pairs = examples.flatMap((e, i) => {
  if (e.label !== "before") return [];
  const after = examples[i + 1];
  if (after?.label !== "after") throw new Error(`${e.rule}: a before block has no after block`);
  return [{ rule: e.rule, before: e.body, after: after.body }];
});
const reported = examples.filter((e) => e.label === "reported");
const rewritten = examples.flatMap((e, i) => {
  if (e.label !== "rewritten") return [];
  if (examples[i - 1]?.label !== "reported") throw new Error(`${e.rule}: a rewritten block follows no reported block`);
  return [e];
});

describe("RULES.md", () => {
  test("has one section per rule, under the rule's own category", () => {
    const expected = CATEGORIES.flatMap((c) =>
      RULES.filter((r) => r.category === c).map((r) => ({ rule: r.id, category: c })),
    );
    expect([...sections].sort((a, b) => a.rule.localeCompare(b.rule))).toEqual(
      [...expected].sort((a, b) => a.rule.localeCompare(b.rule)),
    );
  });

  test("shows a fix for every fixable rule and a reported case for every other", () => {
    for (const r of RULES) {
      const labels = examples.filter((e) => e.rule === r.id).map((e) => e.label);
      expect(labels).toContain(r.fix ? "before" : "reported");
    }
  });

  test.each(pairs)("$rule: the fixer turns before into after", async ({ rule: id, before, after }) => {
    expect((await checkMarkdown(before, "RULES.md")).map((f): string => f.rule)).toContain(id);
    expect(await fixMarkdown(before)).toBe(after);
    expect(await checkMarkdown(after, "RULES.md")).toEqual([]);
  });

  test("has a rewritten block to show", () => {
    expect(rewritten.length).toBeGreaterThan(0);
  });

  test.each(rewritten)("$rule: a rewritten case passes every rule", async ({ body }) => {
    expect(await checkMarkdown(body, "RULES.md")).toEqual([]);
  });

  test.each(reported)("$rule: a reported case fires and is left alone", async ({ rule: id, body }) => {
    expect((await checkMarkdown(body, "RULES.md")).map((f): string => f.rule)).toContain(id);
    expect(await fixMarkdown(body)).toBe(body);
  });

  test.each(RULES.flatMap((r) => Object.keys(r.options ?? {}).map((option) => ({ rule: r.id, option }))))(
    "$rule: its section documents the $option option",
    ({ rule: id, option }) => {
      expect(sectionText(id)).toContain(`"${id}": ["error", { "${option}":`);
    },
  );
});

// A rule's section runs from its heading to the next heading of any depth at or above it.
function sectionText(id: string): string {
  const headings = tree.children.filter((n): n is Heading => n.type === "heading" && n.depth <= 3);
  const at = headings.findIndex((h) => h.depth === 3 && headingText(h) === id);
  if (at < 0) throw new Error(`RULES.md has no section for ${id}`);
  return doc.slice(headings[at]?.position?.end.offset, headings[at + 1]?.position?.start.offset);
}

function headingText(h: Heading): string {
  return h.children.map((c) => ("value" in c ? c.value : "")).join("");
}

// Each categories table row: the category name and the rules it lists.
const categoryRows = (text: string): { category: string; rules: string[] }[] =>
  [...text.matchAll(/^\| ([A-Z][a-z]+) \| ([a-z, -]+) \|/gm)].map((m) => ({
    category: (m[1] ?? "").toLowerCase(),
    rules: (m[2] ?? "").split(", ").sort(),
  }));

describe.each(["README.md", "RULES.md"])("the categories table in %s", (file) => {
  test("lists every rule under its own category, and nothing else", async () => {
    const rows = categoryRows(await Bun.file(join(PROJECT_ROOT, file)).text());
    expect(rows).toEqual(
      CATEGORIES.map((c) => ({
        category: c,
        rules: RULES.filter((r) => r.category === c)
          .map((r) => r.id)
          .sort(),
      })),
    );
  });
});
