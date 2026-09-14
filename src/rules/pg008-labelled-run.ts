// PG008: one sentence stringing 3+ comma-separated segments each led by a
// label (an inline-code span, or an identifier like PG001 / MD025 / S4)
// WITH content after it is a hidden list of labelled items. Bare labels
// ("A, B, and C are interchangeable") are a subject enumeration, not a
// list. An optional "Rules: " style intro on the first segment, and a
// joining "and"/"or", are tolerated.
//
// The check counts labelled segments; the fix is stricter and needs every
// segment of the sentence to be one, so no stray clause becomes a bullet.

import { cleanItem, cleanLeadIn, promote } from "../fix/promote.ts";
import { collapse, matchesInAll, sentenceSpans, within } from "../fix/spans.ts";
import { type DocModel, type ParagraphView, type Range, sentences } from "../model.ts";
import { type Edit, type Finding, RULE, type Rule } from "./types.ts";

const LABELLED_SEGMENT = /^(?:and\s+|or\s+)?(?:[A-Za-z][\w\s-]{0,24}:\s*)?(?:CODE|[A-Z][A-Za-z]*\d[\w/-]*)\s+\S/;

// A source slice as the check sees it: code spans become one CODE token.
const asProse = (src: string, view: ParagraphView, range: Range): string => {
  let out = "";
  let at = range[0];
  for (const [a, b] of view.codeRanges) {
    if (b <= range[0] || a >= range[1]) continue;
    out += `${src.slice(at, a)}CODE`;
    at = b;
  }
  return collapse(out + src.slice(at, range[1])).trim();
};

const fix = (doc: DocModel): Edit[] => {
  const { src } = doc;
  const edits: Edit[] = [];
  for (const view of doc.paragraphs) {
    const commas = matchesInAll(src, view.directTexts, /,(?=\s)/);
    const colons = matchesInAll(src, view.directTexts, /:/);
    if (commas === null || colons === null) continue;
    for (const span of sentenceSpans(src, view)) {
      const inside = commas.filter((r) => within(r, span));
      if (inside.length < 2) continue;
      const bounds: Range[] = inside.map((c, i) => [i === 0 ? span[0] : (inside[i - 1] as Range)[1], c[0]]);
      bounds.push([(inside[inside.length - 1] as Range)[1], span[1]]);
      if (!bounds.every((b) => LABELLED_SEGMENT.test(asProse(src, view, b)))) continue;

      // An intro colon in the first segment, before its label, is the lead-in.
      const firstBound = bounds[0] as Range;
      const colon = colons.find((c) => within(c, firstBound));
      const intro = colon && /^[A-Za-z][\w\s-]{0,24}$/.test(collapse(src.slice(span[0], colon[0])).trim());
      if (intro && colon) firstBound[0] = colon[1];

      const items = bounds.map((b, i) => ({
        text: cleanItem(src.slice(b[0], b[1]), { last: i + 1 === bounds.length }),
      }));
      const edit = promote({
        rule: RULE.LABELLED_RUN,
        src,
        view,
        span,
        leadIn: intro && colon ? cleanLeadIn(src.slice(span[0], colon[0])) : null,
        items,
        ordered: false,
      });
      if (edit) edits.push(edit);
      break;
    }
  }
  return edits;
};

const check: Rule["check"] = ({ doc, file }) => {
  const findings: Finding[] = [];
  for (const p of doc.paragraphs) {
    if (p.inTable) continue;
    for (const s of sentences(p.prose)) {
      const labelled = s.split(/,\s+/).filter((seg) => LABELLED_SEGMENT.test(seg)).length;
      if (labelled >= 3) {
        findings.push({
          file,
          line: p.line,
          rule: RULE.LABELLED_RUN,
          message: `comma-joined run of ${labelled} labelled items; promote to a bullet list`,
        });
      }
    }
  }
  return findings;
};

export const pg008: Rule = {
  id: RULE.LABELLED_RUN,
  category: "list",
  summary: "comma-joined labelled run (3+ labelled segments)",
  check,
  fix,
};
