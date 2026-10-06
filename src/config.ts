// The config file: which rules are off and what options each takes. It is
// optional, because everything auto-detected loads without it. A mistake in it
// is a usage error, so a stale or misspelt rule id fails the run instead of
// silently doing nothing.

import { access, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { RuleOptions } from "./rules/types.ts";

// A problem with how the tool was invoked or configured, which the CLI
// reports with exit code 2 rather than as a runtime failure.
export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

export type Severity = "error" | "off";

export interface RuleSetting {
  severity: Severity;
  options: RuleOptions;
}

export interface Config {
  // Extra plugin paths or package names beyond what is auto-detected, or
  // `false` for a built-ins-only run.
  plugins: string[] | false;
  rules: Map<string, RuleSetting>;
  // The file it came from, for messages. Null when there is no config.
  file: string | null;
}

export const NO_CONFIG: Config = { plugins: [], rules: new Map(), file: null };

export const CONFIG_FILES = ["prose-gates.config.json", "prose-gates.config.mjs"] as const;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const parseSetting = (file: string, id: string, raw: unknown): RuleSetting => {
  const where = `${file}: rule "${id}"`;
  const [severity, options = {}] = Array.isArray(raw) ? raw : [raw];
  if (Array.isArray(raw) && (raw.length < 1 || raw.length > 2)) {
    throw new UsageError(`${where} must be "error", "off" or [severity, options]`);
  }
  if (severity !== "error" && severity !== "off") {
    throw new UsageError(`${where} has severity ${JSON.stringify(severity)}; use "error" or "off"`);
  }
  if (!isRecord(options)) throw new UsageError(`${where} options must be an object`);
  return { severity, options };
};

export const parseConfig = (file: string, raw: unknown): Config => {
  if (!isRecord(raw)) throw new UsageError(`${file}: the config must be an object`);
  for (const key of Object.keys(raw)) {
    if (key !== "plugins" && key !== "rules") {
      throw new UsageError(`${file}: unknown key "${key}"; a config has "plugins" and "rules"`);
    }
  }
  const { plugins = [], rules = {} } = raw;
  const validPlugins = plugins === false || (Array.isArray(plugins) && plugins.every((p) => typeof p === "string"));
  if (!validPlugins) throw new UsageError(`${file}: "plugins" must be a list of strings, or false`);
  if (!isRecord(rules)) throw new UsageError(`${file}: "rules" must be an object`);
  return {
    plugins: plugins as string[] | false,
    rules: new Map(Object.entries(rules).map(([id, value]) => [id, parseSetting(file, id, value)])),
    file,
  };
};

// The first config file at the root, or null. Two at once is ambiguous, so it
// is an error rather than a pick.
export const findConfig = async (root: string): Promise<string | null> => {
  const found: string[] = [];
  for (const name of CONFIG_FILES) {
    const path = join(root, name);
    if (
      await access(path).then(
        () => true,
        () => false,
      )
    )
      found.push(path);
  }
  if (found.length > 1) throw new UsageError(`more than one config file at ${root}: ${found.join(", ")}`);
  return found[0] ?? null;
};

export const loadConfig = async (file: string): Promise<Config> => {
  if (extname(file) === ".json") {
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(file, "utf8"));
    } catch (err) {
      throw new UsageError(`${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
    return parseConfig(file, raw);
  }
  if (extname(file) === ".mjs") {
    const mod = (await import(pathToFileURL(file).href)) as { default?: unknown };
    return parseConfig(file, mod.default);
  }
  throw new UsageError(`${file}: a config is a .json or .mjs file`);
};
