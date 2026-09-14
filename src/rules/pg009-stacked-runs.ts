// PG009: interpunct runs stacked on 2+ source lines of one paragraph are a
// two-level structure, so PG009 replaces PG006 for that paragraph. The fix
// needs every line to read `Label: a · b · c`, and builds one parent bullet
// per label with the items nested beneath it.

import { first } from "../fix/ends.ts";
import { itemsBetween, type PromotedItem, promote } from "../fix/promote.ts";
import { collapse, matchesInAll, splittableSeparators, within } from "../fix/spans.ts";
import type { ParagraphView, Range } from "../model.ts";
import { isStacked } from "./interpunct.ts";
import { type Edit, RULE, type Rule } from "./types.ts";

const SEPARATOR = /[ \t]*·[ \t]*/;
const GLYPH = /·/g;

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
  const stacked = runs.filter(isStacked);
  for (const view of doc.paragraphs) {
    if (!stacked.some((run) => run.range[0] === view.startOffset)) continue;
    const separators = splittableSeparators(src, view, SEPARATOR, GLYPH);
    const colons = matchesInAll(src, view.directTexts, /:/);
    if (separators === null || colons === null) continue;

    // Every line must read `Label: a · b · c`, or the paragraph is not the
    // two-level structure the fix knows how to build.
    const lines = linesOf(view);
    const parents: PromotedItem[] = [];
    for (const line of lines) {
      const inside = separators.filter((separator) => within(separator, line));
      const colon = colons.find((c) => within(c, line));
      if (inside.length === 0 || !colon || colon[1] > first(inside)[0]) break;
      parents.push({
        text: collapse(src.slice(line[0], colon[0])).trim(),
        children: itemsBetween(src, [colon, ...inside], line[1]),
      });
    }
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
