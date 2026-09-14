// PG006: a single-line interpunct-joined run is a disguised flat list. The
// fix promotes it to bullets, taking a colon before the run as the lead-in.
// Without a colon the run must be the whole paragraph, or there is no way to
// tell where the first item starts.

import { cleanItem, cleanLeadIn, promote } from "../fix/promote.ts";
import { escaped, matchesInAll, sentenceSpan, within } from "../fix/spans.ts";
import type { DocModel, Range } from "../model.ts";
import { interpunctRuns } from "./interpunct.ts";
import { type Edit, RULE, type Rule } from "./types.ts";

// A last item this much longer than every other is a sentence that happens
// to follow the list, not a member of it. Without a colon, a first item
// longer than the rest ("Built with Bun") carries a clause the list would
// strip of its meaning.
const words = (s: string): number => s.split(/\s+/).filter(Boolean).length;
const tailIsProse = (items: string[]): boolean => {
  const last = words(items[items.length - 1] ?? "");
  const others = Math.max(...items.slice(0, -1).map(words));
  return last > Math.max(8, 3 * others);
};
const headIsProse = (items: string[]): boolean => {
  const first = words(items[0] ?? "");
  return first > Math.max(...items.slice(1).map(words));
};

const fix = (doc: DocModel): Edit[] => {
  const { src } = doc;
  const edits: Edit[] = [];
  const runs = interpunctRuns(doc).filter((r) => r.lines === 1);
  for (const view of doc.paragraphs) {
    if (!runs.some((r) => r.range[0] === view.startOffset)) continue;
    const seps = matchesInAll(src, view.directTexts, /[ \t]*·[ \t]*/);
    const colons = matchesInAll(src, view.directTexts, /:/);
    // Every separator the check counted must be one a fixer can split on.
    if (
      seps === null ||
      colons === null ||
      seps.length !== (view.prose.match(/·/g) ?? []).length ||
      seps.some(([s]) => escaped(src, s))
    )
      continue;
    const first = seps[0] as Range;
    const last = seps[seps.length - 1] as Range;
    const span = sentenceSpan(src, view, first[0], last[1]);
    const colon = colons.filter((c) => within(c, span) && c[1] <= first[0]).pop();
    if (!colon && (span[0] !== view.startOffset || span[1] !== view.endOffset)) continue;

    const cuts: Range[] = [colon ?? [span[0], span[0]], ...seps];
    const items = cuts.map((cut, i) => {
      const end = i + 1 < cuts.length ? (cuts[i + 1] as Range)[0] : span[1];
      return cleanItem(src.slice(cut[1], end), { last: i + 1 === cuts.length });
    });
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
  check: ({ file, runs }) =>
    runs
      .filter((r) => r.lines < 2)
      .map((r) => ({
        file,
        line: r.line,
        rule: RULE.INTERPUNCT_RUN,
        message: `interpunct-joined inline list (${r.separators + 1} items); promote to a bullet list`,
      })),
  fix,
};
