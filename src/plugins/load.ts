// Loading: import a plugin module, check it has the shape the contract
// promises, and turn its rules into ordinary Rules. Every failure names the
// source and the reason and stops the run. There is no skipped plugin, because
// a rule that quietly did not run looks the same as a document that is clean.

import { basename, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { BUILTIN_CATEGORIES } from "../rules/registry.ts";
import type { Edit, Finding, OptionType, Rule, RuleId } from "../rules/types.ts";
import { API_VERSION, CATEGORY_WORD, NAMESPACE, type Plugin, type PluginRule, RULE_KEY } from "./contract.ts";
import type { PluginSource } from "./discover.ts";

export class PluginLoadError extends Error {
  constructor(source: string, reason: string) {
    super(`plugin ${source}: ${reason}`);
    this.name = "PluginLoadError";
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const importModule = async (source: PluginSource): Promise<Record<string, unknown>> => {
  try {
    return (await import(pathToFileURL(source.path).href)) as Record<string, unknown>;
  } catch (err) {
    throw new PluginLoadError(source.spec, `could not be imported: ${message(err)}`);
  }
};

const OPTION_TYPES = new Set<OptionType>(["number", "string", "boolean", "string[]"]);

// Checks one rule's declaration and returns it, so a bad rule fails at load
// rather than the first time it runs.
const checkRule = (spec: string, key: string, raw: unknown, own: ReadonlySet<string>): PluginRule => {
  const where = `rule "${key}"`;
  if (!isRecord(raw)) throw new PluginLoadError(spec, `${where} must be an object`);
  if (!RULE_KEY.test(key)) {
    throw new PluginLoadError(spec, `${where} is not a valid key; use lower-case words joined by hyphens`);
  }
  const { category, summary, options, check, fix } = raw;
  if (typeof category !== "string" || !CATEGORY_WORD.test(category)) {
    throw new PluginLoadError(spec, `${where} needs a category of one lower-case word`);
  }
  if (!BUILTIN_CATEGORIES.has(category) && !own.has(category)) {
    throw new PluginLoadError(
      spec,
      `${where} uses the category "${category}", which this plugin does not declare in meta.categories`,
    );
  }
  if (!key.startsWith(`${category}-`)) {
    throw new PluginLoadError(spec, `${where} must start with its category, as "${category}-short-name"`);
  }
  if (typeof summary !== "string" || summary === "") throw new PluginLoadError(spec, `${where} needs a summary`);
  if (typeof check !== "function") throw new PluginLoadError(spec, `${where} needs a check function`);
  if (fix !== undefined && typeof fix !== "function")
    throw new PluginLoadError(spec, `${where} fix must be a function`);
  if (options !== undefined) {
    const valid = isRecord(options) && Object.values(options).every((t) => OPTION_TYPES.has(t as OptionType));
    if (!valid)
      throw new PluginLoadError(spec, `${where} options must map names to number, string, boolean or string[]`);
  }
  return raw as unknown as PluginRule;
};

const checkCategories = (spec: string, raw: unknown): Record<string, string> => {
  if (raw === undefined) return {};
  if (!isRecord(raw)) throw new PluginLoadError(spec, "categories must map a word to a description");
  for (const [word, description] of Object.entries(raw)) {
    if (!CATEGORY_WORD.test(word)) throw new PluginLoadError(spec, `category "${word}" is not one lower-case word`);
    if (BUILTIN_CATEGORIES.has(word))
      throw new PluginLoadError(spec, `category "${word}" is built in and cannot be declared`);
    if (typeof description !== "string" || description === "") {
      throw new PluginLoadError(spec, `category "${word}" needs a one-line description`);
    }
  }
  return raw as Record<string, string>;
};

// A package: the default export is a Plugin.
export const loadPackage = async (source: PluginSource, reserved: ReadonlySet<string>): Promise<Plugin> => {
  const mod = await importModule(source);
  const raw = mod.default;
  if (!isRecord(raw) || !isRecord(raw.meta) || !isRecord(raw.rules)) {
    throw new PluginLoadError(source.spec, "the default export must be { meta, rules }");
  }
  const { name, namespace, apiVersion } = raw.meta;
  if (apiVersion !== API_VERSION) {
    throw new PluginLoadError(
      source.spec,
      `targets plugin apiVersion ${JSON.stringify(apiVersion)}, but this prose-gates supports ${API_VERSION}`,
    );
  }
  if (typeof name !== "string" || name === "") throw new PluginLoadError(source.spec, "meta.name is required");
  if (typeof namespace !== "string" || !NAMESPACE.test(namespace)) {
    throw new PluginLoadError(source.spec, "meta.namespace must be lower-case words joined by hyphens");
  }
  if (reserved.has(namespace)) throw new PluginLoadError(source.spec, `meta.namespace "${namespace}" is reserved`);
  const categories = checkCategories(source.spec, raw.meta.categories);
  const own = new Set(Object.keys(categories));
  const rules = Object.fromEntries(
    Object.entries(raw.rules).map(([key, rule]) => [key, checkRule(source.spec, key, rule, own)]),
  );
  return { meta: { name, namespace, apiVersion, categories }, rules };
};

// Local files: each default-exports one rule, keyed by its file name. They
// load as one plugin under the fixed namespace `local`, and a file may export
// `categories` to declare the word its rule uses.
export const loadLocal = async (sources: PluginSource[]): Promise<Plugin> => {
  const categories: Record<string, string> = {};
  const loaded: [string, PluginSource, unknown][] = [];
  for (const source of sources) {
    const mod = await importModule(source);
    if (mod.default === undefined) throw new PluginLoadError(source.spec, "has no default export; export one rule");
    const declared = checkCategories(source.spec, mod.categories);
    for (const [word, description] of Object.entries(declared)) {
      if (categories[word] !== undefined && categories[word] !== description) {
        throw new PluginLoadError(
          source.spec,
          `declares category "${word}" with a different description than another local file`,
        );
      }
      categories[word] = description;
    }
    loaded.push([basename(source.path, extname(source.path)), source, mod.default]);
  }
  const own = new Set(Object.keys(categories));
  const rules = Object.fromEntries(loaded.map(([key, source, raw]) => [key, checkRule(source.spec, key, raw, own)]));
  return { meta: { name: "local", namespace: "local", apiVersion: API_VERSION, categories }, rules };
};

const malformed = (id: string, why: string): Error => new Error(`plugin rule ${id} ${why}`);

const validFinding = (f: unknown): f is { line: number; message: string } =>
  isRecord(f) && Number.isInteger(f.line) && (f.line as number) >= 1 && typeof f.message === "string";

const EXPECTATIONS = new Set(["same-tree", "same-shape", "replace-paragraph"]);

// A plugin rule becomes a Rule whose id is namespace/key. Its check cannot
// take the run down: a throw or a malformed finding becomes a finding for that
// rule, and the other rules carry on. Its fixer is held to the same proof as a
// built-in, so a fixer that throws or returns nonsense stops the run loudly.
export const toRule = (namespace: string, key: string, rule: PluginRule): Rule => {
  const id = `${namespace}/${key}` as RuleId;
  const check: Rule["check"] = (ctx) => {
    const report = (why: string): Finding[] => [{ file: ctx.file, line: 1, rule: id, message: `plugin rule ${why}` }];
    let found: unknown;
    try {
      found = rule.check(ctx);
    } catch (err) {
      return report(`threw: ${message(err)}`);
    }
    if (!Array.isArray(found) || !found.every(validFinding)) {
      return report("returned something other than a list of { line, message } findings");
    }
    return found.map((f) => ({ file: ctx.file, line: f.line, rule: id, message: f.message }));
  };
  const fix: Rule["fix"] = rule.fix
    ? (ctx) => {
        let edits: unknown;
        try {
          edits = rule.fix?.(ctx);
        } catch (err) {
          throw malformed(id, `fixer threw: ${message(err)}`);
        }
        if (!Array.isArray(edits)) throw malformed(id, "fixer returned something other than a list of edits");
        return edits.map((e: Edit) => {
          if (!isRecord(e) || !isRecord(e.expect) || !EXPECTATIONS.has(e.expect.kind as string)) {
            throw malformed(id, "fixer returned an edit with no valid expectation");
          }
          return { ...e, rule: id };
        });
      }
    : undefined;
  return { id, category: rule.category, summary: rule.summary, options: rule.options, check, ...(fix ? { fix } : {}) };
};
