// PG009: interpunct runs stacked on 2+ source lines of one paragraph are a
// two-level structure, so PG009 replaces PG006 for that paragraph. The fix
// needs every line to read `Label: a · b · c`, and builds one parent bullet
// per label with the items nested beneath it.

import { itemsBetween, type PromotedItem, promote } from "../fix/promote.ts";
import { GLYPH, isStacked, paragraphsOf, RUN_SEPARATOR } from "../interpunct.ts";
import type { ParagraphView } from "../model.ts";
import { colonsBefore, colonsIn, splittableSeparators } from "../query.ts";
import { collapse, first, type Range, within } from "../text.ts";
import { type Edit, RULE, type Rule } from "./types.ts";

// The source lines of a paragraph, as absolute ranges.
const linesOf = (view: ParagraphView): Range[] => {
  const lines: Range[] = [];
  let at = view.startOffset;
  for (const line of view.raw.split("\n")) {
    lines.push([at, at + line.length]);
    at += line.length + 1;
  }
  return lines;
};

// One line read as `Label: a · b · c`, or null when it is not that shape.
// Every line of the paragraph has to parse, or the fix has no nested list to
// build and leaves the whole paragraph reported.
const parentOf = (src: string, line: Range, separators: Range[], colons: Range[]): PromotedItem | null => {
  const inside = separators.filter((separator) => within(separator, line));
  if (inside.length === 0) return null;
  const colon = colonsBefore(colons, line, first(inside)[0])[0];
  if (!colon) return null;
  return {
    text: collapse(src.slice(line[0], colon[0])).trim(),
    children: itemsBetween(src, [colon, ...inside], line[1]),
  };
};

const check: Rule["check"] = ({ file, runs }) =>
  runs.filter(isStacked).map((run) => ({
    file,
    line: run.line,
    rule: RULE.STACKED_RUNS,
    message: `interpunct runs stacked on ${run.lines} lines; promote to a nested list`,
  }));

const fix: Rule["fix"] = ({ doc, runs }) => {
  const { src } = doc;
  const edits: Edit[] = [];
  for (const view of paragraphsOf(doc, runs.filter(isStacked))) {
    const separators = splittableSeparators(src, view, RUN_SEPARATOR, GLYPH);
    const colons = colonsIn(src, view);
    if (separators === null || colons === null) continue;

    const lines = linesOf(view);
    const parents = lines
      .map((line) => parentOf(src, line, separators, colons))
      .filter((parent): parent is PromotedItem => parent !== null);
    if (parents.length !== lines.length) continue;

    const edit = promote({
      rule: RULE.STACKED_RUNS,
      src,
      view,
      span: [view.startOffset, view.endOffset],
      leadIn: null,
      items: parents,
      ordered: false,
    });
    if (edit) edits.push(edit);
  }
  return edits;
};

export const pg009: Rule = {
  id: RULE.STACKED_RUNS,
  category: "list",
  summary: "interpunct runs stacked on several lines (nested list)",
  check,
  fix,
};
