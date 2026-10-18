// The Example Pages are generated, so the committed copy must equal a fresh
// render: a fixture, a rule message or the Sweep Snapshot that changes without
// make fix fails here.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { PAGES, parseSnapshot, renderAll } from "../scripts/examples-pages.ts";
import { RULES } from "../src/index.ts";
import { PROJECT_ROOT } from "./helpers.ts";

const pages = await renderAll();

describe("the Example Pages", () => {
  test.each(Object.entries(PAGES))("%s matches a fresh render", async (key, path) => {
    expect(await Bun.file(join(PROJECT_ROOT, path)).text()).toBe(pages[key as keyof typeof PAGES]);
  });

  test("the fixes page shows every fixable rule", () => {
    for (const rule of RULES.filter((r) => r.fix)) expect(pages.fixes).toContain(`### ${rule.id}\n`);
  });
});

describe("parseSnapshot", () => {
  test("rejects a snapshot with no cells", () => {
    expect(() => parseSnapshot({ swept_on: "2026-10-17", cells: [] })).toThrow("non-empty cells list");
  });

  test("rejects a cell missing a field", () => {
    expect(() => parseSnapshot({ swept_on: "2026-10-17", cells: [{ case: "eval_x" }] })).toThrow(
      "cell 0 has no string question",
    );
  });
});
