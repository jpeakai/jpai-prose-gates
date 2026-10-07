import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { main } from "../src/index.ts";
import { PROJECT_ROOT, tempFile } from "./helpers.ts";

type Runner = (args: string[]) => Promise<{ code: number; stdout: string; stderr: string }>;

// The same entry point two ways: Bun runs the TypeScript source, and Node runs
// the committed bundle that a git install or npx uses.
const runner =
  (command: string[]): Runner =>
  async (args) => {
    const proc = Bun.spawn([...command, ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    return { code, stdout, stderr };
  };

describe("main", () => {
  test("exits 0 on a clean file and 1 on findings", async () => {
    expect(await main([tempFile("One clean sentence.\n")])).toBe(0);
    expect(await main([tempFile("A wrapped sentence goes\nonward here.\n")])).toBe(1);
  });

  test("--fix rewrites the file in place", async () => {
    const file = tempFile("A wrapped sentence goes\nonward here.\n");
    expect(await main([file, "--fix"])).toBe(0);
    expect(readFileSync(file, "utf8")).toBe("A wrapped sentence goes onward here.\n");
  });

  test("--fix leaves an unfixable finding reported", async () => {
    const long = `${Array.from({ length: 30 }, (_, i) => `word${i}`).join(" ")}.\n`;
    const file = tempFile(long);
    expect(await main([file, "--fix"])).toBe(1);
    expect(readFileSync(file, "utf8")).toBe(long);
  });

  test("--json emits parseable findings", async () => {
    const file = tempFile("A tell — here.\n");
    expect(await main([file, "--json"])).toBe(1);
  });

  test("usage errors exit 2", async () => {
    expect(await main([])).toBe(2);
    expect(await main(["--nope"])).toBe(2);
    expect(await main([tempFile("x.\n"), "--max-words", "zero"])).toBe(2);
  });

  test("--help exits 0", async () => {
    expect(await main(["--help"])).toBe(0);
  });
});

const RUNTIMES: [string, Runner][] = [
  ["bun src/bin.ts", runner(["bun", "run", join(PROJECT_ROOT, "src", "bin.ts")])],
  ["node dist/bin.js", runner(["node", join(PROJECT_ROOT, "dist", "bin.js")])],
];

describe.each(RUNTIMES)("bin entry point: %s", (_, run) => {
  test("prints findings and a summary line", async () => {
    const file = tempFile("A tell — here.\n");
    const { code, stdout } = await run([file]);
    expect(code).toBe(1);
    expect(stdout).toContain(`${file}:1 punctuation-em-dash-in-prose`);
    expect(stdout).toContain("1 finding(s) in 1 file(s)");
  });

  test("--json output parses", async () => {
    const { code, stdout } = await run([tempFile("A tell — here.\n"), "--json"]);
    expect(code).toBe(1);
    expect(JSON.parse(stdout).findings[0].rule).toBe("punctuation-em-dash-in-prose");
  });

  test("help marks the fixable rules", async () => {
    const { code, stdout } = await run(["--help"]);
    expect(code).toBe(0);
    expect(stdout).toContain("sentence-one-per-line*");
    expect(stdout).toContain("sentence-word-budget-exceeded ");
  });

  test("help groups the rules by category", async () => {
    const { stdout } = await run(["--help"]);
    const at = (s: string): number => stdout.indexOf(s);
    expect(at("  sentence:")).toBeLessThan(at("sentence-one-per-line*"));
    expect(at("  list:")).toBeLessThan(at("list-semicolon-delimited-run*"));
    expect(at("  punctuation:")).toBeLessThan(at("punctuation-em-dash-in-prose*"));
    expect(at("list-stacked-interpunct-runs*")).toBeLessThan(at("  punctuation:"));
    expect(stdout).toContain("RULES.md");
  });

  test("a missing file is a runtime error, exit 1", async () => {
    const { code, stderr } = await run([join(PROJECT_ROOT, "tmp", "tests", "does-not-exist.md")]);
    expect(code).toBe(1);
    expect(stderr).toContain("error:");
  });
});

describe("node bundle", () => {
  test("uses no Bun global, so plain Node can run it", () => {
    for (const file of ["bin.js", "index.js"]) {
      expect(readFileSync(join(PROJECT_ROOT, "dist", file), "utf8")).not.toMatch(/\bBun\./);
    }
  });

  test("the library imports and fixes under Node", async () => {
    const script = `import("${join(PROJECT_ROOT, "dist", "index.js")}").then((m) => m.fixMarkdown("One rule matters — never guess.\\n")).then((out) => process.stdout.write(out))`;
    const proc = Bun.spawn(["node", "-e", script], { stdout: "pipe", stderr: "pipe" });
    const [stdout, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
    expect(code).toBe(0);
    expect(stdout).toBe("One rule matters: never guess.\n");
  });
});
