// The contract every rule implements: a check that reports findings, and an
// optional fixer that proposes edits. The fix engine, not the fixer, decides
// whether an edit is safe to keep.

import type { InterpunctRun } from "../interpunct.ts";
import type { DocModel, ParagraphView } from "../model.ts";

export const RULE = {
  WRAP: "PG001",
  LENGTH: "PG002",
  SEMICOLON_LIST: "PG003",
  EM_DASH: "PG004",
  INTERPUNCT: "PG005",
  INTERPUNCT_RUN: "PG006",
  INLINE_ENUM: "PG007",
  LABELLED_RUN: "PG008",
  STACKED_RUNS: "PG009",
} as const;

export type RuleId = (typeof RULE)[keyof typeof RULE];

export interface Finding {
  file: string;
  line: number;
  rule: RuleId;
  message: string;
}

// What every rule reads, computed once per document and handed to it. Shared
// data is passed in rather than recomputed, so a check and a fix can never
// disagree about what the document holds.
export interface RuleContext {
  doc: DocModel;
  runs: InterpunctRun[];
}

// A check also names the file it reports against, and the sentence budget.
export interface CheckContext extends RuleContext {
  file: string;
  maxWords: number;
}

// A fix needs nothing beyond the shared context. It proposes edits, and the
// engine alone decides which of them survive verification.
export type FixContext = RuleContext;

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
export const CATEGORIES = ["sentence", "list", "punctuation"] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Rule {
  id: RuleId;
  category: Category;
  summary: string;
  check: (ctx: CheckContext) => Finding[];
  // Absent for rules whose fix needs discretion (PG002).
  fix?: (ctx: FixContext) => Edit[];
}
