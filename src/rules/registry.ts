// The registry: the rules a run actually uses. It starts from the built-in
// catalogue, adds whatever plugins loaded, then applies the config, so a rule
// that is off loses its check and its fixer together. Nothing else reads the
// catalogue directly, which is what lets a plugin rule behave as a built-in.

import type { Config } from "../config.ts";
import { RuleOptionError, UnknownRuleError } from "../errors.ts";
import { interpunctRuns, isFlat } from "../interpunct.ts";
import type { DocModel } from "../model.ts";
import { sentences, words } from "../text.ts";
import { FIX_ORDER, RULES } from "./index.ts";
import { lengthMessage } from "./sentence-word-budget-exceeded.ts";
import {
  type FindingSeverity,
  isPluginRuleId,
  type OptionType,
  RULE,
  type Rule,
  type RuleContext,
  type RuleId,
  type RuleOptions,
  type Severity,
} from "./types.ts";

export const BUILTIN_CATEGORIES: ReadonlyMap<string, string> = new Map([
  ["sentence", "How a sentence is laid out and how long it runs"],
  ["list", "A list hidden in running prose, promoted to a real markdown list"],
  ["punctuation", "A glyph that reads as generated text"],
  ["residue", "Text left over from a chat or a draft, such as tool markup, a wrapper sentence or a placeholder"],
  ["phrase", "Stock phrasing that signals importance or authority instead of stating a fact"],
  ["structure", "Headings, rules and lists that decorate a document instead of organising it"],
]);

export const TEXT_HELPERS = { words, sentences, lengthMessage } as const;

// Where a group of rules came from, for the line each run prints.
export interface LoadedSource {
  kind: "local" | "package" | "config";
  spec: string;
  namespace: string;
  rules: RuleId[];
}

export interface Registry {
  // The rules a run uses: those whose severity is error or warn.
  rules: Rule[];
  // Every rule loaded, on or off, so a listing can show what a config switched off.
  catalogue: Rule[];
  fixOrder: Rule[];
  enabled: ReadonlySet<RuleId>;
  // The severity of each active rule, from the config, then the rule's default, then error.
  severities: ReadonlyMap<RuleId, FindingSeverity>;
  // The severity of every rule in the catalogue, on or off.
  levels: ReadonlyMap<RuleId, Severity>;
  options: ReadonlyMap<RuleId, RuleOptions>;
  categories: ReadonlyMap<string, string>;
  sources: LoadedSource[];
  // Config settings dropped because they name a plugin rule that did not load.
  ignoredSettings: string[];
}

export interface RegistryInput {
  rules: Rule[];
  fixOrder: Rule[];
  categories: ReadonlyMap<string, string>;
  sources?: LoadedSource[];
  config?: Config;
  // A lenient run drops a setting for an unknown plugin rule instead of failing.
  ignoreUnknownPluginIds?: boolean;
}

const typeOf = (value: unknown): OptionType | null => {
  if (typeof value === "number" && Number.isFinite(value)) return "number";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) return "string[]";
  return null;
};

const checkOptions = (where: string, rule: Rule, options: RuleOptions): void => {
  const accepted = Object.keys(rule.options ?? {});
  for (const [name, value] of Object.entries(options)) {
    const want = rule.options?.[name];
    if (!want) {
      const list = accepted.length > 0 ? `it accepts ${accepted.join(", ")}` : "it takes no options";
      throw new RuleOptionError(where, rule.id, name, `rule "${rule.id}" has no option "${name}"; ${list}`);
    }
    if (typeOf(value) !== want) {
      throw new RuleOptionError(where, rule.id, name, `option "${name}" of "${rule.id}" must be a ${want}`);
    }
  }
  if ("maxWords" in options && !((options.maxWords as number) >= 1)) {
    throw new RuleOptionError(where, rule.id, "maxWords", `option "maxWords" of "${rule.id}" must be at least 1`);
  }
};

export const buildRegistry = (input: RegistryInput): Registry => {
  const { rules, fixOrder, categories, sources = [], config, ignoreUnknownPluginIds = false } = input;
  const configured = new Map<string, Severity>();
  const options = new Map<RuleId, RuleOptions>();
  const ignored: string[] = [];
  const where = config?.file ?? "config";
  for (const [id, setting] of config?.rules ?? []) {
    const rule = rules.find((r) => r.id === id);
    if (!rule) {
      // A plugin that was skipped cannot have its rules configured, so a lenient
      // run drops the setting and says so. A built-in id is never forgiven.
      if (ignoreUnknownPluginIds && isPluginRuleId(id)) {
        ignored.push(id);
        continue;
      }
      throw new UnknownRuleError(
        where,
        id,
        rules.map((r) => r.id),
      );
    }
    checkOptions(where, rule, setting.options);
    configured.set(id, setting.severity);
    if (setting.severity !== "off") options.set(rule.id, setting.options);
  }
  const levels = new Map<RuleId, Severity>(
    rules.map((r) => [r.id, configured.get(r.id) ?? r.defaultSeverity ?? "error"]),
  );
  const active = rules.filter((r) => levels.get(r.id) !== "off");
  const severities = new Map<RuleId, FindingSeverity>(
    active.map((r) => [r.id, levels.get(r.id) === "warn" ? "warn" : "error"]),
  );
  return {
    rules: active,
    catalogue: rules,
    fixOrder: fixOrder.filter((r) => levels.get(r.id) !== "off"),
    enabled: new Set(active.map((r) => r.id)),
    severities,
    levels,
    options,
    categories,
    sources,
    ignoredSettings: ignored,
  };
};

export const BUILTIN: Registry = buildRegistry({ rules: RULES, fixOrder: FIX_ORDER, categories: BUILTIN_CATEGORIES });

// The data every rule shares, derived once per document. Interpunct runs are
// read by several rules, so computing them here keeps the fix engine from
// rebuilding them once per rule on every pass of the fixpoint loop. A run is
// owned by the flat or the stacked list rule, and it counts as reported only
// while its owner is on.
export const ruleContext = (doc: DocModel, registry: Registry = BUILTIN): RuleContext => {
  const runs = interpunctRuns(doc);
  const reported = runs.filter((run) => registry.enabled.has(isFlat(run) ? RULE.INTERPUNCT_RUN : RULE.STACKED_RUNS));
  return { doc, runs, reported };
};
