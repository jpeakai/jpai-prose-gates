// Public API.

export { checkMarkdown, checkModel, DEFAULT_MAX_WORDS } from "./check.ts";
export { main } from "./cli.ts";
export { type Config, loadConfig, parseConfig, type RuleSetting, type Severity, UsageError } from "./config.ts";
export { type FixReport, fixMarkdown, fixMarkdownReport } from "./fix/engine.ts";
export { FixInvariantError } from "./fix/verify.ts";
export { buildDocModel, type DocModel } from "./model.ts";
export { findProjectRoot, setUp } from "./project.ts";
export { FIX_ORDER, RULES } from "./rules/index.ts";
export {
  BUILTIN,
  BUILTIN_CATEGORIES,
  buildRegistry,
  type LoadedSource,
  type Registry,
  type RegistryInput,
} from "./rules/registry.ts";
export type {
  Category,
  CheckContext,
  CoreRuleId,
  Edit,
  Expectation,
  Finding,
  FixContext,
  OptionSpec,
  OptionType,
  PluginRuleId,
  Rule,
  RuleContext,
  RuleId,
  RuleOptions,
  TextHelpers,
} from "./rules/types.ts";
export { CATEGORIES, isPluginRuleId, RULE } from "./rules/types.ts";
export { sentences, words } from "./text.ts";
