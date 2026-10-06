// The registry: the rules a run actually uses. It starts from the built-in
// catalogue, adds whatever plugins loaded, then applies the config, so a rule
// that is off loses its check and its fixer together. Nothing else reads the
// catalogue directly, which is what lets a plugin rule behave as a built-in.

import { type Config, UsageError } from "../config.ts";
import { interpunctRuns, isFlat } from "../interpunct.ts";
import type { DocModel } from "../model.ts";
import { sentences, words } from "../text.ts";
import { FIX_ORDER, RULES } from "./index.ts";
import { lengthMessage } from "./sentence-word-budget-exceeded.ts";
import { type OptionType, RULE, type Rule, type RuleContext, type RuleId, type RuleOptions } from "./types.ts";

export const BUILTIN_CATEGORIES: ReadonlyMap<string, string> = new Map([
  ["sentence", "How a sentence is laid out and how long it runs"],
  ["list", "A list hidden in running prose, promoted to a real markdown list"],
  ["punctuation", "A glyph that reads as generated text"],
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
  rules: Rule[];
  fixOrder: Rule[];
  enabled: ReadonlySet<RuleId>;
  options: ReadonlyMap<RuleId, RuleOptions>;
  categories: ReadonlyMap<string, string>;
  sources: LoadedSource[];
}

export interface RegistryInput {
  rules: Rule[];
  fixOrder: Rule[];
  categories: ReadonlyMap<string, string>;
  sources?: LoadedSource[];
  config?: Config;
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
      throw new UsageError(`${where}: rule "${rule.id}" has no option "${name}"; ${list}`);
    }
    if (typeOf(value) !== want) {
      throw new UsageError(`${where}: option "${name}" of "${rule.id}" must be a ${want}`);
    }
  }
  if ("maxWords" in options && !((options.maxWords as number) >= 1)) {
    throw new UsageError(`${where}: option "maxWords" of "${rule.id}" must be at least 1`);
  }
};

export const buildRegistry = (input: RegistryInput): Registry => {
  const { rules, fixOrder, categories, sources = [], config } = input;
  const off = new Set<string>();
  const options = new Map<RuleId, RuleOptions>();
  const where = config?.file ?? "config";
  for (const [id, setting] of config?.rules ?? []) {
    const rule = rules.find((r) => r.id === id);
    if (!rule) {
      throw new UsageError(
        `${where}: unknown rule "${id}"; a retired or misspelt id cannot be switched off. Known rules: ${rules.map((r) => r.id).join(", ")}`,
      );
    }
    checkOptions(where, rule, setting.options);
    if (setting.severity === "off") off.add(id);
    else options.set(rule.id, setting.options);
  }
  const active = rules.filter((r) => !off.has(r.id));
  return {
    rules: active,
    fixOrder: fixOrder.filter((r) => !off.has(r.id)),
    enabled: new Set(active.map((r) => r.id)),
    options,
    categories,
    sources,
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
