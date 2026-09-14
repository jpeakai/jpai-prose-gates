// Checking: build the model once, run every rule over it, and audit
// embedded markdown fences as documents of their own.

import { buildDocModel, type DocModel } from "./model.ts";
import { RULES } from "./rules/index.ts";
import { interpunctRuns } from "./rules/interpunct.ts";
import type { Finding } from "./rules/types.ts";

export const DEFAULT_MAX_WORDS = 25;

export const checkModel = (doc: DocModel, file: string, maxWords: number): Finding[] => {
  const ctx = { doc, file, maxWords, runs: interpunctRuns(doc) };
  const findings = RULES.flatMap((rule) => rule.check(ctx));
  // The fence body starts one line below the opening fence.
  for (const fence of doc.fences) {
    for (const f of checkModel(buildDocModel(fence.value), file, maxWords)) {
      findings.push({ ...f, line: fence.line + f.line });
    }
  }
  return findings.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
};

export const checkMarkdown = (src: string, file: string, maxWords: number = DEFAULT_MAX_WORDS): Finding[] =>
  checkModel(buildDocModel(src), file, maxWords);
