// Plugins and local rules, run against real project trees. A hostile plugin is
// the point of half of these: whatever a plugin does, a fix can never lose a
// word, and a plugin can never be skipped without saying so.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { checkMarkdown, FixInvariantError, fixMarkdownReport, setUp } from "../src/index.ts";
import { PROJECT_ROOT, runCli, tempProject } from "./helpers.ts";

const PKG = { "package.json": JSON.stringify({ name: "demo" }) };

// A rule module that flags the word TODO, in any category the caller names.
const todoRule = (category = "sentence", extra = ""): string => `
export default {
  category: "${category}",
  summary: "flags the word TODO",
  check: ({ doc }) => doc.src.split("\\n").flatMap((text, i) => (text.includes("TODO") ? [{ line: i + 1, message: "TODO left in" }] : [])),
  ${extra}
};
`;

const local = (name: string, source: string): Record<string, string> => ({
  ...PKG,
  [`.prose-gates/rules/${name}.mjs`]: source,
});

const registryOf = async (files: Record<string, string>) => (await setUp({ cwd: tempProject(files) })).registry;

const ids = async (files: Record<string, string>, src: string): Promise<string[]> =>
  (await checkMarkdown(src, "doc.md", undefined, await registryOf(files))).map((f) => f.rule);

const packageFiles = (name: string, plugin: string, extra: Record<string, unknown> = {}): Record<string, string> => ({
  [`node_modules/${name}/package.json`]: JSON.stringify({ name, type: "module", main: "index.mjs", ...extra }),
  [`node_modules/${name}/index.mjs`]: plugin,
});

const pluginSource = (namespace: string, rules: string, meta = ""): string => `
export default { meta: { name: "${namespace}", namespace: "${namespace}", apiVersion: 1, ${meta} }, rules: { ${rules} } };
`;

const withDeps = (deps: Record<string, string>, field = "dependencies"): Record<string, string> => ({
  "package.json": JSON.stringify({ name: "demo", [field]: deps }),
});

describe("local rules in .prose-gates/rules", () => {
  test("are found and applied with no config, under the local namespace", async () => {
    const files = local("sentence-no-todo", todoRule());
    expect(await ids(files, "Fix this TODO soon.\n")).toEqual(["local/sentence-no-todo"]);
    expect(await ids(files, "Nothing to do here.\n")).toEqual([]);
  });

  test("a rule may declare a new category from its own file", async () => {
    const files = local(
      "frontmatter-no-todo",
      `export const categories = { frontmatter: "Keys in the leading metadata block" };\n${todoRule("frontmatter")}`,
    );
    const { registry } = await setUp({ cwd: tempProject(files) });
    expect(registry.categories.get("frontmatter")).toBe("Keys in the leading metadata block");
    expect(registry.rules.map((r) => r.id)).toContain("local/frontmatter-no-todo");
  });

  test("two files may declare the same word with the same description", async () => {
    const decl = `export const categories = { tone: "Voice and register" };\n`;
    const files = {
      ...local("tone-a", decl + todoRule("tone")),
      ".prose-gates/rules/tone-b.mjs": decl + todoRule("tone"),
    };
    expect((await registryOf(files)).rules.filter((r) => r.id.startsWith("local/tone"))).toHaveLength(2);
  });

  test("two files that describe one word differently fail", async () => {
    const files = {
      ...local("tone-a", `export const categories = { tone: "One" };\n${todoRule("tone")}`),
      ".prose-gates/rules/tone-b.mjs": `export const categories = { tone: "Two" };\n${todoRule("tone")}`,
    };
    await expect(registryOf(files)).rejects.toThrow(/different description/);
  });

  test.each([
    [
      "a new category the file does not declare",
      "frontmatter-no-todo",
      todoRule("frontmatter"),
      /does not declare in meta.categories/,
    ],
    ["a key that does not start with its category", "no-todo", todoRule("sentence"), /must start with its category/],
    ["a category that is not one word", "bad-no-todo", todoRule("two words"), /one lower-case word/],
    ["a missing default export", "sentence-empty", "export const x = 1;\n", /no default export/],
    [
      "a missing check function",
      "sentence-none",
      'export default { category: "sentence", summary: "x" };\n',
      /needs a check function/,
    ],
    [
      "a missing summary",
      "sentence-none",
      'export default { category: "sentence", check: () => [] };\n',
      /needs a summary/,
    ],
    ["a fix that is not a function", "sentence-fx", todoRule("sentence", "fix: 1,"), /fix must be a function/],
    [
      "options that name no type",
      "sentence-op",
      todoRule("sentence", 'options: { n: "integer" },'),
      /options must map names/,
    ],
    [
      "a declared category that is built in",
      "sentence-bi",
      `export const categories = { list: "x" };\n${todoRule()}`,
      /is built in/,
    ],
    [
      "a category with no description",
      "sentence-nd",
      `export const categories = { tone: "" };\n${todoRule()}`,
      /needs a one-line description/,
    ],
    [
      "a category that is not a word",
      "sentence-nw",
      `export const categories = { "Tone!": "x" };\n${todoRule()}`,
      /not one lower-case word/,
    ],
    [
      "a module that throws on import",
      "sentence-boom",
      "throw new Error('kaboom');\n",
      /could not be imported: kaboom/,
    ],
    ["a rule that is not an object", "sentence-str", "export default 'nope';\n", /must be an object/],
    ["a key that is not valid", "Sentence-Bad", todoRule(), /not a valid key/],
  ])("fail loudly for %s", async (_name, file, source, message) => {
    await expect(registryOf(local(file, source))).rejects.toThrow(message);
  });

  test("other files in the directory are ignored", async () => {
    const files = { ...local("sentence-no-todo", todoRule()), ".prose-gates/rules/README.md": "notes\n" };
    expect((await registryOf(files)).rules.map((r) => r.id)).toContain("local/sentence-no-todo");
  });

  test("a project with no plugins has only the built-in rules", async () => {
    const { registry, skipped } = await setUp({ cwd: tempProject(PKG) });
    expect(registry.sources).toEqual([]);
    expect(skipped).toEqual([]);
  });
});

describe("the loaded line", () => {
  test("every run that loads a plugin says so on stderr", async () => {
    const root = tempProject({ ...local("sentence-no-todo", todoRule()), "a.md": "Fine.\n" });
    const { code, stderr } = await runCli(root, ["a.md"]);
    expect(code).toBe(0);
    expect(stderr).toContain("prose-gates: loaded local (1 rule)");
  });

  test("a run with no plugins prints nothing extra", async () => {
    const root = tempProject({ ...PKG, "a.md": "Fine.\n" });
    expect((await runCli(root, ["a.md"])).stderr).toBe("");
  });

  test("--json carries the same list", async () => {
    const root = tempProject({ ...local("sentence-no-todo", todoRule()), "a.md": "Fine.\n" });
    const out = JSON.parse((await runCli(root, ["a.md", "--json"])).stdout);
    expect(out.plugins).toEqual([
      { kind: "local", spec: ".prose-gates/rules", namespace: "local", rules: ["local/sentence-no-todo"] },
    ]);
  });

  test("a plugin finding exits 1 and names its id", async () => {
    const root = tempProject({ ...local("sentence-no-todo", todoRule()), "a.md": "A TODO here.\n" });
    const { code, stdout } = await runCli(root, ["a.md"]);
    expect(code).toBe(1);
    expect(stdout).toContain("a.md:1 local/sentence-no-todo TODO left in");
  });

  test("a load failure exits 1 with the reason", async () => {
    const root = tempProject({ ...local("no-todo", todoRule()), "a.md": "Fine.\n" });
    const { code, stderr } = await runCli(root, ["a.md"]);
    expect(code).toBe(1);
    expect(stderr).toContain("plugin .prose-gates/rules/no-todo.mjs");
  });
});

describe("turning plugins off", () => {
  const root = (): string => tempProject({ ...local("sentence-no-todo", todoRule()), "a.md": "A TODO here.\n" });

  test("--no-plugins runs built-ins only and names what it skipped", async () => {
    const { code, stderr } = await runCli(root(), ["a.md", "--no-plugins"]);
    expect(code).toBe(0);
    expect(stderr).toContain("plugins off; skipped .prose-gates/rules/sentence-no-todo.mjs");
  });

  test('"plugins": false in the config does the same', async () => {
    const dir = tempProject({
      ...local("sentence-no-todo", todoRule()),
      "prose-gates.config.json": JSON.stringify({ plugins: false }),
      "a.md": "A TODO here.\n",
    });
    expect((await runCli(dir, ["a.md"])).code).toBe(0);
  });

  test("a bad plugin does not stop a --no-plugins run", async () => {
    const dir = tempProject({ ...local("no-todo", todoRule()), "a.md": "Fine.\n" });
    expect((await runCli(dir, ["a.md", "--no-plugins"])).code).toBe(0);
  });
});

describe("rule control reaches plugin rules", () => {
  const base = local(
    "sentence-no-todo",
    todoRule("sentence", 'options: { word: "string" },')
      .replace('text.includes("TODO")', 'text.includes(options.word ?? "TODO")')
      .replace("({ doc })", "({ doc, options })"),
  );

  test("a plugin rule can be switched off by its full id", async () => {
    const files = {
      ...base,
      "prose-gates.config.json": JSON.stringify({ rules: { "local/sentence-no-todo": "off" } }),
    };
    expect(await ids(files, "A TODO here.\n")).toEqual([]);
  });

  test("a plugin rule receives its options, checked against its declared types", async () => {
    const files = {
      ...base,
      "prose-gates.config.json": JSON.stringify({ rules: { "local/sentence-no-todo": ["error", { word: "FIXME" }] } }),
    };
    expect(await ids(files, "A FIXME here.\n")).toEqual(["local/sentence-no-todo"]);
    expect(await ids(files, "A TODO here.\n")).toEqual([]);
    const wrong = {
      ...base,
      "prose-gates.config.json": JSON.stringify({ rules: { "local/sentence-no-todo": ["error", { word: 3 }] } }),
    };
    await expect(registryOf(wrong)).rejects.toThrow(/must be a string/);
  });

  test("an unknown plugin id in the config is a usage error", async () => {
    const files = { ...base, "prose-gates.config.json": JSON.stringify({ rules: { "local/nope": "off" } }) };
    await expect(registryOf(files)).rejects.toThrow(/unknown rule "local\/nope"/);
  });
});

describe("a hostile plugin check", () => {
  test("a check that throws becomes a finding for that rule and the others carry on", async () => {
    const files = local(
      "sentence-boom",
      'export default { category: "sentence", summary: "x", check: () => { throw new Error("boom"); } };\n',
    );
    const found = await checkMarkdown("A tell — here.\n", "doc.md", undefined, await registryOf(files));
    expect(found.map((f) => f.rule).sort()).toEqual(["local/sentence-boom", "punctuation-em-dash-in-prose"]);
    expect(found.find((f) => f.rule === "local/sentence-boom")?.message).toContain("threw: boom");
  });

  test.each([
    ["a non-list", "() => 'no'"],
    ["a finding with no line", "() => [{ message: 'x' }]"],
    ["a finding with a zero line", "() => [{ line: 0, message: 'x' }]"],
    ["a finding with no message", "() => [{ line: 1 }]"],
  ])("returning %s becomes a finding about the rule", async (_name, check) => {
    const files = local("sentence-bad", `export default { category: "sentence", summary: "x", check: ${check} };\n`);
    const found = await checkMarkdown("Fine.\n", "doc.md", undefined, await registryOf(files));
    expect(found).toHaveLength(1);
    expect(found[0]?.rule).toBe("local/sentence-bad");
    expect(found[0]?.message).toContain("returned something other than a list");
  });

  test("a finding cannot claim another rule's id or file", async () => {
    const files = local(
      "sentence-liar",
      'export default { category: "sentence", summary: "x", check: () => [{ line: 1, message: "m", rule: "list-comma-labelled-run", file: "other.md" }] };\n',
    );
    const [finding] = await checkMarkdown("Fine.\n", "doc.md", undefined, await registryOf(files));
    expect(finding).toEqual({ file: "doc.md", line: 1, rule: "local/sentence-liar", message: "m", severity: "error" });
  });
});

describe("a hostile plugin fixer", () => {
  // A fixer is written as a body over `doc`, returning edits.
  const fixer = (body: string): Record<string, string> =>
    local("sentence-fixer", todoRule("sentence", `fix: ({ doc }) => { ${body} },`));

  const run = async (body: string, src: string) => await fixMarkdownReport(src, await registryOf(fixer(body)));

  const swapTodo = (replacement: string, expect = 'expect: { kind: "same-shape" }'): string =>
    `const i = doc.src.indexOf("TODO"); if (i < 0) return []; return [{ start: i, end: i + 4, text: "${replacement}", ${expect} }];`;

  // The only fix a fixer may make is one that keeps every word: here, a run of
  // spaces collapses to one.
  const collapseSpaces =
    'const m = /  +/.exec(doc.src); if (!m) return []; return [{ start: m.index, end: m.index + m[0].length, text: " ", expect: { kind: "same-tree" } }];';

  test("an honest fix is applied and verified like a built-in", async () => {
    const out = await run(collapseSpaces, "A   TODO here.\n");
    expect(out.output).toBe("A TODO here.\n");
    expect(out.applied[0]?.rule).toBe("local/sentence-fixer");
  });

  test("a fixer that changes a word is stopped even when the change looks harmless", async () => {
    await expect(run(swapTodo("DONE"), "A TODO here.\n")).rejects.toThrow(/word 1 was "TODO", now "DONE"/);
  });

  test("a fixer that drops a word stops the run with FixInvariantError", async () => {
    await expect(run(swapTodo(""), "A TODO here.\n")).rejects.toThrow(FixInvariantError);
  });

  test("a fixer that adds a word stops the run with FixInvariantError", async () => {
    await expect(run(swapTodo("DONE NOW"), "A TODO here.\n")).rejects.toThrow(FixInvariantError);
  });

  test("a fixer that claims same-tree but moves structure is refused and the text is left alone", async () => {
    // Every word survives, but the space becomes a paragraph break.
    const body =
      'const i = doc.src.indexOf(" "); return i < 0 ? [] : [{ start: i, end: i + 1, text: "\\n\\n", expect: { kind: "same-tree" } }];';
    const out = await run(body, "A TODO here.\n");
    expect(out.output).toBe("A TODO here.\n");
    expect(out.refused).toHaveLength(1);
  });

  test.each([
    ["past the end", "{ start: 0, end: 9999, text: 'x', expect: { kind: 'same-tree' } }"],
    ["a negative start", "{ start: -1, end: 2, text: 'x', expect: { kind: 'same-tree' } }"],
    ["a reversed range", "{ start: 5, end: 2, text: 'x', expect: { kind: 'same-tree' } }"],
    ["a fractional offset", "{ start: 0.5, end: 2, text: 'x', expect: { kind: 'same-tree' } }"],
    ["a text that is not a string", "{ start: 0, end: 2, text: 5, expect: { kind: 'same-tree' } }"],
  ])("an edit with %s is refused and never spliced", async (_name, edit) => {
    const out = await run(`return [${edit}];`, "A TODO here.\n");
    expect(out.output).toBe("A TODO here.\n");
    expect(out.refused).toHaveLength(1);
  });

  test("overlapping edits never corrupt the text", async () => {
    const body =
      'const m = /  +/.exec(doc.src); if (!m) return []; const s = m.index; return [{ start: s, end: s + m[0].length, text: " ", expect: { kind: "same-tree" } }, { start: s, end: s + 1, text: " ", expect: { kind: "same-tree" } }];';
    const out = await run(body, "a   b   c.\n");
    expect(out.output).toBe("a b c.\n");
  });

  test("a fixer that never settles throws after the pass limit", async () => {
    const body =
      'const i = doc.src.indexOf("a  b"); return i >= 0 ? [{ start: i, end: i + 4, text: "a b", expect: { kind: "same-tree" } }] : [{ start: doc.src.indexOf("a b"), end: doc.src.indexOf("a b") + 3, text: "a  b", expect: { kind: "same-tree" } }];';
    await expect(run(body, "a b\n")).rejects.toThrow(/did not converge/);
  }, 120_000);

  test("a fixer that throws stops the run and names the rule", async () => {
    await expect(run('throw new Error("nope");', "A TODO here.\n")).rejects.toThrow(
      /local\/sentence-fixer fixer threw: nope/,
    );
  });

  test("a fixer that returns a non-list stops the run", async () => {
    await expect(run("return 5;", "A TODO here.\n")).rejects.toThrow(/other than a list of edits/);
  });

  test("an edit with no valid expectation stops the run", async () => {
    await expect(
      run("return [{ start: 0, end: 1, text: 'x', expect: { kind: 'anything' } }];", "A TODO here.\n"),
    ).rejects.toThrow(/no valid expectation/);
  });

  test("a fixer cannot claim another rule's id", async () => {
    const out = await run(collapseSpaces.replace("{ start", "{ rule: 'list-comma-labelled-run', start"), "A   b.\n");
    expect(out.applied.every((e) => e.rule === "local/sentence-fixer")).toBe(true);
  });

  test("plugin fixers run after the built-ins", async () => {
    const files = fixer(collapseSpaces);
    const out = await fixMarkdownReport("A tell — TODO   here.\n", await registryOf(files));
    expect(out.applied.map((e) => e.rule)).toEqual(["punctuation-em-dash-in-prose", "local/sentence-fixer"]);
  });

  test("--fix through the CLI applies a plugin fix and reports the rest", async () => {
    const root = tempProject({ ...fixer(collapseSpaces), "a.md": "A   TODO here.\n" });
    const { code, stdout } = await runCli(root, ["a.md", "--fix"]);
    expect(code).toBe(1);
    expect(stdout).toContain("a.md:1 local/sentence-fixer TODO left in");
    expect(await Bun.file(join(root, "a.md")).text()).toBe("A TODO here.\n");
  });
});

describe("plugin rules run inside markdown fences, check only", () => {
  test("a TODO inside a markdown fence is found with the right line", async () => {
    const paragraphRule = `export default {
  category: "sentence",
  summary: "flags the word TODO in a paragraph",
  check: ({ doc }) => doc.paragraphs.filter((p) => p.raw.includes("TODO")).map((p) => ({ line: p.line, message: "TODO left in" })),
};\n`;
    const files = local("sentence-no-todo", paragraphRule);
    const src = "Intro.\n\n```markdown\nA TODO here.\n```\n";
    const found = await checkMarkdown(src, "doc.md", undefined, await registryOf(files));
    expect(found.map((f) => [f.rule, f.line])).toEqual([["local/sentence-no-todo", 4]]);
  });
});

describe("plugin packages", () => {
  const acme = pluginSource(
    "acme",
    `"sentence-no-todo": ${todoRule().replace("export default ", "").trim().replace(/;$/, "")}`,
  );

  test("a declared prose-gates-plugin-name package is found and applied", async () => {
    const files = {
      ...withDeps({ "prose-gates-plugin-acme": "1.0.0" }),
      ...packageFiles("prose-gates-plugin-acme", acme),
    };
    expect(await ids(files, "A TODO here.\n")).toEqual(["acme/sentence-no-todo"]);
  });

  test("a scoped @scope/prose-gates-plugin-name package works", async () => {
    const files = {
      ...withDeps({ "@acme/prose-gates-plugin-acme": "1.0.0" }),
      ...packageFiles("@acme/prose-gates-plugin-acme", acme),
    };
    expect(await ids(files, "A TODO here.\n")).toEqual(["acme/sentence-no-todo"]);
  });

  test("a scoped package with no suffix works", async () => {
    const files = {
      ...withDeps({ "@acme/prose-gates-plugin": "1.0.0" }),
      ...packageFiles("@acme/prose-gates-plugin", acme),
    };
    expect(await ids(files, "A TODO here.\n")).toEqual(["acme/sentence-no-todo"]);
  });

  test("a devDependency counts", async () => {
    const files = {
      ...withDeps({ "prose-gates-plugin-acme": "1.0.0" }, "devDependencies"),
      ...packageFiles("prose-gates-plugin-acme", acme),
    };
    expect(await ids(files, "A TODO here.\n")).toEqual(["acme/sentence-no-todo"]);
  });

  test("the namespace is the plugin's own, not the package name", async () => {
    const other = pluginSource(
      "house",
      `"sentence-no-todo": ${todoRule().replace("export default ", "").trim().replace(/;$/, "")}`,
    );
    const files = {
      ...withDeps({ "prose-gates-plugin-acme": "1.0.0" }),
      ...packageFiles("prose-gates-plugin-acme", other),
    };
    expect(await ids(files, "A TODO here.\n")).toEqual(["house/sentence-no-todo"]);
  });

  test("a package in node_modules that the project does not declare is never loaded", async () => {
    const files = { ...PKG, ...packageFiles("prose-gates-plugin-acme", acme) };
    expect(await ids(files, "A TODO here.\n")).toEqual([]);
  });

  test.each([
    "prose-gates-plugins-acme",
    "prose-gates-plugin_acme",
    "my-prose-gates-plugin-acme",
    "prose-gates-plugin-Acme",
  ])("a declared dependency named %s does not match the pattern", async (name) => {
    const files = { ...withDeps({ [name]: "1.0.0" }), ...packageFiles(name, acme) };
    expect(await ids(files, "A TODO here.\n")).toEqual([]);
  });

  test("a matching dependency that is not installed fails with its name", async () => {
    await expect(registryOf(withDeps({ "prose-gates-plugin-acme": "1.0.0" }))).rejects.toThrow(
      /plugin prose-gates-plugin-acme: is declared or listed but not installed/,
    );
  });

  test("the entry is read from exports, then main, then index.js", async () => {
    const viaExports = {
      ...withDeps({ "prose-gates-plugin-acme": "1.0.0" }),
      "node_modules/prose-gates-plugin-acme/package.json": JSON.stringify({
        exports: { ".": { import: "./lib/entry.mjs" } },
      }),
      "node_modules/prose-gates-plugin-acme/lib/entry.mjs": acme,
    };
    expect(await ids(viaExports, "A TODO here.\n")).toEqual(["acme/sentence-no-todo"]);
    const viaString = {
      ...withDeps({ "prose-gates-plugin-acme": "1.0.0" }),
      "node_modules/prose-gates-plugin-acme/package.json": JSON.stringify({ exports: "./e.mjs" }),
      "node_modules/prose-gates-plugin-acme/e.mjs": acme,
    };
    expect(await ids(viaString, "A TODO here.\n")).toEqual(["acme/sentence-no-todo"]);
    const viaIndex = {
      ...withDeps({ "prose-gates-plugin-acme": "1.0.0" }),
      "node_modules/prose-gates-plugin-acme/package.json": JSON.stringify({ name: "x" }),
      "node_modules/prose-gates-plugin-acme/index.js": acme,
    };
    expect(await ids(viaIndex, "A TODO here.\n")).toEqual(["acme/sentence-no-todo"]);
    const viaArray = {
      ...withDeps({ "prose-gates-plugin-acme": "1.0.0" }),
      "node_modules/prose-gates-plugin-acme/package.json": JSON.stringify({
        exports: { ".": [{ browser: "./b.js" }, "./a.mjs"] },
      }),
      "node_modules/prose-gates-plugin-acme/a.mjs": acme,
    };
    expect(await ids(viaArray, "A TODO here.\n")).toEqual(["acme/sentence-no-todo"]);
  });

  test("a package hoisted to a parent directory is found", async () => {
    const root = tempProject({
      ...packageFiles("prose-gates-plugin-acme", acme),
      "packages/app/package.json": JSON.stringify({
        name: "app",
        dependencies: { "prose-gates-plugin-acme": "1.0.0" },
      }),
    });
    const { registry } = await setUp({ cwd: join(root, "packages", "app") });
    expect(registry.rules.map((r) => r.id)).toContain("acme/sentence-no-todo");
  });

  test("a package with a subpath-only exports map falls back to main", async () => {
    const files = {
      ...withDeps({ "prose-gates-plugin-acme": "1.0.0" }),
      "node_modules/prose-gates-plugin-acme/package.json": JSON.stringify({
        main: "m.mjs",
        exports: { "./x": "./x.mjs" },
      }),
      "node_modules/prose-gates-plugin-acme/m.mjs": acme,
    };
    expect(await ids(files, "A TODO here.\n")).toEqual(["acme/sentence-no-todo"]);
  });

  test("listed in the config by path or by name, and loaded once if also declared", async () => {
    const byPath = {
      ...PKG,
      "tools/p.mjs": acme,
      "prose-gates.config.json": JSON.stringify({ plugins: ["./tools/p.mjs"] }),
    };
    expect(await ids(byPath, "A TODO here.\n")).toEqual(["acme/sentence-no-todo"]);
    const byName = {
      ...PKG,
      ...packageFiles("some-other-name", acme),
      "prose-gates.config.json": JSON.stringify({ plugins: ["some-other-name"] }),
    };
    expect(await ids(byName, "A TODO here.\n")).toEqual(["acme/sentence-no-todo"]);
    const twice = {
      ...withDeps({ "prose-gates-plugin-acme": "1.0.0" }),
      ...packageFiles("prose-gates-plugin-acme", acme),
      "prose-gates.config.json": JSON.stringify({ plugins: ["prose-gates-plugin-acme"] }),
    };
    expect(await ids(twice, "A TODO here.\n")).toEqual(["acme/sentence-no-todo"]);
  });

  test("a config entry that is not installed fails", async () => {
    const files = { ...PKG, "prose-gates.config.json": JSON.stringify({ plugins: ["not-here"] }) };
    await expect(registryOf(files)).rejects.toThrow(/plugin not-here: is declared or listed but not installed/);
  });

  test("a malformed package.json at the root fails with its path", async () => {
    await expect(registryOf({ "package.json": "[1]" })).rejects.toThrow(/is not a JSON object/);
  });

  test("local rules load before packages, and packages load in name order", async () => {
    const beta = pluginSource(
      "beta",
      `"sentence-b": ${todoRule().replace("export default ", "").trim().replace(/;$/, "")}`,
    );
    const files = {
      ...withDeps({ "prose-gates-plugin-beta": "1", "prose-gates-plugin-acme": "1" }),
      ...packageFiles("prose-gates-plugin-beta", beta),
      ...packageFiles("prose-gates-plugin-acme", acme),
      ".prose-gates/rules/sentence-l.mjs": todoRule(),
    };
    const { registry } = await setUp({ cwd: tempProject(files) });
    expect(registry.sources.map((s) => s.namespace)).toEqual(["local", "acme", "beta"]);
  });
});

describe("a package that breaks the contract", () => {
  const withPlugin = (plugin: string, name = "prose-gates-plugin-acme"): Record<string, string> => ({
    ...withDeps({ [name]: "1.0.0" }),
    ...packageFiles(name, plugin),
  });
  const rule = todoRule().replace("export default ", "").trim().replace(/;$/, "");

  test.each([
    ["no default export shape", "export default { rules: {} };\n", /must be \{ meta, rules \}/],
    [
      "an apiVersion this build does not support",
      'export default { meta: { name: "a", namespace: "acme", apiVersion: 2 }, rules: {} };\n',
      /targets plugin apiVersion 2, but this prose-gates supports 1/,
    ],
    [
      "a missing apiVersion",
      'export default { meta: { name: "a", namespace: "acme" }, rules: {} };\n',
      /targets plugin apiVersion undefined/,
    ],
    ["no name", 'export default { meta: { namespace: "acme", apiVersion: 1 }, rules: {} };\n', /meta.name is required/],
    [
      "a bad namespace",
      'export default { meta: { name: "a", namespace: "Acme!", apiVersion: 1 }, rules: {} };\n',
      /meta.namespace must be/,
    ],
    [
      "the reserved namespace",
      'export default { meta: { name: "a", namespace: "local", apiVersion: 1 }, rules: {} };\n',
      /"local" is reserved/,
    ],
    [
      "categories that are not a map",
      'export default { meta: { name: "a", namespace: "acme", apiVersion: 1, categories: [] }, rules: {} };\n',
      /categories must map a word to a description/,
    ],
    [
      "a rule that uses an undeclared category",
      pluginSource("acme", `"tone-x": ${rule.replace('"sentence"', '"tone"')}`),
      /does not declare in meta.categories/,
    ],
  ])("%s fails the load", async (_name, plugin, message) => {
    await expect(registryOf(withPlugin(plugin))).rejects.toThrow(message);
  });

  test("two plugins that claim one namespace fail, naming both", async () => {
    const files = {
      ...withDeps({ "prose-gates-plugin-a": "1", "prose-gates-plugin-b": "1" }),
      ...packageFiles("prose-gates-plugin-a", pluginSource("same", `"sentence-x": ${rule}`)),
      ...packageFiles("prose-gates-plugin-b", pluginSource("same", `"sentence-y": ${rule}`)),
    };
    await expect(registryOf(files)).rejects.toThrow(/namespace "same" is already used by prose-gates-plugin-a/);
  });

  test("two plugins that declare one category fail, naming both", async () => {
    const decl = 'categories: { tone: "Voice" }';
    const files = {
      ...withDeps({ "prose-gates-plugin-a": "1", "prose-gates-plugin-b": "1" }),
      ...packageFiles(
        "prose-gates-plugin-a",
        pluginSource("one", `"tone-x": ${rule.replace('"sentence"', '"tone"')}`, decl),
      ),
      ...packageFiles(
        "prose-gates-plugin-b",
        pluginSource("two", `"tone-y": ${rule.replace('"sentence"', '"tone"')}`, decl),
      ),
    };
    await expect(registryOf(files)).rejects.toThrow(/category "tone" is already declared by prose-gates-plugin-a/);
  });

  test("a plugin cannot use a category another plugin declared", async () => {
    const files = {
      ...withDeps({ "prose-gates-plugin-a": "1", "prose-gates-plugin-b": "1" }),
      ...packageFiles(
        "prose-gates-plugin-a",
        pluginSource("one", `"tone-x": ${rule.replace('"sentence"', '"tone"')}`, 'categories: { tone: "Voice" }'),
      ),
      ...packageFiles("prose-gates-plugin-b", pluginSource("two", `"tone-y": ${rule.replace('"sentence"', '"tone"')}`)),
    };
    await expect(registryOf(files)).rejects.toThrow(/does not declare in meta.categories/);
  });

  test("a plugin can declare a new category and use it, and help data carries it", async () => {
    const files = withPlugin(
      pluginSource(
        "acme",
        `"tone-x": ${rule.replace('"sentence"', '"tone"')}`,
        'categories: { tone: "Voice and register" }',
      ),
    );
    const { registry } = await setUp({ cwd: tempProject(files) });
    expect(registry.categories.get("tone")).toBe("Voice and register");
    expect(registry.rules.find((r) => r.id === "acme/tone-x")?.category).toBe("tone");
  });
});

describe("the Node bundle loads plugins too", () => {
  test("node dist/bin.js applies a local rule and prints the loaded line", async () => {
    const root = tempProject({ ...local("sentence-no-todo", todoRule()), "a.md": "A TODO here.\n" });
    const { code, stdout, stderr } = await runCli(root, ["a.md"], ["node", join(PROJECT_ROOT, "dist", "bin.js")]);
    expect(code).toBe(1);
    expect(stdout).toContain("local/sentence-no-todo");
    expect(stderr).toContain("loaded local (1 rule)");
  });
});
