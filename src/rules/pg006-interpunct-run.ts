// PG006: a single-line interpunct-joined run is a disguised flat list. The
// fix promotes it to bullets, taking a colon before the run as the lead-in.
// Without a colon the run must be the whole paragraph, or there is no way to
// tell where the first item starts.

import { first, last } from "../fix/ends.ts";
import { cleanLeadIn, itemsBetween, promote } from "../fix/promote.ts";
import { sentenceSpan, splittableSeparators } from "../fix/spans.ts";
import { type Range, words } from "../model.ts";
import { GLYPH, isFlat, paragraphsOf, RUN_SEPARATOR } from "./interpunct.ts";
import { type Edit, RULE, type Rule } from "./types.ts";
import { colonsBefore, colonsIn } from "./utils.ts";

// A last item this much longer than every other is a sentence that happens
// to follow the list, not a member of it.
const tailIsProse = (items: string[]): boolean =>
  words(last(items)) > Math.max(8, 3 * Math.max(...items.slice(0, -1).map(words)));

// Without a colon, a first item longer than the rest ("Built with Bun")
// carries a clause the list would strip of its meaning.
const headIsProse = (items: string[]): boolean => words(first(items)) > Math.max(...items.slice(1).map(words));

const check: Rule["check"] = ({ file, runs }) =>
  runs.filter(isFlat).map((run) => ({
    file,
    line: run.line,
    rule: RULE.INTERPUNCT_RUN,
    message: `interpunct-joined inline list (${run.separators + 1} items); promote to a bullet list`,
  }));

const fix: Rule["fix"] = ({ doc, runs }) => {
  const { src } = doc;
  const edits: Edit[] = [];
  for (const view of paragraphsOf(doc, runs.filter(isFlat))) {
    const separators = splittableSeparators(src, view, RUN_SEPARATOR, GLYPH);
    const colons = colonsIn(src, view);
    if (separators === null || colons === null) continue;

    const span = sentenceSpan(src, view, first(separators)[0], last(separators)[1]);
    // The innermost colon before the first item, so a lead-in that itself
    // contains a colon keeps only its final clause.
    const colon = colonsBefore(colons, span, first(separators)[0]).pop();
    // With no colon to announce it, the run has to be the whole paragraph.
    if (!colon && (span[0] !== view.startOffset || span[1] !== view.endOffset)) continue;

    const cuts: Range[] = [colon ?? [span[0], span[0]], ...separators];
    const items = itemsBetween(src, cuts, span[1]);
    if (tailIsProse(items) || (!colon && headIsProse(items))) continue;

    const edit = promote({
      rule: RULE.INTERPUNCT_RUN,
      src,
      view,
      span,
      leadIn: colon ? cleanLeadIn(src.slice(span[0], colon[0])) : null,
      items: items.map((text) => ({ text })),
      ordered: false,
    });
    if (edit) edits.push(edit);
  }
  return edits;
};

export const pg006: Rule = {
  id: RULE.INTERPUNCT_RUN,
  category: "list",
  summary: "interpunct-joined inline list (2+ separators)",
  check,
  fix,
};
