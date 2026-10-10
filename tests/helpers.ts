// Shared test helpers. Temporary files live under the project's own tmp/,
// never the system temp dir, so every artifact a test writes is inspectable.

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { checkMarkdown, parseConfig } from "../src/index.ts";
import { FIX_ORDER, RULES } from "../src/rules/index.ts";
import { BUILTIN_CATEGORIES, buildRegistry, type Registry } from "../src/rules/registry.ts";
import type { Finding } from "../src/rules/types.ts";

export const PROJECT_ROOT = resolve(import.meta.dir, "..");
const TMP = join(PROJECT_ROOT, "tmp", "tests");

export const tempFile = (content: string, name = "doc.md"): string => {
  mkdirSync(TMP, { recursive: true });
  const file = join(mkdtempSync(join(TMP, "prose-gates-")), name);
  writeFileSync(file, content);
  return file;
};

export const rules = async (src: string, maxWords?: number): Promise<string[]> =>
  (await checkMarkdown(src, "doc.md", maxWords)).map((f) => f.rule);

// A throwaway project directory holding the given files, so discovery and
// config tests run against a real tree rather than a stand-in.
export const tempProject = (files: Record<string, string>): string => {
  mkdirSync(TMP, { recursive: true });
  const root = mkdtempSync(join(TMP, "project-"));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
};

// Runs the CLI as a subprocess in a directory, so a test sees real stdout,
// stderr and the exit code the way a user does.
export const runCli = async (
  cwd: string,
  args: string[],
  command: string[] = ["bun", join(PROJECT_ROOT, "src", "bin.ts")],
): Promise<{ code: number; stdout: string; stderr: string }> => {
  const proc = Bun.spawn([...command, ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, stdout, stderr };
};

// A registry with every rule on, so a rule that starts off or at warn can be tested like any other. Extra
// settings go on top, to test an option or a severity.
export const tellsOn = (extra: Record<string, unknown> = {}): Registry =>
  buildRegistry({
    rules: RULES,
    fixOrder: FIX_ORDER,
    categories: BUILTIN_CATEGORIES,
    config: parseConfig("tests", {
      rules: {
        ...Object.fromEntries(RULES.filter((r) => r.defaultSeverity === "off").map((r) => [r.id, "error"])),
        ...extra,
      },
    }),
  });

// The findings of one rule over a document, with every rule on.
export const tell = async (src: string, rule: string, extra: Record<string, unknown> = {}): Promise<Finding[]> =>
  (await checkMarkdown(src, "doc.md", undefined, tellsOn(extra))).filter((f) => f.rule === rule);
