// Golden fixtures: each directory under tests/fixtures/fix holds input.md
// and expected.md. The fix must produce expected.md exactly, be idempotent,
// and leave expected.md with no findings from the rules the fixture names.

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkMarkdown, fixMarkdown, RULES } from "../../src/index.ts";
import { PROJECT_ROOT } from "../helpers.ts";

const ROOT = join(PROJECT_ROOT, "tests", "fixtures", "fix");

const fixtures = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

describe("fix fixtures", () => {
  test("there are fixtures to run", () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  test.each(fixtures)("%s", async (name) => {
    const input = readFileSync(join(ROOT, name, "input.md"), "utf8");
    const expected = readFileSync(join(ROOT, name, "expected.md"), "utf8");
    const rules = new Set(RULES.filter((r) => name === r.id || name.startsWith(`${r.id}-`)).map((r) => r.id));
    const fixed = await fixMarkdown(input);
    expect(fixed).toBe(expected);
    expect(await fixMarkdown(fixed)).toBe(fixed);
    expect(rules.size).toBeGreaterThan(0);
    expect((await checkMarkdown(fixed, name)).filter((f) => rules.has(f.rule))).toEqual([]);
  });
});
