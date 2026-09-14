// PG003: a run of items joined by semicolons is a wall of text hiding a
// list. The fix needs a colon lead-in to know where the list starts, and
// refuses without one.

import { cleanItem, cleanLeadIn, promote } from "../fix/promote.ts";
import { matchesInAll, sentenceSpans, within } from "../fix/spans.ts";
import { type DocModel, sentences } from "../model.ts";
import { type Edit, type Finding, RULE, type Rule } from "./types.ts";

const check: Rule["check"] = ({ doc, file }) => {
  const findings: Finding[] = [];
  for (const p of doc.paragraphs) {
    if (p.inTable) continue;
    for (const s of sentences(p.prose)) {
      const semis = (s.match(/;/g) ?? []).length;
      if (semis >= 2) {
        findings.push({
          file,
          line: p.line,
          rule: RULE.SEMICOLON_LIST,
          message: `semicolon-delimited list (${semis} ';'); promote to a bullet list`,
        });
      }
    }
  }
  return findings;
};

const fix = (doc: DocModel): Edit[] => {
  const edits: Edit[] = [];
  const { src } = doc;
  for (const view of doc.paragraphs) {
    const semis = matchesInAll(src, view.directTexts, /;/);
    const colons = matchesInAll(src, view.directTexts, /:/);
    if (semis === null || colons === null) continue;
    for (const span of sentenceSpans(src, view)) {
      const inside = semis.filter((r) => within(r, span));
      if (inside.length < 2) continue;
      const colon = colons.find((r) => within(r, span) && r[1] <= (inside[0] as [number, number])[0]);
      if (!colon) continue;
      const cuts = [colon, ...inside];
      const items = cuts.map((cut, i) => {
        const end = i + 1 < cuts.length ? (cuts[i + 1] as [number, number])[0] : span[1];
        return { text: cleanItem(src.slice(cut[1], end), { last: i + 1 === cuts.length }) };
      });
      const edit = promote({
        rule: RULE.SEMICOLON_LIST,
        src,
        view,
        span,
        leadIn: cleanLeadIn(src.slice(span[0], colon[0])),
        items,
        ordered: false,
      });
      if (edit) edits.push(edit);
      break; // one promotion per paragraph; the engine re-parses and comes back
    }
  }
  return edits;
};

export const pg003: Rule = {
  id: RULE.SEMICOLON_LIST,
  category: "list",
  summary: "semicolon-delimited list (2+ ';' in one sentence)",
  check,
  fix,
};
