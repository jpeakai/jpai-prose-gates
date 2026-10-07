// Shared assertions for the adversarial suites. A refusal leaves the source
// byte-identical and the finding reported; a fix must be exact, idempotent,
// and carry every content word across.

import { expect } from "bun:test";
import { fingerprint } from "../../src/fix/verify.ts";
import { checkMarkdown, fixMarkdown, fixMarkdownReport } from "../../src/index.ts";
import { parse } from "../../src/model.ts";
import type { RuleId } from "../../src/rules/types.ts";

const rulesIn = async (src: string): Promise<RuleId[]> =>
  (await checkMarkdown(src, "adversarial.md")).map((f) => f.rule);

export const refuses = async (src: string, stillReported?: RuleId): Promise<void> => {
  const report = await fixMarkdownReport(src);
  expect(report.output).toBe(src);
  expect(report.applied).toEqual([]);
  if (stillReported) expect(await rulesIn(src)).toContain(stillReported);
};

export const fixesTo = async (src: string, out: string, gone?: RuleId): Promise<void> => {
  const fixed = await fixMarkdown(src);
  expect(fixed).toBe(out);
  expect(await fixMarkdown(fixed)).toBe(fixed);
  expect(fingerprint(parse(fixed))).toEqual(fingerprint(parse(src)));
  if (gone) expect(await rulesIn(fixed)).not.toContain(gone);
};
