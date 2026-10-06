// Assembling plugins: discover the sources, load each one, and merge their
// rules and categories into the set the registry is built from. Namespaces and
// new category words are global, so two plugins cannot share either.

import type { Config } from "../config.ts";
import { BUILTIN_CATEGORIES, type LoadedSource } from "../rules/registry.ts";
import type { Rule } from "../rules/types.ts";
import type { Plugin } from "./contract.ts";
import { discoverSources, LOCAL_RULES, type PluginSource } from "./discover.ts";
import { loadLocal, loadPackage, PluginLoadError, toRule } from "./load.ts";

export interface PluginSet {
  rules: Rule[];
  categories: Map<string, string>;
  sources: LoadedSource[];
  // Found but not loaded, because the run asked for built-ins only.
  skipped: PluginSource[];
}

export const loadPlugins = async (root: string, config: Config, enabled: boolean): Promise<PluginSet> => {
  const found = await discoverSources(root, config);
  const set: PluginSet = { rules: [], categories: new Map(BUILTIN_CATEGORIES), sources: [], skipped: [] };
  if (!enabled) return { ...set, skipped: found };

  const loaded: { plugin: Plugin; kind: LoadedSource["kind"]; spec: string }[] = [];
  const locals = found.filter((s) => s.kind === "local");
  if (locals.length > 0) loaded.push({ plugin: await loadLocal(locals), kind: "local", spec: LOCAL_RULES });
  for (const source of found.filter((s) => s.kind !== "local")) {
    loaded.push({ plugin: await loadPackage(source, new Set(["local"])), kind: source.kind, spec: source.spec });
  }

  const namespaces = new Map<string, string>();
  const declaredBy = new Map<string, string>();
  for (const { plugin, spec } of loaded) {
    const { namespace } = plugin.meta;
    const other = namespaces.get(namespace);
    if (other) throw new PluginLoadError(spec, `namespace "${namespace}" is already used by ${other}`);
    namespaces.set(namespace, spec);
    for (const [word, description] of Object.entries(plugin.meta.categories ?? {})) {
      const first = declaredBy.get(word);
      if (first) throw new PluginLoadError(spec, `category "${word}" is already declared by ${first}`);
      declaredBy.set(word, spec);
      set.categories.set(word, description);
    }
  }

  for (const { plugin, kind, spec } of loaded) {
    const rules = Object.entries(plugin.rules).map(([key, rule]) => toRule(plugin.meta.namespace, key, rule));
    set.rules.push(...rules);
    set.sources.push({ kind, spec, namespace: plugin.meta.namespace, rules: rules.map((r) => r.id) });
  }
  return set;
};
