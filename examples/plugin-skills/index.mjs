// The plugin entry: a name, a namespace, the contract version, the categories
// it adds and its rules. Each rule lives in rules/ so it can also be copied into
// a project as a local rule.

import multiline, { categories } from "./rules/frontmatter-description-multiline-string.mjs";
import wordBudget from "./rules/frontmatter-description-word-budget.mjs";

export default {
  meta: { name: "skills", namespace: "skills", apiVersion: 1, categories },
  rules: {
    "frontmatter-description-multiline-string": multiline,
    "frontmatter-description-word-budget": wordBudget,
  },
};
