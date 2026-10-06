// The contract every rule implements: a check that reports findings, and an
// optional fixer that proposes edits. The fix engine, not the fixer, decides
// whether an edit is safe to keep.

import type { InterpunctRun } from "../interpunct.ts";
import type { DocModel, ParagraphView } from "../model.ts";

export const RULE = {
  WRAP: "sentence-one-per-line",
  LENGTH: "sentence-word-budget-exceeded",
  SEMICOLON_LIST: "list-semicolon-delimited-run",
  EM_DASH: "punctuation-em-dash-in-prose",
  INTERPUNCT: "punctuation-interpunct-in-prose",
  INTERPUNCT_RUN: "list-interpunct-joined-run",
  INLINE_ENUM: "list-inline-enumeration-markers",
  LABELLED_RUN: "list-comma-labelled-run",
  STACKED_RUNS: "list-stacked-interpunct-runs",
} as const;

// A core id has no slash. A plugin id is always namespace/name, so the slash
// is what tells the two apart.
export type CoreRuleId = (typeof RULE)[keyof typeof RULE];

// A rule function may be synchronous or return a promise, so a rule can call a tool
// or a service. The engine awaits every call.
export type Awaitable<T> = T | Promise<T>;

export type PluginRuleId = `${string}/${string}`;

export const isPluginRuleId = (id: string): id is PluginRuleId => id.includes("/");

export type RuleId = CoreRuleId | PluginRuleId;

export interface Finding {
  file: string;
  line: number;
  rule: RuleId;
  message: string;
}

// The data every rule shares, computed once per document and handed to it.
// Shared data is passed in rather than recomputed, so a check and a fix can
// never disagree about what the document holds. `runs` is every interpunct
// run. `reported` is the runs some enabled rule owns, so a rule that defers
// to another stops deferring when that rule is switched off.
export interface RuleContext {
  doc: DocModel;
  runs: InterpunctRun[];
  reported: InterpunctRun[];
}

// What a rule may be configured with. A rule names each option it accepts
// and the type of its value, and the config is checked against that.
export type OptionType = "number" | "string" | "boolean" | "string[]";

export type OptionSpec = Readonly<Record<string, OptionType>>;

export type RuleOptions = Readonly<Record<string, unknown>>;

// Plain functions a plugin can use without importing this package, so a plugin
// never depends on resolving the host from its own location.
export interface TextHelpers {
  words: (text: string) => number;
  sentences: (text: string) => string[];
  lengthMessage: (sentence: string, maxWords: number) => string;
}

// A check also names the file it reports against, and the sentence budget.
export interface CheckContext extends RuleContext {
  file: string;
  maxWords: number;
  options: RuleOptions;
  helpers: TextHelpers;
}

// A fix needs nothing beyond the shared context and its own options. It
// proposes edits, and the engine alone decides which of them survive.
export interface FixContext extends RuleContext {
  options: RuleOptions;
  helpers: TextHelpers;
}

// What the engine must be able to prove about the document after an edit.
export type Expectation =
  // Whitespace only: the tree is unchanged once text whitespace is collapsed.
  | { kind: "same-tree" }
  // Glyphs swapped inside text: the tree keeps its shape and every word.
  | { kind: "same-shape" }
  // One paragraph becomes the blocks parsed from `fragment`, and nothing else
  // in the document moves.
  | { kind: "replace-paragraph"; view: ParagraphView; fragment: string; listItems: number };

export interface Edit {
  rule: RuleId;
  start: number;
  end: number;
  text: string;
  expect: Expectation;
}

// What a rule guards, so related rules read as a group in help and RULES.md.
// sentence: how a sentence is laid out and how long it runs.
// list: a list hidden in running prose, promoted to a real markdown list.
// punctuation: a glyph that reads as generated text.
// A plugin may add a category of its own by declaring it.
export const CATEGORIES = ["sentence", "list", "punctuation"] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Rule {
  id: RuleId;
  category: string;
  summary: string;
  // The options the rule accepts. Absent when it takes none.
  options?: OptionSpec;
  check: (ctx: CheckContext) => Awaitable<Finding[]>;
  // Absent for rules whose fix needs discretion (sentence-word-budget-exceeded).
  fix?: (ctx: FixContext) => Awaitable<Edit[]>;
}
