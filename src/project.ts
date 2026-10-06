// Setting up a run: find the project root, read its config, and build the
// registry every check and fix in the run uses. This happens once, before any
// file is read, so a bad config or plugin stops the run before it touches a
// document.

import { access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { CONFIG_FILES, findConfig, loadConfig, NO_CONFIG, UsageError } from "./config.ts";
import { FIX_ORDER, RULES } from "./rules/index.ts";
import { BUILTIN_CATEGORIES, buildRegistry, type Registry } from "./rules/registry.ts";

export const LOCAL_DIR = ".prose-gates";

const exists = (path: string): Promise<boolean> =>
  access(path).then(
    () => true,
    () => false,
  );

// The nearest ancestor of the working directory that marks a project: a
// package.json, a config file or a .prose-gates directory. With none, the
// working directory itself, so a loose folder of notes still works.
export const findProjectRoot = async (cwd: string): Promise<string> => {
  const markers = ["package.json", LOCAL_DIR, ...CONFIG_FILES];
  for (let dir = resolve(cwd); ; dir = dirname(dir)) {
    for (const marker of markers) if (await exists(join(dir, marker))) return dir;
    if (dirname(dir) === dir) return resolve(cwd);
  }
};

export interface SetupOptions {
  cwd: string;
  configPath?: string;
}

export const setUp = async ({ cwd, configPath }: SetupOptions): Promise<Registry> => {
  const root = await findProjectRoot(cwd);
  let file: string | null;
  if (configPath !== undefined) {
    file = resolve(cwd, configPath);
    if (!(await exists(file))) throw new UsageError(`--config ${configPath}: no such file`);
  } else {
    file = await findConfig(root);
  }
  const config = file ? await loadConfig(file) : NO_CONFIG;
  return buildRegistry({ rules: RULES, fixOrder: FIX_ORDER, categories: BUILTIN_CATEGORIES, config });
};
