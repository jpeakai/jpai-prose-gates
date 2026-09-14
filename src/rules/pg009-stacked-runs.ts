// PG009: interpunct runs stacked on 2+ source lines of one paragraph are a
// two-level structure, so PG009 replaces PG006 for that paragraph. The fix
// needs every line to read `Label: a · b · c`, and builds one parent bullet
// per label with the items nested beneath it.

import { cleanItem, type PromotedItem, promote } from "../fix/promote.ts";
import { collapse, escaped, matchesInAll, within } from "../fix/spans.ts";
import type { DocModel, Range } from "../model.ts";
import { interpunctRuns } from "./interpunct.ts";
import { type Edit, RULE, type Rule } from "./types.ts";

const fix = (doc: DocModel): Edit[] => {
  const { src } = doc;
  const edits: Edit[] = [];
  const runs = interpunctRuns(doc).filter((r) => r.lines >= 2);
  for (const view of doc.paragraphs) {
    if (!runs.some((r) => r.range[0] === view.startOffset)) continue;
    const seps = matchesInAll(src, view.directTexts, /[ \t]*·[ \t]*/);
    const colons = matchesInAll(src, view.directTexts, /:/);
    if (
      seps === null ||
      colons === null ||
      seps.length !== (view.prose.match(/·/g) ?? []).length ||
      seps.some(([s]) => escaped(src, s))
    )
      continue;

    // Source lines of the paragraph, as absolute ranges.
    const lines: Range[] = [];
    let at = view.startOffset;
    for (const line of view.raw.split("\n")) {
      lines.push([at, at + line.length]);
      at += line.length + 1;
    }

    const parents: PromotedItem[] = [];
    for (const line of lines) {
      const lineSeps = seps.filter((s) => within(s, line));
      const colon = colons.find((c) => within(c, line));
      if (lineSeps.length === 0 || !colon || colon[1] > (lineSeps[0] as Range)[0]) break;
      const label = collapse(src.slice(line[0], colon[0])).trim();
      const cuts: Range[] = [colon, ...lineSeps];
      const children = cuts.map((cut, i) => {
        const end = i + 1 < cuts.length ? (cuts[i + 1] as Range)[0] : line[1];
        return cleanItem(src.slice(cut[1], end), { last: i + 1 === cuts.length });
      });
      parents.push({ text: label, children });
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
  check: ({ file, runs }) =>
    runs
      .filter((r) => r.lines >= 2)
      .map((r) => ({
        file,
        line: r.line,
        rule: RULE.STACKED_RUNS,
        message: `interpunct runs stacked on ${r.lines} lines; promote to a nested list`,
      })),
  fix,
};
