// Checking: build the model once, run every active rule over it, and audit
// embedded markdown fences as documents of their own.

import { buildDocModel, type DocModel } from "./model.ts";
import { BUILTIN, type Registry, ruleContext, TEXT_HELPERS } from "./rules/registry.ts";
import type { Finding } from "./rules/types.ts";

export const DEFAULT_MAX_WORDS = 25;

// The sentence budget of a run: the flag wins, then the rule's own option,
// then the default.
const budgetFor = (flag: number | undefined, option: unknown): number =>
  flag ?? (typeof option === "number" ? option : DEFAULT_MAX_WORDS);

export const checkModel = (
  doc: DocModel,
  file: string,
  maxWords: number | undefined,
  registry: Registry = BUILTIN,
): Finding[] => {
  const shared = ruleContext(doc, registry);
  const findings = registry.rules.flatMap((rule) => {
    const options = registry.options.get(rule.id) ?? {};
    return rule.check({
      ...shared,
      file,
      maxWords: budgetFor(maxWords, options.maxWords),
      options,
      helpers: TEXT_HELPERS,
    });
  });
  // The fence body starts one line below the opening fence.
  for (const fence of doc.fences) {
    for (const f of checkModel(buildDocModel(fence.value), file, maxWords, registry)) {
      findings.push({ ...f, line: fence.line + f.line });
    }
  }
  return findings.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
};

export const checkMarkdown = (src: string, file: string, maxWords?: number, registry: Registry = BUILTIN): Finding[] =>
  checkModel(buildDocModel(src), file, maxWords, registry);
