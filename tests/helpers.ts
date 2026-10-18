// Shared test helpers. Temporary files live under the project's own tmp/,
// never the system temp dir, and the fixture that makes them also removes them.

import { afterEach } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { checkMarkdown } from "../src/index.ts";

export const PROJECT_ROOT = resolve(import.meta.dir, "..");
const TMP = join(PROJECT_ROOT, "tmp", "tests");

export const rules = async (src: string, maxWords?: number): Promise<string[]> =>
  (await checkMarkdown(src, "doc.md", maxWords)).map((f) => f.rule);

// The temporary directories one test file makes, through a fixture that owns
// both their setup and their cleanup.
export interface TempDirs {
  // A file holding the content, alone in a fresh directory.
  file: (content: string, name?: string) => string;
  // A throwaway project directory holding the given files, so discovery and
  // config tests run against a real tree rather than a stand-in.
  project: (files: Record<string, string>) => string;
  // Every directory made since the last cleanup.
  readonly made: readonly string[];
}

// Call once at the top of a test file, outside any test. It registers an
// afterEach hook that removes every directory the test made. The hook runs
// once the test's own awaits settle, so a CLI spawned in a project has exited
// before the project goes.
export const tempDirs = (): TempDirs => {
  const made: string[] = [];
  const fresh = (prefix: string): string => {
    mkdirSync(TMP, { recursive: true });
    const dir = mkdtempSync(join(TMP, prefix));
    made.push(dir);
    return dir;
  };
  afterEach(() => {
    for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
  });
  return {
    file: (content, name = "doc.md") => {
      const file = join(fresh("prose-gates-"), name);
      writeFileSync(file, content);
      return file;
    },
    project: (files) => {
      const root = fresh("project-");
      for (const [path, content] of Object.entries(files)) {
        const full = join(root, path);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, content);
      }
      return root;
    },
    made,
  };
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
