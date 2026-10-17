// The temp directory fixture cleans up after itself, so a run never leaves
// directories behind under tmp/tests. The tests run in order: the first makes
// directories and the second checks they were removed in between.

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tempDirs } from "./helpers.ts";

const tmp = tempDirs();

describe("the tempDirs fixture", () => {
  const seen: string[] = [];

  test("makes a file and a project that exist for the length of the test", () => {
    const file = tmp.file("One sentence.\n");
    const root = tmp.project({ "docs/a.md": "x\n" });
    expect(readFileSync(file, "utf8")).toBe("One sentence.\n");
    expect(existsSync(join(root, "docs", "a.md"))).toBe(true);
    expect(tmp.made).toEqual([dirname(file), root]);
    seen.push(dirname(file), root);
  });

  test("removes every directory it made once the test ends", () => {
    expect(seen).toHaveLength(2);
    for (const dir of seen) expect(existsSync(dir)).toBe(false);
    expect(tmp.made).toEqual([]);
  });
});
