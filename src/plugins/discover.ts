// Discovery: which plugin sources a project has. Three places, in this order:
// local rule files in .prose-gates/rules, packages the project declares as
// dependencies and whose name matches the plugin pattern, and the paths or
// names a config lists. A directory of node_modules is never scanned, so only
// what the project chose to depend on can run.

import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
import type { Config } from "../config.ts";

export type SourceKind = "local" | "package" | "config";

export interface PluginSource {
  kind: SourceKind;
  // What the user would recognise: a package name or a path under the root.
  spec: string;
  // The file to import.
  path: string;
}

export const LOCAL_RULES = join(".prose-gates", "rules");

// prose-gates-plugin-acme, @acme/prose-gates-plugin-acme or @acme/prose-gates-plugin.
export const PACKAGE_PATTERN = /^(@[a-z0-9][a-z0-9._-]*\/)?prose-gates-plugin(-[a-z0-9-]+)?$/;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const readJson = async (path: string): Promise<Record<string, unknown> | null> => {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch {
    return null;
  }
  try {
    const value: unknown = JSON.parse(text);
    if (isRecord(value)) return value;
  } catch {
    // Reported below with the path.
  }
  throw new Error(`${path} is not a JSON object`);
};

const LOCAL_EXTENSIONS = new Set([".js", ".mjs"]);
const TYPESCRIPT_EXTENSIONS = new Set([".ts", ".mts", ".cts"]);

const localSources = async (root: string): Promise<PluginSource[]> => {
  const dir = join(root, LOCAL_RULES);
  let names: string[];
  try {
    names = (await readdir(dir)).sort();
  } catch {
    return [];
  }
  const sources: PluginSource[] = [];
  for (const name of names) {
    const ext = extname(name);
    if (TYPESCRIPT_EXTENSIONS.has(ext)) {
      throw new Error(
        `${join(LOCAL_RULES, name)}: a local rule is a .js or .mjs file, because Node cannot import ${ext} directly`,
      );
    }
    if (LOCAL_EXTENSIONS.has(ext))
      sources.push({ kind: "local", spec: join(LOCAL_RULES, name), path: join(dir, name) });
  }
  return sources;
};

// The file Node would import for a package, read from its package.json the
// way a resolver does: the exports entry, then main, then index.js.
const pick = (target: unknown): string | null => {
  if (typeof target === "string") return target;
  if (Array.isArray(target)) {
    for (const item of target) {
      const found = pick(item);
      if (found) return found;
    }
    return null;
  }
  if (isRecord(target)) {
    for (const condition of ["node", "import", "default"]) {
      if (condition in target) {
        const found = pick(target[condition]);
        if (found) return found;
      }
    }
  }
  return null;
};

const entryOf = (pkg: Record<string, unknown>): string => {
  const exported = pkg.exports;
  const main =
    isRecord(exported) && "." in exported
      ? exported["."]
      : isRecord(exported) && Object.keys(exported).some((k) => k.startsWith("."))
        ? null
        : exported;
  const entry = pick(main) ?? (typeof pkg.main === "string" ? pkg.main : "index.js");
  return entry;
};

export const resolvePackage = async (root: string, name: string): Promise<string> => {
  for (let dir = resolve(root); ; dir = dirname(dir)) {
    const folder = join(dir, "node_modules", name);
    const pkg = await readJson(join(folder, "package.json"));
    if (pkg) return join(folder, entryOf(pkg));
    if (dirname(dir) === dir) break;
  }
  throw new Error(
    `plugin package "${name}" is declared or listed but not installed; looked from ${root} upward. Install it, or remove it`,
  );
};

const declaredPlugins = async (root: string): Promise<string[]> => {
  const pkg = await readJson(join(root, "package.json"));
  if (!pkg) return [];
  const names = ["dependencies", "devDependencies", "optionalDependencies"].flatMap((field) => {
    const deps = pkg[field];
    return isRecord(deps) ? Object.keys(deps) : [];
  });
  return [...new Set(names)].filter((name) => PACKAGE_PATTERN.test(name)).sort();
};

export const discoverSources = async (root: string, config: Config): Promise<PluginSource[]> => {
  const sources = await localSources(root);
  for (const name of await declaredPlugins(root)) {
    sources.push({ kind: "package", spec: name, path: await resolvePackage(root, name) });
  }
  for (const spec of config.plugins || []) {
    const path = spec.startsWith(".") || isAbsolute(spec) ? resolve(root, spec) : await resolvePackage(root, spec);
    sources.push({ kind: "config", spec, path });
  }
  // A package both declared and listed in the config loads once.
  const seen = new Set<string>();
  return sources.filter((s) => !seen.has(s.path) && seen.add(s.path));
};
