// What a plugin author uses: the test helper, the rule listing and the
// template plugin. The template is exercised through the helper exactly as an
// author's own tests would.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { listRules } from "../src/cli.ts";
import { setUp } from "../src/index.ts";
import { checkRule, fixRule, localPlugin } from "../src/testing.ts";
import { PROJECT_ROOT, runCli, tempProject } from "./helpers.ts";

const KEY = "frontmatter-description-word-budget";
const template = (await import(join(PROJECT_ROOT, "examples", "plugin-skills", "index.mjs"))).default;
const ruleModule = await import(join(PROJECT_ROOT, "examples", "plugin-skills", "rules", `${KEY}.mjs`));

const words = (n: number): string => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
const doc = (n: number): string => `---\ndescription: ${words(n)}.\n---\n\nBody.\n`;

describe("the testing helper", () => {
  test("runs a plugin rule over a string and reports under the plugin's id", async () => {
    const found = await checkRule(template, KEY, doc(30));
    expect(found.map((f) => [f.rule, f.line])).toEqual([[`skills/${KEY}`, 2]]);
  });

  test("passes a clean document", async () => {
    expect(await checkRule(template, KEY, doc(5))).toEqual([]);
  });

  test("takes rule options and a budget, like a config and a flag", async () => {
    expect(await checkRule(template, KEY, doc(30), { maxWords: 40 })).toEqual([]);
    expect(await checkRule(template, KEY, doc(12), { options: { maxWords: 10 } })).toHaveLength(1);
    expect(
      await checkRule(template, KEY, `---\nsummary: ${words(30)}.\n---\n`, { options: { keys: ["summary"] } }),
    ).toHaveLength(1);
  });

  test("fixRule runs the verified engine, and a rule with no fixer changes nothing", async () => {
    const out = await fixRule(template, KEY, doc(30));
    expect(out.output).toBe(doc(30));
    expect(out.applied).toEqual([]);
  });

  test("holds the plugin to the loader's contract", async () => {
    const broken = { meta: { name: "x", namespace: "x", apiVersion: 2 }, rules: {} };
    await expect(checkRule(broken as never, KEY, "text\n")).rejects.toThrow(/apiVersion 2/);
  });

  test("names the rules a plugin has when the key is wrong", async () => {
    await expect(checkRule(template, "frontmatter-nope", "text\n")).rejects.toThrow(
      /has no rule "frontmatter-nope"; it has frontmatter-description-multiline-string, frontmatter-description-word-budget/,
    );
  });

  test("localPlugin wraps a local rule module the way the loader would", async () => {
    const plugin = localPlugin(KEY, ruleModule);
    expect(plugin.meta.namespace).toBe("local");
    expect((await checkRule(plugin, KEY, doc(30))).map((f) => f.rule)).toEqual([`local/${KEY}`]);
  });

  test("a fixer is run through the same proof as in a real run", async () => {
    const spaces = {
      meta: { name: "s", namespace: "s", apiVersion: 1 },
      rules: {
        "sentence-collapse-spaces": {
          category: "sentence",
          summary: "runs of spaces",
          check: () => [],
          fix: ({ doc }: { doc: { src: string } }) => {
            const m = / {2,}/.exec(doc.src);
            return m ? [{ start: m.index, end: m.index + m[0].length, text: " ", expect: { kind: "same-tree" } }] : [];
          },
        },
      },
    };
    expect((await fixRule(spaces as never, "sentence-collapse-spaces", "a   b.\n")).output).toBe("a b.\n");
  });
});

describe("--list-rules", () => {
  test("lists built-in rules under their categories with no files needed", async () => {
    const root = tempProject({ "package.json": "{}" });
    const { code, stdout } = await runCli(root, ["--list-rules"]);
    expect(code).toBe(0);
    expect(stdout).toContain("sentence: How a sentence is laid out and how long it runs");
    expect(stdout).toContain("  sentence-one-per-line* mid-sentence line wrap");
    expect(stdout).not.toContain("plugins:");
  });

  test("adds plugin categories and rules, and says where each plugin came from", async () => {
    const root = tempProject({
      "package.json": "{}",
      [`.prose-gates/rules/${KEY}.mjs`]: await Bun.file(
        join(PROJECT_ROOT, "examples", "plugin-skills", "rules", `${KEY}.mjs`),
      ).text(),
    });
    const { code, stdout } = await runCli(root, ["--list-rules"]);
    expect(code).toBe(0);
    expect(stdout).toContain("frontmatter: Keys in the leading metadata block of a file");
    expect(stdout).toContain(`  local/${KEY}  sentence in a frontmatter value`);
    expect(stdout).toContain("plugins:\n  local (local) .prose-gates/rules");
  });

  test("leaves out a rule that is switched off", async () => {
    const root = tempProject({
      "package.json": "{}",
      "prose-gates.config.json": JSON.stringify({ rules: { "sentence-one-per-line": "off" } }),
    });
    const { stdout } = await runCli(root, ["--list-rules"]);
    expect(stdout).not.toContain("sentence-one-per-line");
  });

  test("listRules gives the same text in process", async () => {
    const { registry } = await setUp({ cwd: tempProject({ "package.json": "{}" }) });
    expect(listRules(registry)).toContain("punctuation: A glyph that reads as generated text");
  });
});

describe("the Node bundle of the testing helper", () => {
  test("loads under Node and runs a rule", async () => {
    const script = `const t = await import(${JSON.stringify(join(PROJECT_ROOT, "dist", "testing.js"))}); const p = (await import(${JSON.stringify(join(PROJECT_ROOT, "examples", "plugin-skills", "index.mjs"))})).default; process.stdout.write(String((await t.checkRule(p, "${KEY}", ${JSON.stringify(doc(30))})).length));`;
    const proc = Bun.spawn(["node", "--input-type=module", "-e", script], { stdout: "pipe", stderr: "pipe" });
    expect(await new Response(proc.stdout).text()).toBe("1");
    expect(await proc.exited).toBe(0);
  });
});
