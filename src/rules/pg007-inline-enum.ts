// PG007: parenthesised enumerators inlined in one paragraph are a hidden
// list. Requiring the first two members of a family keeps citations and a
// lone "(a)" reference from firing. The fix only trusts a clean sequence:
// every marker in order, none skipped, none from another family.

import { cleanItem, cleanLeadIn, promote } from "../fix/promote.ts";
import { sentenceSpan } from "../fix/spans.ts";
import type { DocModel, Range } from "../model.ts";
import { type Edit, type Finding, RULE, type Rule } from "./types.ts";

const ENUM_FAMILIES: Array<[string, string]> = [
  ["(a)", "(b)"],
  ["(1)", "(2)"],
  ["(i)", "(ii)"],
];

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];
const LETTERS = [..."abcdefghijklmnopqrstuvwxyz"];

// The expected nth marker for the family the first marker opens.
const sequenceFor = (first: string): string[] | null => {
  if (first === "a") return LETTERS;
  if (first === "1") return Array.from({ length: 99 }, (_, i) => String(i + 1));
  if (first === "i") return ROMAN;
  return null;
};

const MARKER = /\(([a-z]|[ivx]+|\d{1,2})\)(?=\s)/g;

interface Marker {
  range: Range;
  label: string;
}

// Markers that open an item: preceded by whitespace or the start of a direct
// text node, and followed by whitespace. The parsed value must agree with the
// source, or an escape is hiding somewhere and the fixer refuses.
const markersIn = (src: string, texts: DocModel["paragraphs"][number]["directTexts"]): Marker[] | null => {
  const out: Marker[] = [];
  for (const t of texts) {
    const slice = src.slice(t.start, t.end);
    const opening = (s: string): RegExpMatchArray[] =>
      [...s.matchAll(MARKER)].filter((m) => (m.index ?? 0) === 0 || /\s/.test(s[(m.index ?? 0) - 1] as string));
    const inSlice = opening(slice);
    if (inSlice.length !== opening(t.value).length) return null;
    for (const m of inSlice) {
      const start = t.start + (m.index ?? 0);
      out.push({ range: [start, start + m[0].length], label: m[1] as string });
    }
  }
  return out;
};

const fix = (doc: DocModel): Edit[] => {
  const { src } = doc;
  const edits: Edit[] = [];
  for (const view of doc.paragraphs) {
    const markers = markersIn(src, view.directTexts);
    if (markers === null || markers.length < 2) continue;
    const sequence = sequenceFor((markers[0] as Marker).label);
    if (sequence === null || markers.some((m, i) => m.label !== sequence[i])) continue;

    const first = markers[0] as Marker;
    const last = markers[markers.length - 1] as Marker;
    // Markers split across sentences are two references, not one list.
    const between = view.directTexts.map((t) =>
      src.slice(Math.max(t.start, first.range[1]), Math.min(t.end, last.range[0])),
    );
    if (between.some((s) => /[.!?]\s/.test(s))) continue;
    const span = sentenceSpan(src, view, first.range[0], last.range[1]);
    // Two markers joined only by a conjunction, with no colon to announce
    // them, read as cross-references ("see (a) above and (b) below").
    const announced = /:\s*$/.test(src.slice(span[0], first.range[0]));
    const separated = /[,;]\s*$/.test(src.slice((markers[0] as Marker).range[1], (markers[1] as Marker).range[0]));
    if (markers.length === 2 && !announced && !separated) continue;
    const items = markers.map((m, i) => {
      const end = i + 1 < markers.length ? (markers[i + 1] as Marker).range[0] : span[1];
      return { text: cleanItem(src.slice(m.range[1], end), { last: i + 1 === markers.length }) };
    });
    const edit = promote({
      rule: RULE.INLINE_ENUM,
      src,
      view,
      span,
      leadIn: cleanLeadIn(src.slice(span[0], first.range[0])),
      items,
      ordered: true,
    });
    if (edit) edits.push(edit);
  }
  return edits;
};

const check: Rule["check"] = ({ doc, file }) => {
  const findings: Finding[] = [];
  for (const p of doc.paragraphs) {
    if (p.inTable) continue;
    for (const [first, second] of ENUM_FAMILIES) {
      if (p.prose.includes(first) && p.prose.includes(second)) {
        findings.push({
          file,
          line: p.line,
          rule: RULE.INLINE_ENUM,
          message: `enumeration ${first} ${second} ... inlined in prose; promote to a bullet list`,
        });
        break;
      }
    }
  }
  return findings;
};

export const pg007: Rule = {
  id: RULE.INLINE_ENUM,
  category: "list",
  summary: "enumeration markers (a)/(b) or (1)/(2) inlined in prose",
  check,
  fix,
};
