import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { loadedLine } from "../src/cli.ts";
import { parseConfig } from "../src/config.ts";
import { buildRegistry, checkMarkdown, fixMarkdownReport, loadConfig, setUp, UsageError } from "../src/index.ts";
import { findProjectRoot } from "../src/project.ts";
import { FIX_ORDER, RULES } from "../src/rules/index.ts";
import { BUILTIN_CATEGORIES } from "../src/rules/registry.ts";
import { runCli, tempProject } from "./helpers.ts";

const registryFor = (rules: unknown) =>
  buildRegistry({
    rules: RULES,
    fixOrder: FIX_ORDER,
    categories: BUILTIN_CATEGORIES,
    config: parseConfig("test.json", { rules }),
  });

describe("parseConfig", () => {
  test("accepts a severity, or a severity with options", () => {
    const config = parseConfig("c.json", {
      rules: { "sentence-one-per-line": "off", "sentence-word-budget-exceeded": ["error", { maxWords: 30 }] },
    });
    expect(config.rules.get("sentence-one-per-line")).toEqual({ severity: "off", options: {} });
    expect(config.rules.get("sentence-word-budget-exceeded")).toEqual({ severity: "error", options: { maxWords: 30 } });
  });

  test.each([
    ["a non-object config", [], /must be an object/],
    ["an unknown top-level key", { rulez: {} }, /unknown key "rulez"/],
    ["plugins that are not strings", { plugins: [1] }, /"plugins" must be a list of strings, or false/],
    ["rules that are not an object", { rules: [] }, /"rules" must be an object/],
    ["a severity that is not error or off", { rules: { x: "warn" } }, /use "error" or "off"/],
    ["a setting array of the wrong length", { rules: { x: [] } }, /must be "error", "off" or \[severity, options\]/],
    ["options that are not an object", { rules: { x: ["error", 5] } }, /options must be an object/],
  ])("rejects %s", (_name, raw, message) => {
    expect(() => parseConfig("c.json", raw)).toThrow(message);
    expect(() => parseConfig("c.json", raw)).toThrow(UsageError);
  });

  test("plugins can be switched off outright", () => {
    expect(parseConfig("c.json", { plugins: false }).plugins).toBe(false);
  });
});

describe("registry rule control", () => {
  test("a rule that is off loses its check", async () => {
    const registry = registryFor({ "punctuation-em-dash-in-prose": "off" });
    expect(await checkMarkdown("A tell — here.\n", "doc.md", undefined, registry)).toEqual([]);
  });

  test("a rule that is off loses its fixer, so --fix leaves the text alone", async () => {
    const registry = registryFor({ "punctuation-em-dash-in-prose": "off" });
    expect((await fixMarkdownReport("A tell — here.\n", registry)).output).toBe("A tell — here.\n");
  });

  test.each([
    ["a retired PG id", { PG001: "off" }, /unknown rule "PG001"/],
    ["an option the rule does not take", { "sentence-one-per-line": ["error", { x: 1 }] }, /it takes no options/],
    [
      "an option of the wrong type",
      { "sentence-word-budget-exceeded": ["error", { maxWords: "ten" }] },
      /must be a number/,
    ],
    ["a budget below one", { "sentence-word-budget-exceeded": ["error", { maxWords: 0 }] }, /must be at least 1/],
    [
      "an unknown option on a rule that takes one",
      { "sentence-word-budget-exceeded": ["error", { words: 3 }] },
      /it accepts maxWords/,
    ],
  ])("rejects %s with a usage error", (_name, rules, message) => {
    expect(() => registryFor(rules)).toThrow(message);
    expect(() => registryFor(rules)).toThrow(UsageError);
  });

  test("the budget comes from the rule option when no flag is given", async () => {
    const registry = registryFor({ "sentence-word-budget-exceeded": ["error", { maxWords: 5 }] });
    const src = "One two three four five six seven eight.\n";
    expect((await checkMarkdown(src, "doc.md", undefined, registry)).map((f) => f.rule)).toContain(
      "sentence-word-budget-exceeded",
    );
    expect(await checkMarkdown(src, "doc.md", 50, registry)).toEqual([]);
  });
});

describe("a switched-off rule never hides what another rule defers to it", () => {
  const run = "Tools: fmt · vet · race.\n";
  const rulesIn = async (registry: ReturnType<typeof registryFor>, src: string): Promise<string[]> =>
    (await checkMarkdown(src, "doc.md", undefined, registry)).map((f) => f.rule);

  test("with the flat list rule on, the run is reported once and the glyph rule stays quiet", async () => {
    expect(await rulesIn(registryFor({}), run)).toEqual(["list-interpunct-joined-run"]);
  });

  test("with the flat list rule off, the glyph rule reports instead", async () => {
    const found = await rulesIn(registryFor({ "list-interpunct-joined-run": "off" }), run);
    expect(found).toContain("punctuation-interpunct-in-prose");
    expect(found).not.toContain("list-interpunct-joined-run");
  });

  test("with the stacked list rule off, a stacked run is reported by the glyph rule", async () => {
    const stacked = "Tools: fmt · vet · race\nChecks: a · b · c\n";
    const found = await rulesIn(registryFor({ "list-stacked-interpunct-runs": "off" }), stacked);
    expect(found).toContain("punctuation-interpunct-in-prose");
  });

  test("with both list rules off the run is still reported by something", async () => {
    const registry = registryFor({ "list-interpunct-joined-run": "off", "list-stacked-interpunct-runs": "off" });
    expect((await rulesIn(registry, run)).length).toBeGreaterThan(0);
  });
});

describe("findProjectRoot", () => {
  test("is the nearest ancestor with a package.json, a config or a .prose-gates directory", async () => {
    const root = tempProject({ "package.json": "{}", "docs/deep/a.md": "x\n" });
    expect(await findProjectRoot(join(root, "docs", "deep"))).toBe(root);
    const byDir = tempProject({ ".prose-gates/rules/.keep": "", "docs/a.md": "x\n" });
    expect(await findProjectRoot(join(byDir, "docs"))).toBe(byDir);
    const byConfig = tempProject({ "prose-gates.config.json": "{}", "docs/a.md": "x\n" });
    expect(await findProjectRoot(join(byConfig, "docs"))).toBe(byConfig);
  });
});

describe("the CLI reads a config", () => {
  test("a config at the project root switches a rule off", async () => {
    const root = tempProject({
      "package.json": "{}",
      "prose-gates.config.json": JSON.stringify({ rules: { "punctuation-em-dash-in-prose": "off" } }),
      "a.md": "A tell — here.\n",
    });
    expect((await runCli(root, ["a.md"])).code).toBe(0);
  });

  test("--config points at another file", async () => {
    const root = tempProject({
      "package.json": "{}",
      "other.json": JSON.stringify({ rules: { "punctuation-em-dash-in-prose": "off" } }),
      "a.md": "A tell — here.\n",
    });
    expect((await runCli(root, ["a.md"])).code).toBe(1);
    expect((await runCli(root, ["a.md", "--config", "other.json"])).code).toBe(0);
  });

  test("--config to a missing file is a usage error", async () => {
    const root = tempProject({ "package.json": "{}", "a.md": "ok.\n" });
    const { code, stderr } = await runCli(root, ["a.md", "--config", "nope.json"]);
    expect(code).toBe(2);
    expect(stderr).toContain("no such file");
  });

  test("a retired id in the config fails the run with exit 2", async () => {
    const root = tempProject({
      "package.json": "{}",
      "prose-gates.config.json": JSON.stringify({ rules: { PG004: "off" } }),
      "a.md": "ok.\n",
    });
    const { code, stderr } = await runCli(root, ["a.md"]);
    expect(code).toBe(2);
    expect(stderr).toContain('unknown rule "PG004"');
  });

  test("a .mjs config works and a malformed .json one is a usage error", async () => {
    const mjs = tempProject({
      "package.json": "{}",
      "prose-gates.config.mjs": 'export default { rules: { "punctuation-em-dash-in-prose": "off" } };\n',
      "a.md": "A tell — here.\n",
    });
    expect((await runCli(mjs, ["a.md"])).code).toBe(0);
    const bad = tempProject({ "package.json": "{}", "prose-gates.config.json": "{ not json", "a.md": "ok.\n" });
    expect((await runCli(bad, ["a.md"])).code).toBe(2);
  });

  test("two config files at one root are ambiguous", async () => {
    const root = tempProject({
      "package.json": "{}",
      "prose-gates.config.json": "{}",
      "prose-gates.config.mjs": "export default {};\n",
      "a.md": "ok.\n",
    });
    const { code, stderr } = await runCli(root, ["a.md"]);
    expect(code).toBe(2);
    expect(stderr).toContain("more than one config file");
  });

  test("the --max-words flag wins over the rule option", async () => {
    const long = "One two three four five six seven eight.\n";
    const root = tempProject({
      "package.json": "{}",
      "prose-gates.config.json": JSON.stringify({
        rules: { "sentence-word-budget-exceeded": ["error", { maxWords: 5 }] },
      }),
      "a.md": long,
    });
    expect((await runCli(root, ["a.md"])).code).toBe(1);
    expect((await runCli(root, ["a.md", "--max-words", "50"])).code).toBe(0);
  });

  test("an unreadable config extension is a usage error", async () => {
    const root = tempProject({ "package.json": "{}", "c.yaml": "rules: {}\n", "a.md": "ok.\n" });
    expect((await runCli(root, ["a.md", "--config", "c.yaml"])).code).toBe(2);
  });
});

describe("loading a config in process", () => {
  test("reads .json and .mjs, and refuses anything else", async () => {
    const root = tempProject({
      "c.json": JSON.stringify({ rules: { "sentence-one-per-line": "off" } }),
      "c.mjs": "export default { plugins: false };\n",
      "bad.json": "{ nope",
      "c.yaml": "rules: {}\n",
    });
    expect((await loadConfig(join(root, "c.json"))).rules.get("sentence-one-per-line")?.severity).toBe("off");
    expect((await loadConfig(join(root, "c.mjs"))).plugins).toBe(false);
    await expect(loadConfig(join(root, "bad.json"))).rejects.toThrow(UsageError);
    await expect(loadConfig(join(root, "c.yaml"))).rejects.toThrow(/a .json or .mjs file/);
  });

  test("setUp reports a missing --config file as a usage error", async () => {
    const root = tempProject({ "package.json": "{}" });
    await expect(setUp({ cwd: root, configPath: "nope.json" })).rejects.toThrow(UsageError);
  });
});

describe("loadedLine", () => {
  const source = (rules: number) => ({
    kind: "local" as const,
    spec: ".prose-gates/rules",
    namespace: "local",
    rules: Array.from({ length: rules }, (_, i) => `local/sentence-r${i}` as const),
  });

  test("is silent for a project with no plugins", () => {
    expect(loadedLine([], [])).toBeNull();
  });

  test("names each namespace and counts its rules", () => {
    expect(loadedLine([source(1), { ...source(2), namespace: "acme" }], [])).toBe(
      "prose-gates: loaded local (1 rule), acme (2 rules)",
    );
  });

  test("says what was skipped when plugins are off", () => {
    const skipped = ["prose-gates-plugin-acme"];
    expect(loadedLine([], skipped)).toBe("prose-gates: plugins off; skipped prose-gates-plugin-acme");
  });
});
