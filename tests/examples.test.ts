// The two example plugins, JavaScript and TypeScript, hold to one behaviour. Each
// is loaded as a local rule and as a package, and each is run through the real
// check and fix engines, so the examples cannot drift from the contract.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { checkMarkdown, fixMarkdown, fixMarkdownReport, setUp } from "../src/index.ts";
import { PROJECT_ROOT, runCli, tempProject } from "./helpers.ts";

interface Variant {
  name: string;
  dir: string;
  ext: "mjs" | "ts";
  entry: string;
  pkg: string;
  namespace: string;
}

const VARIANTS: Variant[] = [
  {
    name: "JavaScript",
    dir: "plugin-skills",
    ext: "mjs",
    entry: "index.mjs",
    pkg: "prose-gates-plugin-skills",
    namespace: "skills",
  },
  {
    name: "TypeScript",
    dir: "plugin-skills-typescript",
    ext: "ts",
    entry: "index.ts",
    pkg: "prose-gates-plugin-skills-typescript",
    namespace: "skills-ts",
  },
];

const BUDGET = "frontmatter-description-word-budget";
const MULTILINE = "frontmatter-description-multiline-string";

const read = (v: Variant, path: string): Promise<string> =>
  Bun.file(join(PROJECT_ROOT, "examples", v.dir, path)).text();

const asLocal = async (v: Variant, config?: unknown): Promise<string> =>
  tempProject({
    "package.json": "{}",
    [`.prose-gates/rules/${BUDGET}.${v.ext}`]: await read(v, `rules/${BUDGET}.${v.ext}`),
    [`.prose-gates/rules/${MULTILINE}.${v.ext}`]: await read(v, `rules/${MULTILINE}.${v.ext}`),
    ...(config ? { "prose-gates.config.json": JSON.stringify(config) } : {}),
  });

const asPackage = async (v: Variant): Promise<string> =>
  tempProject({
    "package.json": JSON.stringify({ devDependencies: { [v.pkg]: "0.0.0" } }),
    [`node_modules/${v.pkg}/package.json`]: await read(v, "package.json"),
    [`node_modules/${v.pkg}/${v.entry}`]: await read(v, v.entry),
    [`node_modules/${v.pkg}/rules/${BUDGET}.${v.ext}`]: await read(v, `rules/${BUDGET}.${v.ext}`),
    [`node_modules/${v.pkg}/rules/${MULTILINE}.${v.ext}`]: await read(v, `rules/${MULTILINE}.${v.ext}`),
  });

const words = (n: number): string => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

const SKILL = [
  "---",
  "name: demo",
  "description: Use this skill to format reports. It also checks tables. Ask first when unsure.",
  "metadata:",
  '  description: "Nested one. Second sentence here."',
  "  note: Only one sentence.",
  "other: Not touched. Because the key differs.",
  "---",
  "",
  "# Body",
  "",
  "Text.",
  "",
].join("\n");

describe.each(VARIANTS)("the $name example plugin", (v) => {
  const local = (id: string): string => `local/${id}`;

  describe("as a local rule", () => {
    test("loads under the local namespace, with the shared category", async () => {
      const { registry } = await setUp({ cwd: await asLocal(v) });
      expect(registry.rules.map((r) => String(r.id)).filter((id) => id.startsWith("local/"))).toEqual([
        local(MULTILINE),
        local(BUDGET),
      ]);
      expect(registry.categories.get("frontmatter")).toBe("Keys in the leading metadata block of a file");
    });

    test("the word budget checks a description at any depth", async () => {
      const { registry } = await setUp({ cwd: await asLocal(v) });
      const src = `---\ndescription: ${words(30)}.\nmetadata:\n  deeper:\n    description: ${words(31)}.\n---\n`;
      const found = (await checkMarkdown(src, "doc.md", undefined, registry)).filter((f) => f.rule === local(BUDGET));
      expect(found.map((f) => [f.line, f.message.split(":")[0]])).toEqual([
        [2, "description"],
        [5, "metadata.deeper.description"],
      ]);
    });

    test("the word budget ignores a key it was not asked to read, and the keys option widens it", async () => {
      const src = `---\ntitle: ${words(40)}.\nmetadata:\n  summary: ${words(40)}.\n---\n`;
      const plain = (await setUp({ cwd: await asLocal(v) })).registry;
      expect((await checkMarkdown(src, "doc.md", undefined, plain)).filter((f) => f.rule === local(BUDGET))).toEqual(
        [],
      );
      const wide = (
        await setUp({
          cwd: await asLocal(v, { rules: { [local(BUDGET)]: ["error", { keys: ["summary"], maxWords: 10 }] } }),
        })
      ).registry;
      const found = (await checkMarkdown(src, "doc.md", undefined, wide)).filter((f) => f.rule === local(BUDGET));
      expect(found.map((f) => f.line)).toEqual([4]);
    });

    test("the multiline rule reports a multi-sentence description on one line, at any depth", async () => {
      const { registry } = await setUp({ cwd: await asLocal(v) });
      const found = (await checkMarkdown(SKILL, "doc.md", undefined, registry)).filter(
        (f) => f.rule === local(MULTILINE),
      );
      expect(found.map((f) => [f.line, f.message])).toEqual([
        [3, "description: 3 sentences on one line; write it as a folded block scalar"],
        [5, "metadata.description: 2 sentences on one line; write it as a folded block scalar"],
      ]);
    });

    test("the fixer rewrites each as a folded block, and the YAML means the same", async () => {
      const { registry } = await setUp({ cwd: await asLocal(v) });
      const out = await fixMarkdownReport(SKILL, registry);
      expect(out.output).toBe(
        [
          "---",
          "name: demo",
          "description: >-",
          "  Use this skill to format reports.",
          "  It also checks tables.",
          "  Ask first when unsure.",
          "metadata:",
          "  description: >-",
          "    Nested one.",
          "    Second sentence here.",
          "  note: Only one sentence.",
          "other: Not touched. Because the key differs.",
          "---",
          "",
          "# Body",
          "",
          "Text.",
          "",
        ].join("\n"),
      );
      expect(out.applied.every((e) => e.rule === local(MULTILINE))).toBe(true);
      const yaml = (s: string): unknown => parseYaml(s.split("---\n")[1] as string);
      expect(yaml(out.output)).toEqual(yaml(SKILL));
    });

    test("a second run changes nothing, and nothing is left to report", async () => {
      const { registry } = await setUp({ cwd: await asLocal(v) });
      const once = await fixMarkdown(SKILL, registry);
      expect(await fixMarkdown(once, registry)).toBe(once);
      expect(
        (await checkMarkdown(once, "doc.md", undefined, registry)).filter((f) => f.rule === local(MULTILINE)),
      ).toEqual([]);
    });

    test.each([
      ["a single sentence", "description: Just one sentence.\n"],
      ["an existing folded block", "description: >-\n  One.\n  Two.\n"],
      ["an existing literal block", "description: |\n  One.\n  Two.\n"],
      ["a value with a comment after it", "description: One. Two. # keep this note\n"],
      ["a value on the line below its key", "description:\n  One. Two.\n"],
      ["a different key", "summary: One. Two.\n"],
    ])("leaves %s alone", async (_name, yaml) => {
      const { registry } = await setUp({ cwd: await asLocal(v) });
      const src = `---\n${yaml}---\n\nBody.\n`;
      expect(await fixMarkdown(src, registry)).toBe(src);
      expect(
        (await checkMarkdown(src, "doc.md", undefined, registry)).filter((f) => f.rule === local(MULTILINE)),
      ).toEqual([]);
    });

    test("the keys option points the fixer at another key", async () => {
      const { registry } = await setUp({
        cwd: await asLocal(v, { rules: { [local(MULTILINE)]: ["error", { keys: ["summary"] }] } }),
      });
      const out = await fixMarkdown("---\nsummary: One. Two.\ndescription: Left. Alone.\n---\n", registry);
      expect(out).toBe("---\nsummary: >-\n  One.\n  Two.\ndescription: Left. Alone.\n---\n");
    });

    test("a quoted value with escapes keeps its meaning, or the edit is refused", async () => {
      const { registry } = await setUp({ cwd: await asLocal(v) });
      const src = '---\ndescription: "He said \\"stop\\". Then left."\n---\n';
      const out = await fixMarkdown(src, registry);
      const yaml = (s: string): unknown => parseYaml(s.split("---\n")[1] as string);
      expect(yaml(out)).toEqual(yaml(src));
    });

    test("--fix through the CLI rewrites the file and exits clean", async () => {
      const root = await asLocal(v);
      await Bun.write(join(root, "SKILL.md"), SKILL);
      const { code, stdout } = await runCli(root, ["SKILL.md", "--fix"]);
      expect(code).toBe(0);
      expect(stdout).toContain("0 finding(s)");
      expect(await Bun.file(join(root, "SKILL.md")).text()).toContain(
        "description: >-\n  Use this skill to format reports.",
      );
    });
  });

  describe("as a package", () => {
    test(`loads from a declared dependency under the ${v.namespace} namespace`, async () => {
      const { registry } = await setUp({ cwd: await asPackage(v) });
      const ids = registry.rules.map((r) => String(r.id)).filter((id) => id.startsWith(`${v.namespace}/`));
      expect(ids).toEqual([`${v.namespace}/${MULTILINE}`, `${v.namespace}/${BUDGET}`]);
      expect(registry.categories.get("frontmatter")).toBe("Keys in the leading metadata block of a file");
    });

    test("fixes through the packaged rule exactly as the local one does", async () => {
      const { registry } = await setUp({ cwd: await asPackage(v) });
      const out = await fixMarkdownReport(SKILL, registry);
      expect(out.output).toContain("description: >-\n  Use this skill to format reports.\n  It also checks tables.");
      expect(out.applied.every((e) => e.rule === `${v.namespace}/${MULTILINE}`)).toBe(true);
    });
  });
});

describe("the TypeScript example under the Node bundle", () => {
  test("runs a .ts local rule and its fixer when this Node can strip types", async () => {
    const v = VARIANTS[1] as Variant;
    const probe = Bun.spawn(["node", "-p", "Boolean(process.features.typescript)"], { stdout: "pipe" });
    const nodeCan = (await new Response(probe.stdout).text()).trim() === "true";
    const root = await asLocal(v);
    await Bun.write(join(root, "SKILL.md"), SKILL);
    const result = await runCli(root, ["SKILL.md", "--fix"], ["node", join(PROJECT_ROOT, "dist", "bin.js")]);
    if (nodeCan) {
      expect(result.code).toBe(0);
      expect(await Bun.file(join(root, "SKILL.md")).text()).toContain("description: >-\n  Use this skill");
    } else {
      expect(result.stderr).toContain("error[plugin-source]");
    }
  });
});
