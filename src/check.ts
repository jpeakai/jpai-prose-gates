// Checking: build the model once, run every active rule over it, and audit
// embedded markdown fences as documents of their own.
//
// Nothing is modified in check mode. Every rule is started at once, except a
// rule that names categories in `after`, which waits for those findings. A rule may be
// synchronous or return a promise, so concurrency is as good as parallelism
// here: a rule that waits on a tool or a service overlaps with the others.

import { buildDocModel, type DocModel } from "./model.ts";
import { BUILTIN, type Registry, ruleContext, TEXT_HELPERS } from "./rules/registry.ts";
import type { Finding, Rule } from "./rules/types.ts";

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
  const run = async (rule: Rule, earlier: readonly Finding[]): Promise<Finding[]> => {
    const options = registry.options.get(rule.id) ?? {};
    return rule.check({
      ...shared,
      file,
      maxWords: budgetFor(maxWords, options.maxWords),
      earlier,
      options,
      helpers: TEXT_HELPERS,
    });
  };
  // Rules that read no other rule's findings start at once. A rule with
  // `after` waits for them and reads what its named categories reported.
  const categoryOf = new Map(registry.rules.map((r) => [r.id, r.category]));
  const first = Promise.all(registry.rules.filter((r) => !r.after).map((r) => run(r, [])));
  const later = registry.rules
    .filter((r) => r.after)
    .map(async (rule) => {
      const earlier = (await first).flat().filter((f) => rule.after?.includes(categoryOf.get(f.rule) ?? ""));
      return run(rule, earlier);
    });
  const perRule = [first.then((found) => found.flat()), ...later];
  // The fence body starts one line below the opening fence.
  const perFence = doc.fences.map(async (fence) => {
    const inner = await checkModel(buildDocModel(fence.value, registry.concepts), file, maxWords, registry);
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
): Promise<Finding[]> => checkModel(buildDocModel(src, registry.concepts), file, maxWords, registry);
