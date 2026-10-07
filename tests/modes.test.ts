// How a failure is named and how strictly plugins load: every error is a class
// with a stable code, lenient loading skips a failed plugin and says so, and
// validation loads everything and runs no check or fix.

import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { findConfig, parseConfig } from "../src/config.ts";
import {
  AmbiguousConfigError,
  buildRegistry,
  ConfigFileError,
  ConfigNotFoundError,
  ConfigShapeError,
  checkMarkdown,
  fixMarkdownReport,
  loadConfig,
  PluginConflictError,
  PluginContractError,
  PluginFixerError,
  type PluginImportError,
  PluginLoadError,
  type PluginNotInstalledError,
  PluginSourceError,
  ProseGatesError,
  RuleOptionError,
  RuleSettingError,
  setUp,
  UnknownRuleError,
  UsageError,
} from "../src/index.ts";
import { loadLocal } from "../src/plugins/load.ts";
import { canImportTypeScript } from "../src/plugins/runtime.ts";
import { FIX_ORDER, RULES } from "../src/rules/index.ts";
import { BUILTIN_CATEGORIES } from "../src/rules/registry.ts";
import { PROJECT_ROOT, runCli, tempProject } from "./helpers.ts";

const PKG = { "package.json": JSON.stringify({ name: "demo" }) };

const todoRule = (category = "sentence", extra = ""): string => `
export default {
  category: "${category}",
  summary: "flags the word TODO",
  check: ({ doc }) => doc.src.split("\\n").flatMap((text, i) => (text.includes("TODO") ? [{ line: i + 1, message: "TODO left in" }] : [])),
  ${extra}
};
`;

const local = (name: string, source: string, ext = "mjs"): Record<string, string> => ({
  ...PKG,
  [`.prose-gates/rules/${name}.${ext}`]: source,
});

const caught = async (run: () => unknown): Promise<unknown> => {
  try {
    await run();
  } catch (err) {
    return err;
  }
  throw new Error("expected a throw");
};

const registryFor = (rules: unknown) =>
  buildRegistry({
    rules: RULES,
    fixOrder: FIX_ORDER,
    categories: BUILTIN_CATEGORIES,
    config: parseConfig("test.json", { rules }),
  });

describe("every failure is a named class with a stable code", () => {
  test("config errors are usage errors, each with its own code and the fields to act on", async () => {
    const shape = (await caught(() => parseConfig("c.json", { rulez: {} }))) as ConfigShapeError;
    expect(shape).toBeInstanceOf(ConfigShapeError);
    expect([shape.code, shape.key, shape.file]).toEqual(["config-shape", "rulez", "c.json"]);

    const setting = (await caught(() => parseConfig("c.json", { rules: { x: "warn" } }))) as RuleSettingError;
    expect(setting).toBeInstanceOf(RuleSettingError);
    expect([setting.code, setting.rule]).toEqual(["rule-setting", "x"]);

    const unknown = (await caught(() => registryFor({ PG004: "off" }))) as UnknownRuleError;
    expect(unknown).toBeInstanceOf(UnknownRuleError);
    expect([unknown.code, unknown.rule]).toEqual(["unknown-rule", "PG004"]);
    expect(unknown.known).toContain("punctuation-em-dash-in-prose");

    const option = (await caught(() =>
      registryFor({ "sentence-one-per-line": ["error", { x: 1 }] }),
    )) as RuleOptionError;
    expect(option).toBeInstanceOf(RuleOptionError);
    expect([option.code, option.rule, option.option]).toEqual(["rule-option", "sentence-one-per-line", "x"]);

    for (const err of [shape, setting, unknown, option]) {
      expect(err).toBeInstanceOf(UsageError);
      expect(err).toBeInstanceOf(ProseGatesError);
      expect(err.name).toBe(err.constructor.name);
    }
  });

  test("file-level config errors say which file and why", async () => {
    const root = tempProject({
      "bad.json": "{ nope",
      "boom.mjs": "throw new Error('kaboom');\n",
      "c.yaml": "rules: {}\n",
      "a/prose-gates.config.json": "{}",
      "a/prose-gates.config.mjs": "export default {};\n",
    });
    const badJson = (await caught(() => loadConfig(join(root, "bad.json")))) as ConfigFileError;
    expect(badJson).toBeInstanceOf(ConfigFileError);
    expect([badJson.code, badJson.file]).toEqual(["config-file", join(root, "bad.json")]);

    const boom = (await caught(() => loadConfig(join(root, "boom.mjs")))) as ConfigFileError;
    expect(boom.message).toContain("could not be imported: kaboom");

    const extension = (await caught(() => loadConfig(join(root, "c.yaml")))) as ConfigFileError;
    expect(extension.message).toContain("a config is a .json or .mjs file");

    const both = (await caught(() => findConfig(join(root, "a")))) as AmbiguousConfigError;
    expect(both).toBeInstanceOf(AmbiguousConfigError);
    expect([both.code, both.files]).toEqual([
      "config-ambiguous",
      [join(root, "a", "prose-gates.config.json"), join(root, "a", "prose-gates.config.mjs")],
    ]);

    const missing = (await caught(() => setUp({ cwd: root, configPath: "nope.json" }))) as ConfigNotFoundError;
    expect(missing).toBeInstanceOf(ConfigNotFoundError);
    expect([missing.code, missing.path]).toEqual(["config-not-found", "nope.json"]);
  });

  test("plugin errors are load errors, each with its own code", async () => {
    const contract = (await caught(() =>
      setUp({ cwd: tempProject(local("no-todo", todoRule())) }),
    )) as PluginContractError;
    expect(contract).toBeInstanceOf(PluginContractError);
    expect(contract).toBeInstanceOf(PluginLoadError);
    expect(contract).not.toBeInstanceOf(UsageError);
    expect([contract.code, contract.source]).toEqual(["plugin-contract", join(".prose-gates", "rules", "no-todo.mjs")]);

    const imported = (await caught(() =>
      setUp({ cwd: tempProject(local("sentence-boom", "throw new Error('kaboom');\n")) }),
    )) as PluginImportError;
    expect([imported.code, imported.message]).toEqual([
      "plugin-import",
      expect.stringContaining("could not be imported: kaboom"),
    ]);

    const missing = (await caught(() =>
      setUp({
        cwd: tempProject({ "package.json": JSON.stringify({ dependencies: { "prose-gates-plugin-acme": "1" } }) }),
      }),
    )) as PluginNotInstalledError;
    expect([missing.code, missing.source]).toEqual(["plugin-not-installed", "prose-gates-plugin-acme"]);
    expect(missing.root).toBeString();
  });

  test("a clash names both plugins", async () => {
    const plugin = (key: string) =>
      `export default { meta: { name: "n", namespace: "same", apiVersion: 1 }, rules: { "${key}": ${todoRule().replace("export default ", "").trim().replace(/;$/, "")} } };\n`;
    const root = tempProject({
      "package.json": JSON.stringify({ dependencies: { "prose-gates-plugin-a": "1", "prose-gates-plugin-b": "1" } }),
      "node_modules/prose-gates-plugin-a/package.json": JSON.stringify({ main: "i.mjs" }),
      "node_modules/prose-gates-plugin-a/i.mjs": plugin("sentence-x"),
      "node_modules/prose-gates-plugin-b/package.json": JSON.stringify({ main: "i.mjs" }),
      "node_modules/prose-gates-plugin-b/i.mjs": plugin("sentence-y"),
    });
    const clash = (await caught(() => setUp({ cwd: root }))) as PluginConflictError;
    expect(clash).toBeInstanceOf(PluginConflictError);
    expect([clash.code, clash.source, clash.other]).toEqual([
      "plugin-conflict",
      "prose-gates-plugin-b",
      "prose-gates-plugin-a",
    ]);
  });

  test("a fixer that throws is a PluginFixerError, which stops the run", async () => {
    const files = local("sentence-fixer", todoRule("sentence", 'fix: () => { throw new Error("nope"); },'));
    const registry = (await setUp({ cwd: tempProject(files) })).registry;
    const err = (await caught(async () => await fixMarkdownReport("A TODO here.\n", registry))) as PluginFixerError;
    expect(err).toBeInstanceOf(PluginFixerError);
    expect([err.code, err.rule]).toEqual(["plugin-fixer", "local/sentence-fixer"]);
  });

  test("the CLI prints the code in brackets, and exits 2 for usage and 1 for a plugin", async () => {
    const usage = tempProject({
      ...PKG,
      "prose-gates.config.json": JSON.stringify({ rules: { PG004: "off" } }),
      "a.md": "ok.\n",
    });
    const u = await runCli(usage, ["a.md"]);
    expect([u.code, u.stderr]).toEqual([2, expect.stringContaining("error[unknown-rule]: ")]);

    const plugin = tempProject({ ...local("no-todo", todoRule()), "a.md": "ok.\n" });
    const p = await runCli(plugin, ["a.md"]);
    expect([p.code, p.stderr]).toEqual([1, expect.stringContaining("error[plugin-contract]: plugin ")]);

    const flag = await runCli(usage, ["--max-words", "zero", "a.md"]);
    expect([flag.code, flag.stderr]).toEqual([2, expect.stringContaining("error[flag]: --max-words must be")]);
    expect((await runCli(usage, [])).stderr).toContain("error[flag]: no files given");
  });
});

describe("lenient plugin loading", () => {
  const goodAndBad = (): Record<string, string> => ({
    ...local("sentence-good", todoRule()),
    ".prose-gates/rules/no-prefix.mjs": todoRule(),
    "a.md": "A TODO here.\n",
  });

  test("strict stops on the bad plugin, which is the default", async () => {
    const { code, stderr } = await runCli(tempProject(goodAndBad()), ["a.md"]);
    expect(code).toBe(1);
    expect(stderr).toContain("error[plugin-contract]");
  });

  test("--lenient-plugins skips only the bad one, says so, and runs the rest", async () => {
    const { code, stdout, stderr } = await runCli(tempProject(goodAndBad()), ["a.md", "--lenient-plugins"]);
    expect(code).toBe(1);
    expect(stdout).toContain("a.md:1 local/sentence-good TODO left in");
    expect(stderr).toContain("prose-gates: loaded local (1 rule)");
    expect(stderr).toContain(
      'prose-gates: skipped plugin .prose-gates/rules/no-prefix.mjs [plugin-contract]: rule "no-prefix" must start with its category',
    );
  });

  test("a clean lenient run exits 0 even though a plugin was skipped", async () => {
    const files = { ...goodAndBad(), "a.md": "Fine.\n" };
    const { code, stderr } = await runCli(tempProject(files), ["a.md", "--lenient-plugins"]);
    expect(code).toBe(0);
    expect(stderr).toContain("skipped plugin");
  });

  test("a package that is not installed is skipped", async () => {
    const files = {
      "package.json": JSON.stringify({ dependencies: { "prose-gates-plugin-acme": "1" } }),
      "a.md": "A tell — here.\n",
    };
    const { code, stdout, stderr } = await runCli(tempProject(files), ["a.md", "--lenient-plugins"]);
    expect(code).toBe(1);
    expect(stdout).toContain("punctuation-em-dash-in-prose");
    expect(stderr).toContain("skipped plugin prose-gates-plugin-acme [plugin-not-installed]");
  });

  test("when two plugins clash, the first keeps the namespace and the second is skipped", async () => {
    const plugin = (key: string) =>
      `export default { meta: { name: "n", namespace: "same", apiVersion: 1 }, rules: { "${key}": ${todoRule().replace("export default ", "").trim().replace(/;$/, "")} } };\n`;
    const root = tempProject({
      "package.json": JSON.stringify({ dependencies: { "prose-gates-plugin-a": "1", "prose-gates-plugin-b": "1" } }),
      "node_modules/prose-gates-plugin-a/package.json": JSON.stringify({ main: "i.mjs" }),
      "node_modules/prose-gates-plugin-a/i.mjs": plugin("sentence-x"),
      "node_modules/prose-gates-plugin-b/package.json": JSON.stringify({ main: "i.mjs" }),
      "node_modules/prose-gates-plugin-b/i.mjs": plugin("sentence-y"),
    });
    const { registry, failures } = await setUp({ cwd: root, lenient: true });
    expect(registry.rules.map((r) => r.id)).toContain("same/sentence-x");
    expect(registry.rules.map((r) => r.id)).not.toContain("same/sentence-y");
    expect(failures.map((f) => [f.source, f.error.code])).toEqual([["prose-gates-plugin-b", "plugin-conflict"]]);
  });

  test("a bad local file does not hide the good ones, and a rule of a failed category file fails with it", async () => {
    const files = {
      ...PKG,
      ".prose-gates/rules/tone-a.mjs": `export const categories = { tone: "Voice" };\n${todoRule("tone")}`,
      ".prose-gates/rules/tone-b.mjs": "throw new Error('boom');\n",
      ".prose-gates/rules/sentence-ok.mjs": todoRule(),
    };
    const { registry, failures } = await setUp({ cwd: tempProject(files), lenient: true });
    expect(registry.rules.map((r) => r.id).filter((id) => id.startsWith("local/"))).toEqual([
      "local/sentence-ok",
      "local/tone-a",
    ]);
    expect(failures.map((f) => f.error.code)).toEqual(["plugin-import"]);
  });

  test("when every plugin fails, the built-in rules still run", async () => {
    const files = { ...local("no-prefix", todoRule()), "a.md": "A tell — here.\n" };
    const { code, stdout } = await runCli(tempProject(files), ["a.md", "--lenient-plugins"]);
    expect(code).toBe(1);
    expect(stdout).toContain("punctuation-em-dash-in-prose");
  });

  test('"pluginLoading": "lenient" in the config is the same as the flag', async () => {
    const files = { ...goodAndBad(), "prose-gates.config.json": JSON.stringify({ pluginLoading: "lenient" }) };
    const { code, stderr } = await runCli(tempProject(files), ["a.md"]);
    expect(code).toBe(1);
    expect(stderr).toContain("skipped plugin .prose-gates/rules/no-prefix.mjs");
  });

  test("a setting for a rule of a skipped plugin is dropped and said so, but a built-in typo still fails", async () => {
    const files = {
      ...local("no-prefix", todoRule()),
      "prose-gates.config.json": JSON.stringify({ rules: { "local/no-prefix": "off" } }),
      "a.md": "Fine.\n",
    };
    const ok = await runCli(tempProject(files), ["a.md", "--lenient-plugins"]);
    expect(ok.code).toBe(0);
    expect(ok.stderr).toContain("ignored config setting for local/no-prefix");

    const typo = {
      ...local("no-prefix", todoRule()),
      "prose-gates.config.json": JSON.stringify({ rules: { PG004: "off" } }),
      "a.md": "Fine.\n",
    };
    expect((await runCli(tempProject(typo), ["a.md", "--lenient-plugins"])).code).toBe(2);
  });

  test("--json lists the skipped plugins with their codes", async () => {
    const out = JSON.parse((await runCli(tempProject(goodAndBad()), ["a.md", "--lenient-plugins", "--json"])).stdout);
    expect(out.skippedPlugins).toEqual([
      expect.objectContaining({
        source: join(".prose-gates", "rules", "no-prefix.mjs"),
        kind: "local",
        code: "plugin-contract",
      }),
    ]);
    expect(out.plugins.map((p: { namespace: string }) => p.namespace)).toEqual(["local"]);
  });

  test("lenient and no-plugins contradict each other", async () => {
    const { code, stderr } = await runCli(tempProject({ ...PKG, "a.md": "ok.\n" }), [
      "a.md",
      "--no-plugins",
      "--lenient-plugins",
    ]);
    expect(code).toBe(2);
    expect(stderr).toContain("error[flag]: --no-plugins and --lenient-plugins contradict each other");
  });

  test('"pluginLoading" must be strict or lenient', () => {
    expect(() => parseConfig("c.json", { pluginLoading: "sloppy" })).toThrow(ConfigShapeError);
    expect(parseConfig("c.json", {}).pluginLoading).toBe("strict");
  });
});

describe("--validate-plugins", () => {
  // A rule that leaves a file behind when it runs, so a test can see whether it ran.
  const marker = (root: string): string => join(root, "ran.txt");
  const probing = (root: string): string => `
import { writeFileSync } from "node:fs";
export default {
  category: "sentence",
  summary: "leaves a marker when it runs",
  check: () => { writeFileSync(${JSON.stringify(marker(root))}, "check"); return []; },
  fix: () => { writeFileSync(${JSON.stringify(marker(root))}, "fix"); return []; },
};
`;

  test("loads and checks every plugin and runs no check and no fix", async () => {
    const root = tempProject({ ...PKG, "a.md": "A TODO here.\n" });
    const { writeFileSync, mkdirSync } = await import("node:fs");
    mkdirSync(join(root, ".prose-gates", "rules"), { recursive: true });
    writeFileSync(join(root, ".prose-gates", "rules", "sentence-probe.mjs"), probing(root));

    const validated = await runCli(root, ["--validate-plugins"]);
    expect(validated.code).toBe(0);
    expect(validated.stdout).toContain("prose-gates: plugins valid: local (1 rule)");
    expect(existsSync(marker(root))).toBe(false);

    await runCli(root, ["a.md", "--fix"]);
    expect(existsSync(marker(root))).toBe(true);
  });

  test("reports every failure at once with its code, and exits 1", async () => {
    const files = {
      ...local("no-prefix", todoRule()),
      ".prose-gates/rules/sentence-boom.mjs": "throw new Error('kaboom');\n",
      "package.json": JSON.stringify({ dependencies: { "prose-gates-plugin-acme": "1" } }),
    };
    const { code, stdout, stderr } = await runCli(tempProject(files), ["--validate-plugins"]);
    expect(code).toBe(1);
    expect(stdout).toBe("");
    expect(stderr).toContain("prose-gates: plugin validation failed, 3 of 3 sources");
    expect(stderr).toContain("[plugin-contract] .prose-gates/rules/no-prefix.mjs:");
    expect(stderr).toContain("[plugin-import] .prose-gates/rules/sentence-boom.mjs: could not be imported: kaboom");
    expect(stderr).toContain("[plugin-not-installed] prose-gates-plugin-acme:");
  });

  test("counts the sources that loaded when some fail", async () => {
    const files = { ...local("sentence-good", todoRule()), ".prose-gates/rules/no-prefix.mjs": todoRule() };
    const { stderr } = await runCli(tempProject(files), ["--validate-plugins"]);
    expect(stderr).toContain("validation failed, 1 of 2 sources");
  });

  test("says so when there is nothing to validate", async () => {
    const { code, stdout } = await runCli(tempProject(PKG), ["--validate-plugins"]);
    expect(code).toBe(0);
    expect(stdout).toContain("prose-gates: no plugins found");
  });

  test("--json gives the same result as data", async () => {
    const files = { ...local("sentence-good", todoRule()), ".prose-gates/rules/no-prefix.mjs": todoRule() };
    const out = JSON.parse((await runCli(tempProject(files), ["--validate-plugins", "--json"])).stdout);
    expect(out.valid).toBe(false);
    expect(out.plugins.map((p: { namespace: string }) => p.namespace)).toEqual(["local"]);
    expect(out.failures).toEqual([expect.objectContaining({ code: "plugin-contract", kind: "local" })]);
  });

  test("a config problem is still a usage error, not a plugin failure", async () => {
    const files = {
      ...local("sentence-good", todoRule()),
      "prose-gates.config.json": JSON.stringify({ rules: { PG004: "off" } }),
    };
    const { code, stderr } = await runCli(tempProject(files), ["--validate-plugins"]);
    expect(code).toBe(2);
    expect(stderr).toContain("error[unknown-rule]");
  });

  test.each([
    ["files", ["a.md"], "runs no check, so it takes no files"],
    ["--fix", ["--fix"], "takes no --no-plugins, --fix or --list-rules"],
    ["--no-plugins", ["--no-plugins"], "takes no --no-plugins, --fix or --list-rules"],
    ["--list-rules", ["--list-rules"], "takes no --no-plugins, --fix or --list-rules"],
  ])("rejects %s with a flag error", async (_name, extra, message) => {
    const { code, stderr } = await runCli(tempProject({ ...PKG, "a.md": "ok.\n" }), ["--validate-plugins", ...extra]);
    expect(code).toBe(2);
    expect(stderr).toContain(message);
  });

  test("works through the library too, collecting rather than throwing", async () => {
    const files = { ...local("sentence-good", todoRule()), ".prose-gates/rules/no-prefix.mjs": todoRule() };
    const { registry, failures } = await setUp({ cwd: tempProject(files), collect: true });
    expect(registry.sources.map((s) => s.namespace)).toEqual(["local"]);
    expect(failures).toHaveLength(1);
  });
});

describe("TypeScript local rules", () => {
  const tsRule = `
type Finding = { line: number; message: string };
const find = (src: string): Finding[] =>
  src.split("\\n").flatMap((text, i): Finding[] => (text.includes("TODO") ? [{ line: i + 1, message: "TODO left in" }] : []));

export default {
  category: "sentence",
  summary: "flags the word TODO, written in TypeScript",
  check: ({ doc }: { doc: { src: string } }): Finding[] => find(doc.src),
};
`;

  test("a .ts rule loads and runs where the runtime can import TypeScript", async () => {
    const files = local("sentence-no-todo", tsRule, "ts");
    const { registry } = await setUp({ cwd: tempProject(files) });
    expect((await checkMarkdown("A TODO here.\n", "doc.md", undefined, registry)).map((f) => f.rule)).toEqual([
      "local/sentence-no-todo",
    ]);
  });

  test("a .mts rule works the same, and a .d.ts file beside it is ignored", async () => {
    const files = {
      ...local("sentence-no-todo", tsRule, "mts"),
      ".prose-gates/rules/types.d.ts": "export type X = string;\n",
    };
    expect((await setUp({ cwd: tempProject(files) })).registry.rules.map((r) => r.id)).toContain(
      "local/sentence-no-todo",
    );
  });

  test("a .cts rule is refused with the reason", async () => {
    const err = (await caught(() =>
      setUp({ cwd: tempProject(local("sentence-no-todo", tsRule, "cts")) }),
    )) as PluginSourceError;
    expect(err).toBeInstanceOf(PluginSourceError);
    expect([err.code, err.message]).toEqual(["plugin-source", expect.stringContaining("so use .ts or .mts, not .cts")]);
  });

  test.each([
    ["Bun", { versions: { bun: "1.3.0" }, features: {} }, true],
    ["a Node that strips types", { versions: { node: "24.0.0" }, features: { typescript: "strip" } }, true],
    ["a Node that transforms types", { versions: { node: "24.0.0" }, features: { typescript: "transform" } }, true],
    ["a Node that cannot", { versions: { node: "20.11.0" }, features: {} }, false],
    ["a Node with the feature off", { versions: { node: "22.10.0" }, features: { typescript: false } }, false],
  ])("canImportTypeScript is right for %s", (_name, runtime, expected) => {
    expect(canImportTypeScript(runtime)).toBe(expected);
  });

  test("on a runtime that cannot, the .ts file fails with how to fix it, and a .mjs beside it still loads", async () => {
    const root = tempProject({
      ...local("sentence-no-todo", tsRule, "ts"),
      ".prose-gates/rules/sentence-plain.mjs": todoRule(),
    });
    const sources = ["sentence-no-todo.ts", "sentence-plain.mjs"].map((name) => ({
      kind: "local" as const,
      spec: join(".prose-gates", "rules", name),
      path: join(root, ".prose-gates", "rules", name),
    }));
    const noTypes = { versions: { node: "20.11.0" }, features: {} };
    const result = await loadLocal(sources, noTypes);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toBeInstanceOf(PluginSourceError);
    expect(result.failures[0]?.message).toContain("bunx --bun @jpeakai/prose-gates");
    expect(result.failures[0]?.message).toContain("Node 22.18 or newer");
    expect(Object.keys(result.plugin?.rules ?? {})).toEqual(["sentence-plain"]);
  });

  test("the Node bundle runs a .ts rule when this Node can, and says how to fix it when it cannot", async () => {
    const root = tempProject({ ...local("sentence-no-todo", tsRule, "ts"), "a.md": "A TODO here.\n" });
    const probe = Bun.spawn(["node", "-p", "Boolean(process.features.typescript)"], { stdout: "pipe" });
    const nodeCan = (await new Response(probe.stdout).text()).trim() === "true";
    const { code, stdout, stderr } = await runCli(root, ["a.md"], ["node", join(PROJECT_ROOT, "dist", "bin.js")]);
    if (nodeCan) {
      expect(code).toBe(1);
      expect(stdout).toContain("local/sentence-no-todo");
    } else {
      expect(code).toBe(1);
      expect(stderr).toContain("error[plugin-source]");
    }
  });
});

describe("the same paths in process", () => {
  const bad = (): string =>
    tempProject({
      ...local("sentence-good", todoRule()),
      ".prose-gates/rules/no-prefix.mjs": todoRule(),
      "a.md": "Fine.\n",
    });

  test("main returns the exit code of each mode", async () => {
    const root = bad();
    const { main } = await import("../src/index.ts");
    await expect(main([join(root, "a.md")], root)).rejects.toThrow(PluginContractError);
    expect(await main([join(root, "a.md"), "--lenient-plugins"], root)).toBe(0);
    expect(await main([join(root, "a.md"), "--lenient-plugins", "--json"], root)).toBe(0);
    expect(await main(["--validate-plugins"], root)).toBe(1);
    expect(await main(["--validate-plugins", "--json"], root)).toBe(1);
    expect(await main(["--list-rules", "--lenient-plugins"], root)).toBe(0);
    expect(await main(["--validate-plugins"], tempProject(PKG))).toBe(0);
    expect(await main(["--validate-plugins", "--json"], tempProject(local("sentence-good", todoRule())))).toBe(0);
    expect(await main(["--validate-plugins"], tempProject(local("sentence-good", todoRule())))).toBe(0);
  });

  test("flag mistakes exit 2", async () => {
    const root = bad();
    const { main } = await import("../src/index.ts");
    expect(await main([], root)).toBe(2);
    expect(await main(["--nope"], root)).toBe(2);
    expect(await main(["a.md", "--max-words", "0"], root)).toBe(2);
    expect(await main(["a.md", "--no-plugins", "--lenient-plugins"], root)).toBe(2);
    expect(await main(["--validate-plugins", "a.md"], root)).toBe(2);
    expect(await main(["--validate-plugins", "--fix"], root)).toBe(2);
  });

  test("a setting for a skipped plugin is dropped, and a built-in typo still fails, in process", () => {
    const config = parseConfig("c.json", { rules: { "gone/sentence-x": "off", "sentence-one-per-line": "off" } });
    const lenient = buildRegistry({
      rules: RULES,
      fixOrder: FIX_ORDER,
      categories: BUILTIN_CATEGORIES,
      config,
      ignoreUnknownPluginIds: true,
    });
    expect(lenient.ignoredSettings).toEqual(["gone/sentence-x"]);
    expect(lenient.rules.map((r) => r.id)).not.toContain("sentence-one-per-line");
    expect(() => buildRegistry({ rules: RULES, fixOrder: FIX_ORDER, categories: BUILTIN_CATEGORIES, config })).toThrow(
      UnknownRuleError,
    );
    const typo = parseConfig("c.json", { rules: { PG004: "off" } });
    expect(() =>
      buildRegistry({
        rules: RULES,
        fixOrder: FIX_ORDER,
        categories: BUILTIN_CATEGORIES,
        config: typo,
        ignoreUnknownPluginIds: true,
      }),
    ).toThrow(UnknownRuleError);
  });

  test("--no-plugins does not fail on a declared package that is not installed", async () => {
    const root = tempProject({ "package.json": JSON.stringify({ dependencies: { "prose-gates-plugin-acme": "1" } }) });
    const { registry, skipped } = await setUp({ cwd: root, noPlugins: true });
    expect(registry.sources).toEqual([]);
    expect(skipped).toEqual(["prose-gates-plugin-acme"]);
  });

  test("a declared package listed twice is reported once", async () => {
    const root = tempProject({
      "package.json": JSON.stringify({ dependencies: { "prose-gates-plugin-acme": "1" } }),
      "prose-gates.config.json": JSON.stringify({ plugins: ["prose-gates-plugin-acme"], pluginLoading: "lenient" }),
    });
    const { failures } = await setUp({ cwd: root });
    expect(failures.map((f) => f.source)).toEqual(["prose-gates-plugin-acme"]);
  });
});
