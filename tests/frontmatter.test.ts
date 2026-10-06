// Frontmatter is a read-only view for rules, and the skills example is the
// first rule to use it. Built-in prose rules stay exempt from frontmatter by
// construction, and these tests hold both halves.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { buildDocModel, checkMarkdown, setUp } from "../src/index.ts";
import { PROJECT_ROOT, tempProject } from "./helpers.ts";

const EXAMPLE = join(PROJECT_ROOT, "examples", "plugin-skills");
const read = (path: string): Promise<string> => Bun.file(join(EXAMPLE, path)).text();

const RULE_ID = "frontmatter-description-word-budget";

const asLocal = async (config?: unknown) =>
  tempProject({
    "package.json": "{}",
    [`.prose-gates/rules/${RULE_ID}.mjs`]: await read(`rules/${RULE_ID}.mjs`),
    ...(config ? { "prose-gates.config.json": JSON.stringify(config) } : {}),
  });

const findings = async (src: string, config?: unknown) => {
  const { registry } = await setUp({ cwd: await asLocal(config) });
  return checkMarkdown(src, "doc.md", undefined, registry);
};

const words = (n: number): string => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

describe("DocModel.frontmatter", () => {
  test("is null when the document has none", () => {
    expect(buildDocModel("# Title\n\nBody.\n").frontmatter).toBeNull();
  });

  test("is null when the first block is not at the top", () => {
    expect(buildDocModel("Intro.\n\n---\nkey: value\n---\n").frontmatter).toBeNull();
  });

  test("is null for TOML, which is not read", () => {
    expect(buildDocModel("+++\nkey = 'value'\n+++\n\nBody.\n").frontmatter).toBeNull();
  });

  test("lists top-level string entries with the line each value starts on", () => {
    const src =
      "---\nname: demo\ndescription: >\n  A folded\n  value.\nquoted: 'in quotes'\nplain: one\n  two\n---\n\nBody.\n";
    const fm = buildDocModel(src).frontmatter;
    expect(fm?.format).toBe("yaml");
    expect(fm?.entries.map((e) => [e.key, e.value, e.line])).toEqual([
      ["name", "demo", 2],
      ["description", "A folded value.\n", 3],
      ["quoted", "in quotes", 6],
      ["plain", "one two", 7],
    ]);
  });

  test("offsets point at the value in the source", () => {
    const src = "---\nname: demo\nlabel: 'in quotes'\n---\n";
    const fm = buildDocModel(src).frontmatter;
    for (const e of fm?.entries ?? []) expect(src.slice(e.start, e.end)).toContain(e.value);
  });

  test("leaves out values that are not strings, and anything nested", () => {
    const src = "---\ncount: 5\nflag: true\nlist: [a, b]\nnested:\n  inner: x\nname: kept\n---\n";
    expect(buildDocModel(src).frontmatter?.entries.map((e) => e.key)).toEqual(["name"]);
  });

  test("an empty block has no entries", () => {
    expect(buildDocModel("---\n---\n\nBody.\n").frontmatter?.entries).toEqual([]);
  });

  test("a block that is not a map has no entries", () => {
    expect(buildDocModel("---\n- a\n- b\n---\n").frontmatter?.entries).toEqual([]);
  });

  test("invalid YAML throws with the line, only when the view is read", () => {
    const doc = buildDocModel("---\ntitle: ok\nitems: [1, 2\nother: x\n---\n\nBody.\n");
    expect(doc.paragraphs).toHaveLength(1);
    expect(() => doc.frontmatter).toThrow(/frontmatter YAML error at line \d/);
  });

  test("is read once", () => {
    const doc = buildDocModel("---\nname: x\n---\n");
    expect(doc.frontmatter).toBe(doc.frontmatter);
  });

  test("works with Windows line endings", () => {
    const fm = buildDocModel("---\r\nname: demo\r\n---\r\n").frontmatter;
    expect(fm?.entries.map((e) => [e.key, e.value, e.line])).toEqual([["name", "demo", 2]]);
  });
});

describe("built-in rules stay exempt from frontmatter", () => {
  test("a long sentence in frontmatter is not reported by the sentence budget", () => {
    const src = `---\ndescription: ${words(60)}.\n---\n\nShort body.\n`;
    expect(checkMarkdown(src, "doc.md").map((f) => f.rule)).toEqual([]);
  });
});

describe("the skills description rule as a local rule", () => {
  test("flags a long sentence in description, with the file line", async () => {
    const src = `---\nname: demo\ndescription: ${words(30)}.\n---\n\nBody.\n`;
    const found = await findings(src);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: `local/${RULE_ID}`, line: 3 });
    expect(found[0]?.message).toContain("description: sentence has 30 words (budget 25)");
  });

  test("passes a description whose sentences are all short", async () => {
    const src = `---\ndescription: ${words(20)}. ${words(20)}.\n---\n`;
    expect(await findings(src)).toEqual([]);
  });

  test("counts each sentence on its own, so only the long one is reported", async () => {
    const src = `---\ndescription: Short one. ${words(40)}. Another short.\n---\n`;
    const found = await findings(src);
    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain("40 words");
  });

  test("reads folded and literal block scalars", async () => {
    const folded = `---\ndescription: >\n  ${words(15)}\n  ${words(15)}\n---\n`;
    expect(await findings(folded)).toHaveLength(1);
    const literal = `---\ndescription: |\n  ${words(30)}.\n---\n`;
    expect(await findings(literal)).toHaveLength(1);
  });

  test("reads a quoted description", async () => {
    expect(await findings(`---\ndescription: "${words(30)}."\n---\n`)).toHaveLength(1);
  });

  test("ignores keys it was not asked to read", async () => {
    expect(await findings(`---\ntitle: ${words(40)}.\n---\n`)).toEqual([]);
  });

  test("the keys option adds more keys, and maxWords sets the budget", async () => {
    const config = {
      rules: { [`local/${RULE_ID}`]: ["error", { keys: ["description", "summary"], maxWords: 10 }] },
    };
    const src = `---\ndescription: ${words(12)}.\nsummary: ${words(12)}.\ntitle: ${words(12)}.\n---\n`;
    const found = await findings(src, config);
    expect(found.map((f) => f.line)).toEqual([2, 3]);
  });

  test("the --max-words flag still wins for the run", async () => {
    const { registry } = await setUp({ cwd: await asLocal() });
    const src = `---\ndescription: ${words(30)}.\n---\n`;
    expect(checkMarkdown(src, "doc.md", 50, registry)).toEqual([]);
  });

  test("a document with no frontmatter is clean", async () => {
    expect(await findings("# Title\n\nBody.\n")).toEqual([]);
  });

  test("invalid YAML is reported as a finding for the rule, not a crash", async () => {
    const found = await findings("---\nitems: [1, 2\n---\n\nBody.\n");
    expect(found).toHaveLength(1);
    expect(found[0]?.rule).toBe(`local/${RULE_ID}`);
    expect(found[0]?.message).toContain("frontmatter YAML error at line");
  });

  test("frontmatter inside a markdown fence is checked like a top-level block", async () => {
    const src = `Template:\n\n\`\`\`markdown\n---\ndescription: ${words(30)}.\n---\n\`\`\`\n`;
    const found = await findings(src);
    expect(found.map((f) => [f.rule, f.line])).toEqual([[`local/${RULE_ID}`, 5]]);
  });

  test("can be switched off like any rule", async () => {
    const config = { rules: { [`local/${RULE_ID}`]: "off" } };
    expect(await findings(`---\ndescription: ${words(40)}.\n---\n`, config)).toEqual([]);
  });

  test("has no fixer, so --fix leaves the frontmatter alone", async () => {
    const { registry } = await setUp({ cwd: await asLocal() });
    expect(registry.rules.find((r) => r.id === `local/${RULE_ID}`)?.fix).toBeUndefined();
  });
});

describe("the skills description rule as a packaged plugin", () => {
  test("loads from a declared dependency under the skills namespace and category", async () => {
    const root = tempProject({
      "package.json": JSON.stringify({ devDependencies: { "prose-gates-plugin-skills": "0.0.0" } }),
      "node_modules/prose-gates-plugin-skills/package.json": await read("package.json"),
      "node_modules/prose-gates-plugin-skills/index.mjs": await read("index.mjs"),
      [`node_modules/prose-gates-plugin-skills/rules/${RULE_ID}.mjs`]: await read(`rules/${RULE_ID}.mjs`),
    });
    const { registry } = await setUp({ cwd: root });
    expect(registry.categories.get("frontmatter")).toBe("Keys in the leading metadata block of a file");
    const src = `---\ndescription: ${words(30)}.\n---\n`;
    expect(checkMarkdown(src, "doc.md", undefined, registry).map((f) => f.rule)).toEqual([`skills/${RULE_ID}`]);
  });
});
