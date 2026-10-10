// Checking: build the model once, run every active rule over it, and audit
// embedded markdown fences as documents of their own.
//
// Nothing is modified in check mode and no rule reads another's result, so every
// rule is started at once and the engine waits for all of them. A rule may be
// synchronous or return a promise, so concurrency is as good as parallelism
// here: a rule that waits on a tool or a service overlaps with the others.

import { buildDocModel, type DocModel } from "./model.ts";
import { BUILTIN, type Registry, ruleContext, TEXT_HELPERS } from "./rules/registry.ts";
import type { Finding } from "./rules/types.ts";

export const DEFAULT_MAX_WORDS = 25;

// The sentence budget of a run: the flag wins, then the rule's own option,
// then the default.
const budgetFor = (flag: number | undefined, option: unknown): number =>
  flag ?? (typeof option === "number" ? option : DEFAULT_MAX_WORDS);

export const checkModel = async (
  doc: DocModel,
  file: string,
  maxWords: number | undefined,
  registry: Registry = BUILTIN,
): Promise<Finding[]> => {
  const shared = ruleContext(doc, registry);
  const perRule = registry.rules.map(async (rule) => {
    const options = registry.options.get(rule.id) ?? {};
    const found = await rule.check({
      ...shared,
      file,
      maxWords: budgetFor(maxWords, options.maxWords),
      options,
      helpers: TEXT_HELPERS,
    });
    // The engine, not the rule, says how a finding counts.
    const severity = registry.severities.get(rule.id) ?? "error";
    return found.map((f) => ({ ...f, severity }));
  });
  // The fence body starts one line below the opening fence.
  const perFence = doc.fences.map(async (fence) => {
    const inner = await checkModel(buildDocModel(fence.value), file, maxWords, registry);
    return inner.map((f) => ({ ...f, line: fence.line + f.line }));
  });
  const findings = (await Promise.all([...perRule, ...perFence])).flat();
  return findings.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
};

export const checkMarkdown = (
  src: string,
  file: string,
  maxWords?: number,
  registry: Registry = BUILTIN,
): Promise<Finding[]> => checkModel(buildDocModel(src), file, maxWords, registry);
