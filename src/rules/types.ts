// The contract every rule implements: a check that reports findings, and an
// optional fixer that proposes edits. The fix engine, not the fixer, decides
// whether an edit is safe to keep.

import type { DocModel, ParagraphView, Range } from "../model.ts";

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

// Paragraphs whose prose joins a run of items with 2+ interpunct separators.
// Shared by PG005, PG006 and PG009 as an explicit data dependency.
export interface InterpunctRun {
  range: Range;
  line: number;
  separators: number;
  lines: number; // source lines of the paragraph that carry a separator
}

export interface CheckContext {
  doc: DocModel;
  file: string;
  maxWords: number;
  runs: InterpunctRun[];
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
export const CATEGORIES = ["sentence", "list", "punctuation"] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Rule {
  id: RuleId;
  category: Category;
  summary: string;
  check: (ctx: CheckContext) => Finding[];
  // Absent for rules whose fix needs discretion (PG002).
  fix?: (doc: DocModel) => Edit[];
}
