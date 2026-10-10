// A rule is on and fails the run, or it is off. There is no level in between, because a finding that does
// not fail the run is a finding nobody reads (PRS-0035). A rule may start off until a project turns it on.

import { describe, expect, test } from "bun:test";
import { listRules } from "../src/cli.ts";
import { checkMarkdown, parseConfig } from "../src/index.ts";
import { BUILTIN_CATEGORIES, buildRegistry } from "../src/rules/registry.ts";
import type { Finding, Rule } from "../src/rules/types.ts";
import { runCli, tempProject } from "./helpers.ts";

const ID = "local/todo-left-behind" as Rule["id"];

// A real rule that reports every paragraph that holds the word TODO.
const todoRule = (defaultSeverity?: Rule["defaultSeverity"]): Rule => ({
  id: ID,
  category: "phrase",
  summary: "a TODO left in the text",
  ...(defaultSeverity ? { defaultSeverity } : {}),
  check: ({ doc, file }): Finding[] =>
    doc.paragraphs
      .filter((p) => p.prose.includes("TODO"))
      .map((p) => ({
        file,
        line: p.line,
        rule: ID,
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

describe("whether a rule is on", () => {
  test("is on until something says otherwise", () => {
    expect(registryOf([todoRule()]).levels.get(ID)).toBe("error");
  });

  test("takes the rule's own default", () => {
    expect(registryOf([todoRule("off")]).levels.get(ID)).toBe("off");
  });

  test("lets the config beat the rule's default, both ways", () => {
    expect(registryOf([todoRule("off")], { [ID]: "error" }).levels.get(ID)).toBe("error");
    expect(registryOf([todoRule()], { [ID]: "off" }).levels.get(ID)).toBe("off");
  });

  test("starts a rule off, and the config turns it on", async () => {
    const rule = todoRule("off");
    const off = registryOf([rule]);
    expect(off.rules).toHaveLength(0);
    expect(off.catalogue).toHaveLength(1);
    expect(await checkMarkdown("A TODO here.\n", "doc.md", undefined, off)).toEqual([]);
    const on = registryOf([rule], { [ID]: "error" });
    expect(await checkMarkdown("A TODO here.\n", "doc.md", undefined, on)).toHaveLength(1);
  });

  test("keeps the options a config gives a rule that is on", () => {
    expect(registryOf([todoRule("off")], { [ID]: ["error", {}] }).enabled.has(ID)).toBe(true);
  });
});

describe("a config that asks for a warning", () => {
  test.each(["warn", "warning"])("is refused, with the reason, for %s", (level) => {
    expect(() => parseConfig("c.json", { rules: { x: level } })).toThrow(/this tool has no warnings/);
  });

  test("is refused inside the severity-and-options form too", () => {
    expect(() => parseConfig("c.json", { rules: { x: ["warn", {}] } })).toThrow(/use "error" or "off"/);
  });

  test("exits 2 through the CLI, and names the rule and the file", async () => {
    const root = tempProject({
      "package.json": "{}",
      "prose-gates.config.json": JSON.stringify({ rules: { "phrase-staged-run-up": "warn" } }),
      "a.md": "A line.\n",
    });
    const { code, stderr } = await runCli(root, ["a.md"]);
    expect(code).toBe(2);
    expect(stderr).toContain('rule "phrase-staged-run-up"');
    expect(stderr).toContain("this tool has no warnings");
  });
});

describe("findings carry the parts of an instruction", () => {
  test("keeps what the rule gave, and adds nothing", async () => {
    const [finding] = await checkMarkdown("A TODO here.\n", "doc.md", undefined, registryOf([todoRule()]));
    expect(finding).toEqual({
      file: "doc.md",
      line: 1,
      rule: ID,
      message: "TODO left in",
      evidence: "TODO",
      instruction: "Finish the thought or delete the marker.",
      preserve: "Every fact around it.",
    });
  });

  test("finds a marker inside a markdown fence", async () => {
    const found = await checkMarkdown(
      "```markdown\nA TODO here.\n```\n",
      "doc.md",
      undefined,
      registryOf([todoRule()]),
    );
    expect(found).toHaveLength(1);
  });
});

describe("the CLI", () => {
  const withConfig = (rules: Record<string, unknown>, doc: string): string =>
    tempProject({ "package.json": "{}", "prose-gates.config.json": JSON.stringify({ rules }), "a.md": doc });

  test("exits 1 when any rule that is on finds something", async () => {
    const { code, stdout } = await runCli(withConfig({}, "Let's dive in.\n"), ["a.md"]);
    expect(code).toBe(1);
    expect(stdout).toContain("a.md:1 phrase-staged-run-up ");
    expect(stdout).toContain("1 finding(s) in 1 file(s)\n");
  });

  test("exits 0 when a rule that would find something is off", async () => {
    const { code, stdout } = await runCli(withConfig({ "phrase-staged-run-up": "off" }, "Let's dive in.\n"), ["a.md"]);
    expect(code).toBe(0);
    expect(stdout).toContain("0 finding(s)");
  });

  test("runs a rule that starts off once the config turns it on", async () => {
    const doc = "It could potentially possibly be argued that it helps.\n";
    expect((await runCli(withConfig({}, doc), ["a.md"])).code).toBe(0);
    expect((await runCli(withConfig({ "phrase-stacked-hedge-run": "error" }, doc), ["a.md"])).code).toBe(1);
  });

  test("keeps the JSON as it was, with no severity and no counts", async () => {
    const { stdout } = await runCli(withConfig({}, "Let's dive in.\n"), ["a.md", "--json"]);
    const out = JSON.parse(stdout) as Record<string, unknown> & { findings: Record<string, unknown>[] };
    expect(Object.keys(out).sort()).toEqual(["files", "findings", "plugins", "skippedPlugins"]);
    expect(out.findings[0]).not.toHaveProperty("severity");
    expect(out.findings[0]?.instruction).toBeString();
  });

  test("lists a rule that starts off under the off heading", () => {
    const text = listRules(registryOf([todoRule("off")]));
    expect(text).toContain('off (set "error" in the config to turn one on):');
    expect(text.split("off (set")[1]).toContain(ID);
  });

  test("lists a rule that is on under its category, with no level beside it", () => {
    const text = listRules(registryOf([todoRule()]));
    expect(text).toContain("a TODO left in the text");
    expect(text).not.toContain("(warn)");
    expect(text).not.toContain("off (set");
  });
});
