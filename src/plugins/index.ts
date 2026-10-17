// Assembling plugins: discover the sources, load each one, and merge their
// rules and categories into the set the registry is built from. Namespaces and
// new category words are global, so two plugins cannot share either.
//
// How a failed source is treated is the mode. Strict throws the first failure,
// which is the default. Lenient leaves the failed source out and returns it, so
// the caller can say so. Collect does the same and is what validation uses, so
// one run reports every failure. Off loads nothing.

import type { Config } from "../config.ts";
import { PluginConflictError, PluginLoadError } from "../errors.ts";
import { BUILTIN_CATEGORIES, type LoadedSource } from "../rules/registry.ts";
import type { Rule } from "../rules/types.ts";
import type { Plugin } from "./contract.ts";
import { discoverSources, LOCAL_RULES, type PluginSource, type SourceKind } from "./discover.ts";
import { loadLocal, loadPackage, toRule } from "./load.ts";

export type PluginMode = "off" | "strict" | "lenient" | "collect";

export interface PluginFailure {
  source: string;
  kind: SourceKind;
  error: PluginLoadError;
}

export interface PluginSet {
  rules: Rule[];
  categories: Map<string, string>;
  sources: LoadedSource[];
  // Specs found but not loaded, because the run asked for built-ins only.
  skipped: string[];
  // Sources left out because they failed. Always empty in strict mode, which throws.
  failures: PluginFailure[];
}

type Settle = (error: PluginLoadError, kind: SourceKind) => void;

interface LoadedPlugin {
  plugin: Plugin;
  kind: SourceKind;
  spec: string;
}

// Strict stops at the first failure. The others record it and carry on.
const settler =
  (mode: PluginMode, failures: PluginFailure[]): Settle =>
  (error, kind) => {
    if (mode === "strict") throw error;
    if (!failures.some((f) => f.source === error.source)) failures.push({ source: error.source, kind, error });
  };

// Local files load together as one plugin, then each package loads on its own.
const importSources = async (found: PluginSource[], settle: Settle): Promise<LoadedPlugin[]> => {
  const loaded: LoadedPlugin[] = [];
  const locals = found.filter((s) => s.kind === "local");
  if (locals.length > 0) {
    const local = await loadLocal(locals);
    for (const error of local.failures) settle(error, "local");
    if (local.plugin) loaded.push({ plugin: local.plugin, kind: "local", spec: LOCAL_RULES });
  }
  for (const source of found.filter((s) => s.kind !== "local")) {
    try {
      loaded.push({ plugin: await loadPackage(source, new Set(["local"])), kind: source.kind, spec: source.spec });
    } catch (err) {
      if (!(err instanceof PluginLoadError)) throw err;
      settle(err, source.kind);
    }
  }
  return loaded;
};

interface Claims {
  namespaces: Map<string, string>;
  declaredBy: Map<string, string>;
}

// The earlier claimant and the reason, when a plugin reuses a namespace or a
// category word another plugin already holds. Null when it claims nothing taken.
const findClash = (plugin: Plugin, claims: Claims): { other: string; reason: string } | null => {
  const { namespace } = plugin.meta;
  const taken = claims.namespaces.get(namespace);
  if (taken) return { other: taken, reason: `namespace "${namespace}" is already used by ${taken}` };
  const clash = Object.keys(plugin.meta.categories ?? {}).find((w) => claims.declaredBy.has(w));
  if (!clash) return null;
  const other = claims.declaredBy.get(clash) as string;
  return { other, reason: `category "${clash}" is already declared by ${other}` };
};

// Namespaces and new categories are global. The first plugin to claim one
// keeps it, and a later claimant fails, naming both.
const acceptPlugins = (loaded: LoadedPlugin[], set: PluginSet, settle: Settle): LoadedPlugin[] => {
  const claims: Claims = { namespaces: new Map(), declaredBy: new Map() };
  const accepted: LoadedPlugin[] = [];
  for (const entry of loaded) {
    const { plugin, spec, kind } = entry;
    const clash = findClash(plugin, claims);
    if (clash) {
      settle(new PluginConflictError(spec, clash.other, clash.reason), kind);
      continue;
    }
    claims.namespaces.set(plugin.meta.namespace, spec);
    for (const [word, description] of Object.entries(plugin.meta.categories ?? {})) {
      claims.declaredBy.set(word, spec);
      set.categories.set(word, description);
    }
    accepted.push(entry);
  }
  return accepted;
};

// Each accepted plugin's rules join the set, and the source records which ids it gave.
const addRules = (set: PluginSet, accepted: LoadedPlugin[]): void => {
  for (const { plugin, kind, spec } of accepted) {
    const rules = Object.entries(plugin.rules).map(([key, rule]) => toRule(plugin.meta.namespace, key, rule));
    set.rules.push(...rules);
    set.sources.push({ kind, spec, namespace: plugin.meta.namespace, rules: rules.map((r) => r.id) });
  }
};

export const loadPlugins = async (root: string, config: Config, mode: PluginMode): Promise<PluginSet> => {
  const { sources: found, failures: unresolved } = await discoverSources(root, config);
  const set: PluginSet = {
    rules: [],
    categories: new Map(BUILTIN_CATEGORIES),
    sources: [],
    skipped: [],
    failures: [],
  };
  if (mode === "off") return { ...set, skipped: [...found.map((s) => s.spec), ...unresolved.map((e) => e.source)] };

  const settle = settler(mode, set.failures);
  for (const error of unresolved) settle(error, "package");
  const loaded = await importSources(found, settle);
  addRules(set, acceptPlugins(loaded, set, settle));
  return set;
};
