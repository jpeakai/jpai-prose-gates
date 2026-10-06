// Rules may be async. Checks all start at once, so a slow rule overlaps with the
// others, and fixers are awaited in priority order, so one invocation still ends
// at a stable text. These tests use real rule files that really wait.

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkMarkdown,
  FixInvariantError,
  fixMarkdown,
  fixMarkdownReport,
  PluginFixerError,
  setUp,
} from "../src/index.ts";
import { PROJECT_ROOT, tempProject } from "./helpers.ts";

const PKG = { "package.json": JSON.stringify({ name: "demo" }) };

const rule = (body: string, category = "sentence"): string =>
  `export default { category: "${category}", summary: "an async rule", ${body} };\n`;

const project = (rules: Record<string, string>): Record<string, string> => ({
  ...PKG,
  ...Object.fromEntries(Object.entries(rules).map(([name, source]) => [`.prose-gates/rules/${name}.mjs`, source])),
});

const registryOf = async (files: Record<string, string>) => (await setUp({ cwd: tempProject(files) })).registry;

describe("async checks", () => {
  test("every check starts at once, so a rule can wait on another that has not finished", async () => {
    // Rule A cannot finish until rule B has started. Run one after the other, A would wait forever.
    const gate = globalThis as unknown as { __bStarted?: Promise<void>; __startB?: () => void };
    gate.__bStarted = new Promise<void>((resolve) => {
      gate.__startB = resolve;
    });
    const files = project({
      "sentence-a-waits": rule(
        'check: async () => { await globalThis.__bStarted; return [{ line: 1, message: "A saw B start" }]; }',
      ),
      "sentence-b-starts": rule("check: async () => { globalThis.__startB(); return []; }"),
    });
    const found = await checkMarkdown("Text.\n", "doc.md", undefined, await registryOf(files));
    expect(found.map((f) => f.message)).toEqual(["A saw B start"]);
  }, 10_000);

  test("results are sorted by line then id, whatever order the rules finish in", async () => {
    const files = project({
      "sentence-slow": rule(
        'check: async () => { await new Promise((r) => setTimeout(r, 40)); return [{ line: 1, message: "slow" }]; }',
      ),
      "sentence-fast": rule('check: async () => [{ line: 1, message: "fast" }]'),
      "sentence-sync": rule('check: () => [{ line: 1, message: "sync" }]'),
    });
    const found = await checkMarkdown("Text.\n", "doc.md", undefined, await registryOf(files));
    expect(found.map((f) => f.rule)).toEqual(["local/sentence-fast", "local/sentence-slow", "local/sentence-sync"]);
  });

  test("a rejected promise becomes a finding for that rule, and the others carry on", async () => {
    const files = project({
      "sentence-rejects": rule('check: async () => { throw new Error("later"); }'),
      "sentence-ok": rule('check: async () => [{ line: 1, message: "fine" }]'),
    });
    const found = await checkMarkdown("A tell — here.\n", "doc.md", undefined, await registryOf(files));
    const byRule = Object.fromEntries(found.map((f) => [f.rule, f.message]));
    expect(byRule["local/sentence-rejects"]).toContain("threw: later");
    expect(byRule["local/sentence-ok"]).toBe("fine");
    expect(byRule["punctuation-em-dash-in-prose"]).toBeString();
  });

  test("a promise of something that is not a list of findings is reported, not trusted", async () => {
    const files = project({ "sentence-bad": rule("check: async () => 5") });
    const [finding] = await checkMarkdown("Text.\n", "doc.md", undefined, await registryOf(files));
    expect(finding?.message).toContain("returned something other than a list");
  });

  test("an async check inside a markdown fence is found with the right line", async () => {
    const files = project({
      "sentence-todo": rule(
        'check: async ({ doc }) => doc.paragraphs.filter((p) => p.raw.includes("TODO")).map((p) => ({ line: p.line, message: "TODO" }))',
      ),
    });
    const src = "Intro.\n\n```markdown\nA TODO here.\n```\n";
    const found = await checkMarkdown(src, "doc.md", undefined, await registryOf(files));
    expect(found.map((f) => [f.rule, f.line])).toEqual([["local/sentence-todo", 4]]);
  });

  test("checkMarkdown returns a promise even when every rule is synchronous", () => {
    expect(checkMarkdown("Text.\n", "doc.md")).toBeInstanceOf(Promise);
    expect(fixMarkdown("Text.\n")).toBeInstanceOf(Promise);
  });
});

describe("async fixers", () => {
  const collapseAfterAWait =
    'fix: async ({ doc }) => { await new Promise((r) => setTimeout(r, 5)); const m = /  +/.exec(doc.src); return m ? [{ start: m.index, end: m.index + m[0].length, text: " ", expect: { kind: "same-tree" } }] : []; }';

  test("an async fixer is awaited, and its edit is verified like any other", async () => {
    const files = project({ "sentence-collapse": rule(`check: () => [], ${collapseAfterAWait}`) });
    const out = await fixMarkdownReport("A   b   c.\n", await registryOf(files));
    expect(out.output).toBe("A b c.\n");
    expect(out.applied.map((e) => e.rule)).toEqual(["local/sentence-collapse", "local/sentence-collapse"]);
  });

  test("an async fixer that rejects stops the run and names the rule", async () => {
    const files = project({ "sentence-boom": rule('check: () => [], fix: async () => { throw new Error("later"); }') });
    const failure = fixMarkdown("Text.\n", await registryOf(files));
    await expect(failure).rejects.toBeInstanceOf(PluginFixerError);
    await expect(failure).rejects.toThrow(/local\/sentence-boom fixer threw: later/);
  });

  test("an async fixer that loses a word is stopped by the same proof", async () => {
    const lossy =
      'fix: async ({ doc }) => { await Promise.resolve(); const i = doc.src.indexOf("b"); return i < 0 ? [] : [{ start: i, end: i + 1, text: "", expect: { kind: "same-shape" } }]; }';
    const files = project({ "sentence-lossy": rule(`check: () => [], ${lossy}`) });
    await expect(fixMarkdown("a b c.\n", await registryOf(files))).rejects.toBeInstanceOf(FixInvariantError);
  });

  test("an async fixer that resolves to something that is not a list stops the run", async () => {
    const files = project({ "sentence-bad": rule("check: () => [], fix: async () => 5") });
    await expect(fixMarkdown("Text.\n", await registryOf(files))).rejects.toThrow(/other than a list of edits/);
  });

  test("fixers are asked one after another in priority order, never at once", async () => {
    // Each fixer records when it starts and ends. Overlap would interleave start and end events.
    const log: string[] = [];
    (globalThis as unknown as { __log: string[] }).__log = log;
    const logging = (name: string): string =>
      rule(
        `check: () => [], fix: async () => { globalThis.__log.push("${name}:start"); await new Promise((r) => setTimeout(r, 10)); globalThis.__log.push("${name}:end"); return []; }`,
      );
    const files = project({ "sentence-a": logging("a"), "sentence-b": logging("b") });
    await fixMarkdown("Text.\n", await registryOf(files));
    expect(log).toEqual(["a:start", "a:end", "b:start", "b:end"]);
  });
});

describe("one invocation ends at a stable text", () => {
  test("a later fixer's output is re-checked by the earlier fixers", async () => {
    // The plugin fixer runs after every built-in. It turns "--" into an em-dash, which
    // the built-in em-dash fixer, earlier in the order, must then be asked about again.
    const dashes =
      'fix: async ({ doc }) => { const i = doc.src.indexOf("--"); return i < 0 ? [] : [{ start: i, end: i + 2, text: "—", expect: { kind: "same-shape" } }]; }';
    const files = project({ "punctuation-dashes": rule(`check: () => [], ${dashes}`, "punctuation") });
    const registry = await registryOf(files);
    const out = await fixMarkdownReport("A tell -- here.\n", registry);
    expect(out.output).not.toContain("—");
    expect(out.output).not.toContain("--");
    expect(out.applied.some((e) => e.rule === "local/punctuation-dashes")).toBe(true);
    expect(out.applied.some((e) => e.rule === "punctuation-em-dash-in-prose")).toBe(true);
  });

  test("fixing the result again changes nothing, with plugin fixers in the mix", async () => {
    const collapse =
      'fix: async ({ doc }) => { const m = /  +/.exec(doc.src); return m ? [{ start: m.index, end: m.index + m[0].length, text: " ", expect: { kind: "same-tree" } }] : []; }';
    const registry = await registryOf(project({ "sentence-collapse": rule(`check: () => [], ${collapse}`) }));
    const inputs = [
      "A wrapped sentence goes\nonward here.\n",
      "Tools: fmt · vet · race.\n",
      "A  tell — and   more — here.\n",
      "We ship parsing; then linting; then fixing.\n",
      "Steps: (1) parse the file and (2) emit findings.\n",
    ];
    for (const src of inputs) {
      const once = await fixMarkdown(src, registry);
      expect(await fixMarkdown(once, registry)).toBe(once);
    }
  });

  test("every documented fix output is already stable", async () => {
    const dir = join(PROJECT_ROOT, "tests", "fixtures", "fix");
    for (const name of readdirSync(dir)) {
      const expected = readFileSync(join(dir, name, "expected.md"), "utf8");
      expect(await fixMarkdown(expected)).toBe(expected);
    }
  });
});
