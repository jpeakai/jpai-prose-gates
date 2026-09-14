// RULES.md is documentation that the code must keep true. Every `text before`
// block is fixed and compared with the `text after` block that follows it,
// and every `text reported` block must fire its rule and survive a fix run.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { Code, Heading, RootContent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { CATEGORIES, checkMarkdown, fixMarkdown, RULES } from "../src/index.ts";
import { PROJECT_ROOT } from "./helpers.ts";

interface Example {
  rule: string;
  label: "before" | "after" | "reported";
  body: string;
}

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
    const label = code.meta as Example["label"];
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

  test.each(pairs)("$rule: the fixer turns before into after", ({ rule: id, before, after }) => {
    expect(checkMarkdown(before, "RULES.md").map((f): string => f.rule)).toContain(id);
    expect(fixMarkdown(before)).toBe(after);
    expect(checkMarkdown(after, "RULES.md")).toEqual([]);
  });

  test.each(reported)("$rule: a reported case fires and is left alone", ({ rule: id, body }) => {
    expect(checkMarkdown(body, "RULES.md").map((f): string => f.rule)).toContain(id);
    expect(fixMarkdown(body)).toBe(body);
  });
});
