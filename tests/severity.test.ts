// A rule reports as an error, a warning or not at all. The engine stamps the severity on every finding, a
// warning never changes the exit code, and a rule may start off or at warn until the config says otherwise.

import { describe, expect, test } from "bun:test";
import { listRules } from "../src/cli.ts";
import { checkMarkdown, parseConfig } from "../src/index.ts";
import { BUILTIN_CATEGORIES, buildRegistry } from "../src/rules/registry.ts";
import type { Finding, Rule } from "../src/rules/types.ts";
import { runCli, tempProject } from "./helpers.ts";

// A real rule that reports every paragraph that holds the word TODO.
const todoRule = (id: string, defaultSeverity?: Rule["defaultSeverity"]): Rule => ({
  id: id as Rule["id"],
  category: "phrase",
  summary: "a TODO left in the text",
  ...(defaultSeverity ? { defaultSeverity } : {}),
  check: ({ doc, file }): Finding[] =>
    doc.paragraphs
      .filter((p) => p.prose.includes("TODO"))
      .map((p) => ({
        file,
        line: p.line,
        rule: id as Rule["id"],
        message: "TODO left in",
        evidence: "TODO",
        instruction: "Finish the thought or delete the marker.",
        preserve: "Every fact around it.",
      })),
});

const registryOf = (rules: Rule[], settings: Record<string, unknown> = {}) =>
  buildRegistry({
    rules,
    fixOrder: [],
    categories: BUILTIN_CATEGORIES,
    config: parseConfig("c.json", { rules: settings }),
  });

describe("severity of a rule", () => {
  test("is error until something says otherwise", () => {
    const registry = registryOf([todoRule("local/todo-left-behind")]);
    expect(registry.severities.get("local/todo-left-behind" as never)).toBe("error");
  });

  test("takes the rule's own default", () => {
    const registry = registryOf([todoRule("local/todo-left-behind", "warn")]);
    expect(registry.severities.get("local/todo-left-behind" as never)).toBe("warn");
  });

  test("lets the config beat the rule's default, both ways", () => {
    const up = registryOf([todoRule("local/todo-left-behind", "warn")], { "local/todo-left-behind": "error" });
    const down = registryOf([todoRule("local/todo-left-behind")], { "local/todo-left-behind": "warn" });
    expect(up.severities.get("local/todo-left-behind" as never)).toBe("error");
    expect(down.severities.get("local/todo-left-behind" as never)).toBe("warn");
  });

  test("starts a rule off, and the config turns it on", async () => {
    const rule = todoRule("local/todo-left-behind", "off");
    const off = registryOf([rule]);
    expect(off.rules).toHaveLength(0);
    expect(off.catalogue).toHaveLength(1);
    expect(await checkMarkdown("A TODO here.\n", "doc.md", undefined, off)).toEqual([]);
    const on = registryOf([rule], { "local/todo-left-behind": "warn" });
    expect(await checkMarkdown("A TODO here.\n", "doc.md", undefined, on)).toHaveLength(1);
  });

  test("keeps the options a config gives a rule that is on", () => {
    const registry = registryOf([todoRule("local/todo-left-behind", "off")], {
      "local/todo-left-behind": ["warn", {}],
    });
    expect(registry.enabled.has("local/todo-left-behind" as never)).toBe(true);
  });
});

describe("findings carry their severity and the parts of an instruction", () => {
  test("stamps the registry's severity on each finding", async () => {
    const registry = registryOf([todoRule("local/todo-left-behind", "warn")]);
    const [finding] = await checkMarkdown("A TODO here.\n", "doc.md", undefined, registry);
    expect(finding).toEqual({
      file: "doc.md",
      line: 1,
      rule: "local/todo-left-behind",
      message: "TODO left in",
      severity: "warn",
      evidence: "TODO",
      instruction: "Finish the thought or delete the marker.",
      preserve: "Every fact around it.",
    });
  });

  test("stamps findings found inside a markdown fence", async () => {
    const registry = registryOf([todoRule("local/todo-left-behind", "warn")]);
    const found = await checkMarkdown("```markdown\nA TODO here.\n```\n", "doc.md", undefined, registry);
    expect(found.map((f) => f.severity)).toEqual(["warn"]);
  });
});

describe("the CLI", () => {
  const config = (rules: Record<string, unknown>): Record<string, string> => ({
    "package.json": "{}",
    "prose-gates.config.json": JSON.stringify({ rules }),
  });

  test("exits 0 when only warnings remain, and says so", async () => {
    const root = tempProject({
      ...config({ "punctuation-em-dash-in-prose": "warn" }),
      "a.md": "A fix — here.\n\nThe parser reads the file.\n",
    });
    const { code, stdout } = await runCli(root, ["a.md"]);
    expect(code).toBe(0);
    expect(stdout).toContain("a.md:1 punctuation-em-dash-in-prose (warn) ");
    expect(stdout).toContain("1 finding(s) in 1 file(s) (0 errors, 1 warning)");
  });

  test("exits 1 when an error remains beside a warning", async () => {
    const root = tempProject({
      ...config({ "punctuation-em-dash-in-prose": "warn" }),
      "a.md": "A fix — here.\n\nWritten in TypeScript · run on Bun.\n",
    });
    const { code, stdout } = await runCli(root, ["a.md"]);
    expect(code).toBe(1);
    expect(stdout).toContain("2 finding(s) in 1 file(s) (1 error, 1 warning)");
  });

  test("keeps the old summary line when nothing warns", async () => {
    const root = tempProject({ "package.json": "{}", "a.md": "A fix — here.\n" });
    const { code, stdout } = await runCli(root, ["a.md"]);
    expect(code).toBe(1);
    expect(stdout).toContain("1 finding(s) in 1 file(s)\n");
    expect(stdout).not.toContain("warning");
  });

  test("puts severity and the counts in the JSON", async () => {
    const root = tempProject({
      ...config({ "punctuation-em-dash-in-prose": "warn" }),
      "a.md": "A fix — here.\n\nWritten in TypeScript · run on Bun.\n",
    });
    const { stdout } = await runCli(root, ["a.md", "--json"]);
    const out = JSON.parse(stdout) as { findings: Finding[]; errors: number; warnings: number };
    expect(out.errors).toBe(1);
    expect(out.warnings).toBe(1);
    expect(out.findings.map((f) => [f.rule, f.severity])).toEqual([
      ["punctuation-em-dash-in-prose", "warn"],
      ["punctuation-interpunct-in-prose", "error"],
    ]);
  });

  test("lists a rule that starts off under the off heading", () => {
    const registry = registryOf([todoRule("local/todo-left-behind", "off")]);
    const text = listRules(registry);
    expect(text).toContain('off (set "warn" or "error" in the config to turn one on):');
    expect(text.split("off (set")[1]).toContain("local/todo-left-behind");
  });

  test("tags a warning rule in the listing", () => {
    const registry = registryOf([todoRule("local/todo-left-behind", "warn")]);
    expect(listRules(registry)).toContain("a TODO left in the text (warn)");
  });
});
