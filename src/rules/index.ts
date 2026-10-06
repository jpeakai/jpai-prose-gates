// The rule catalogue, in id order. To add a rule: write one module exporting
// a Rule with its category, register it here, and add its section and
// examples to RULES.md, which tests/rules-doc.test.ts holds to the code.

import { interpunctRuns } from "../interpunct.ts";
import type { DocModel } from "../model.ts";
import { listCommaLabelledRun } from "./list-comma-labelled-run.ts";
import { listInlineEnumerationMarkers } from "./list-inline-enumeration-markers.ts";
import { listInterpunctJoinedRun } from "./list-interpunct-joined-run.ts";
import { listSemicolonDelimitedRun } from "./list-semicolon-delimited-run.ts";
import { listStackedInterpunctRuns } from "./list-stacked-interpunct-runs.ts";
import { punctuationEmDashInProse } from "./punctuation-em-dash-in-prose.ts";
import { punctuationInterpunctInProse } from "./punctuation-interpunct-in-prose.ts";
import { sentenceOnePerLine } from "./sentence-one-per-line.ts";
import { sentenceWordBudgetExceeded } from "./sentence-word-budget-exceeded.ts";
import type { Rule, RuleContext } from "./types.ts";

export const RULES: Rule[] = [
  sentenceOnePerLine,
  sentenceWordBudgetExceeded,
  listSemicolonDelimitedRun,
  punctuationEmDashInProse,
  punctuationInterpunctInProse,
  listInterpunctJoinedRun,
  listInlineEnumerationMarkers,
  listCommaLabelledRun,
  listStackedInterpunctRuns,
];

// The data every rule shares, derived once per document. Interpunct runs are
// read by four rules, so computing them here keeps the fix engine from
// rebuilding them once per rule on every pass of the fixpoint loop.
export const ruleContext = (doc: DocModel): RuleContext => ({ doc, runs: interpunctRuns(doc) });

// The order fixers run in. Structure first: a promotion needs the separators
// a glyph swap would erase, so list-stacked-interpunct-runs and the list rules run before punctuation-interpunct-in-prose
// turns interpuncts into commas. Reflow runs last, over the settled blocks.
export const FIX_ORDER: Rule[] = [
  listStackedInterpunctRuns,
  listInlineEnumerationMarkers,
  listCommaLabelledRun,
  listInterpunctJoinedRun,
  listSemicolonDelimitedRun,
  punctuationInterpunctInProse,
  punctuationEmDashInProse,
  sentenceOnePerLine,
];
