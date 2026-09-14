// Public API.

export { checkMarkdown, checkModel, DEFAULT_MAX_WORDS } from "./check.ts";
export { main } from "./cli.ts";
export { type FixReport, fixMarkdown, fixMarkdownReport } from "./fix/engine.ts";
export { FixInvariantError } from "./fix/verify.ts";
export { buildDocModel, type DocModel } from "./model.ts";
export { FIX_ORDER, RULES } from "./rules/index.ts";
export type { Category, Edit, Finding, Rule, RuleId } from "./rules/types.ts";
export { CATEGORIES, RULE } from "./rules/types.ts";
