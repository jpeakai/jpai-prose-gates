// The plugin entry, in TypeScript: a name, a namespace, the contract version, the
// categories it adds and its rules. Each rule lives in rules/ so it can also be
// copied into a project as a local rule.
//
// Node strips types only outside node_modules, so a package like this one loads
// under Bun, or after it is compiled. A local rule in .prose-gates/rules loads
// under Bun and under Node 22.18 or newer.

import type { Plugin } from "@jpeakai/prose-gates";
import multiline, { categories } from "./rules/frontmatter-description-multiline-string.ts";
import wordBudget from "./rules/frontmatter-description-word-budget.ts";

const plugin: Plugin = {
  meta: { name: "skills-ts", namespace: "skills-ts", apiVersion: 1, categories },
  rules: {
    "frontmatter-description-multiline-string": multiline,
    "frontmatter-description-word-budget": wordBudget,
  },
};

export default plugin;
