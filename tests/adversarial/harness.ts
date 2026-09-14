// Shared assertions for the adversarial suites. A refusal leaves the source
// byte-identical and the finding reported; a fix must be exact, idempotent,
// and carry every content word across.

import { expect } from "bun:test";
import { fingerprint } from "../../src/fix/verify.ts";
import { checkMarkdown, fixMarkdown, fixMarkdownReport } from "../../src/index.ts";
import { parse } from "../../src/model.ts";
import type { RuleId } from "../../src/rules/types.ts";

const rulesIn = (src: string): RuleId[] => checkMarkdown(src, "adversarial.md").map((f) => f.rule);

export const refuses = (src: string, stillReported?: RuleId): void => {
  const report = fixMarkdownReport(src);
  expect(report.output).toBe(src);
  expect(report.applied).toEqual([]);
  if (stillReported) expect(rulesIn(src)).toContain(stillReported);
};

export const fixesTo = (src: string, out: string, gone?: RuleId): void => {
  const fixed = fixMarkdown(src);
  expect(fixed).toBe(out);
  expect(fixMarkdown(fixed)).toBe(fixed);
  expect(fingerprint(parse(fixed))).toEqual(fingerprint(parse(src)));
  if (gone) expect(rulesIn(fixed)).not.toContain(gone);
};
