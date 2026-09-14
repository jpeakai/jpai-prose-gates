// Golden fixtures: each directory under tests/fixtures/fix holds input.md
// and expected.md. The fix must produce expected.md exactly, be idempotent,
// and leave expected.md with no findings from the rules the fixture names.

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkMarkdown, fixMarkdown } from "../../src/index.ts";
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

  test.each(fixtures)("%s", (name) => {
    const input = readFileSync(join(ROOT, name, "input.md"), "utf8");
    const expected = readFileSync(join(ROOT, name, "expected.md"), "utf8");
    const rule = name.slice(0, 5).toUpperCase();
    const fixed = fixMarkdown(input);
    expect(fixed).toBe(expected);
    expect(fixMarkdown(fixed)).toBe(fixed);
    expect(checkMarkdown(fixed, name).filter((f) => f.rule === rule)).toEqual([]);
  });
});
