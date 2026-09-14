import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { main } from "../src/index.ts";
import { PROJECT_ROOT, tempFile } from "./helpers.ts";

const run = async (args: string[]): Promise<{ code: number; stdout: string; stderr: string }> => {
  const proc = Bun.spawn(["bun", "run", join(PROJECT_ROOT, "src", "bin.ts"), ...args], {
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

describe("bin entry point", () => {
  test("prints findings and a summary line", async () => {
    const file = tempFile("A tell — here.\n");
    const { code, stdout } = await run([file]);
    expect(code).toBe(1);
    expect(stdout).toContain(`${file}:1 PG004`);
    expect(stdout).toContain("1 finding(s) in 1 file(s)");
  });

  test("--json output parses", async () => {
    const { code, stdout } = await run([tempFile("A tell — here.\n"), "--json"]);
    expect(code).toBe(1);
    expect(JSON.parse(stdout).findings[0].rule).toBe("PG004");
  });

  test("help marks the fixable rules", async () => {
    const { code, stdout } = await run(["--help"]);
    expect(code).toBe(0);
    expect(stdout).toContain("PG001*");
    expect(stdout).toContain("PG002 ");
  });

  test("help groups the rules by category", async () => {
    const { stdout } = await run(["--help"]);
    const at = (s: string): number => stdout.indexOf(s);
    expect(at("  sentence:")).toBeLessThan(at("PG001*"));
    expect(at("  list:")).toBeLessThan(at("PG003*"));
    expect(at("  punctuation:")).toBeLessThan(at("PG004*"));
    expect(at("PG009*")).toBeLessThan(at("  punctuation:"));
    expect(stdout).toContain("RULES.md");
  });

  test("a missing file is a runtime error, exit 1", async () => {
    const { code, stderr } = await run([join(PROJECT_ROOT, "tmp", "tests", "does-not-exist.md")]);
    expect(code).toBe(1);
    expect(stderr).toContain("error:");
  });
});
