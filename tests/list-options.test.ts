// The minItems option of the list run rules: each one's check and fix read
// the same threshold, a bad value is a usage error, and the interpunct runs
// a lower or higher threshold leaves unclaimed go back to the glyph rule.

import { describe, expect, test } from "bun:test";
import { parseConfig } from "../src/config.ts";
import { buildRegistry, checkMarkdown, fixMarkdownReport, UsageError } from "../src/index.ts";
import { FIX_ORDER, RULES } from "../src/rules/index.ts";
import { BUILTIN_CATEGORIES } from "../src/rules/registry.ts";
import type { RuleId } from "../src/rules/types.ts";

const registryFor = (rules: unknown) =>
  buildRegistry({
    rules: RULES,
    fixOrder: FIX_ORDER,
    categories: BUILTIN_CATEGORIES,
    config: parseConfig("t.json", { rules }),
  });

const rulesFired = async (src: string, rules: unknown = {}) =>
  (await checkMarkdown(src, "doc.md", undefined, registryFor(rules))).map((f) => f.rule);

const fixed = async (src: string, rules: unknown = {}) => (await fixMarkdownReport(src, registryFor(rules))).output;

// Each run rule, a run one item short of its default, and that run promoted
// once minItems is lowered to its length.
const SHORT_RUNS: [RuleId, string, number, string][] = [
  ["list-semicolon-delimited-run", "Needs: a tag; a build.\n", 2, "Needs:\n\n- a tag\n- a build\n"],
  [
    "list-comma-labelled-run",
    "Targets: `fmt` formats, `vet` inspects.\n",
    2,
    "Targets:\n\n- `fmt` formats\n- `vet` inspects\n",
  ],
  ["list-comma-code-run", "It reads `a` and `b`.\n", 2, "It reads:\n\n- `a`\n- `b`\n"],
  ["list-comma-plain-run", "Tags: alpha, beta, rc, next.\n", 4, "Tags:\n\n- alpha\n- beta\n- rc\n- next\n"],
  ["list-interpunct-joined-run", "Stack: Bun · Node.\n", 2, "Stack:\n\n- Bun\n- Node\n"],
];

describe("minItems lowers a run rule's threshold", () => {
  test.each(SHORT_RUNS)("%s", async (rule, src, minItems, out) => {
    expect(await rulesFired(src)).not.toContain(rule);
    const lowered = { [rule]: ["error", { minItems }] };
    expect(await rulesFired(src, lowered)).toContain(rule);
    expect(await fixed(src, lowered)).toBe(out);
  });
});

// Each run rule, a run its default reports, and the threshold that is one
// item too many for it.
const DEFAULT_RUNS: [RuleId, string, number][] = [
  ["list-semicolon-delimited-run", "Needs: a tag; a build; a log.\n", 4],
  ["list-comma-labelled-run", "Targets: `fmt` formats, `vet` inspects, `race` detects.\n", 4],
  ["list-comma-code-run", "It reads `a`, `b` and `c`.\n", 4],
  ["list-comma-plain-run", "Tags: alpha, beta, rc, next, canary.\n", 6],
  ["list-interpunct-joined-run", "Stack: Bun · Node · biome.\n", 4],
];

describe("minItems raises a run rule's threshold", () => {
  test.each(DEFAULT_RUNS)("%s", async (rule, src, minItems) => {
    expect(await rulesFired(src)).toContain(rule);
    const raised = { [rule]: ["error", { minItems }] };
    expect(await rulesFired(src, raised)).not.toContain(rule);
    expect(await fixed(src, raised)).not.toContain("\n- ");
  });
});

describe("the interpunct runs a threshold leaves unclaimed", () => {
  test("a run below minItems is reported as stray glyphs", async () => {
    const raised = { "list-interpunct-joined-run": ["error", { minItems: 4 }] };
    expect(await rulesFired("Stack: Bun · Node · biome.\n", raised)).toEqual(["punctuation-interpunct-in-prose"]);
  });

  test("a two-item run claimed by minItems 2 is no stray glyph", async () => {
    const lowered = { "list-interpunct-joined-run": ["error", { minItems: 2 }] };
    expect(await rulesFired("Stack: Bun · Node.\n", lowered)).toEqual(["list-interpunct-joined-run"]);
  });

  test("by default a two-item run is a stray glyph, as before", async () => {
    expect(await rulesFired("Stack: Bun · Node.\n")).toEqual(["punctuation-interpunct-in-prose"]);
  });
});

describe("a bad minItems is a usage error", () => {
  test.each([
    ["one item", 1],
    ["a fraction", 2.5],
    ["zero", 0],
  ])("rejects %s", (_, minItems) => {
    const rules = { "list-comma-plain-run": ["error", { minItems }] };
    expect(() => registryFor(rules)).toThrow(/must be a whole number of at least 2/);
    expect(() => registryFor(rules)).toThrow(UsageError);
  });

  test("rejects a string", () => {
    expect(() => registryFor({ "list-comma-code-run": ["error", { minItems: "3" }] })).toThrow(/must be a number/);
  });
});
