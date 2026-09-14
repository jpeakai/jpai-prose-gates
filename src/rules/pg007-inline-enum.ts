// PG007: parenthesised enumerators inlined in one paragraph are a hidden
// list. Requiring the first two members of a family keeps citations and a
// lone "(a)" reference from firing. The fix only trusts a clean sequence:
// every marker in order, none skipped, none from another family.

import { first, last } from "../fix/ends.ts";
import { cleanLeadIn, itemsBetween, promote } from "../fix/promote.ts";
import { sentenceSpan } from "../fix/spans.ts";
import type { DirectText, Range } from "../model.ts";
import { type Edit, type Finding, RULE, type Rule } from "./types.ts";

const ENUM_FAMILIES: Array<[string, string]> = [
  ["(a)", "(b)"],
  ["(1)", "(2)"],
  ["(i)", "(ii)"],
];

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];
const LETTERS = [..."abcdefghijklmnopqrstuvwxyz"];

// The expected nth marker for the family the first marker opens.
const sequenceFor = (label: string): string[] | null => {
  if (label === "a") return LETTERS;
  if (label === "1") return Array.from({ length: 99 }, (_, i) => String(i + 1));
  if (label === "i") return ROMAN;
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
const markersIn = (src: string, texts: DirectText[]): Marker[] | null => {
  const opening = (s: string): RegExpMatchArray[] =>
    [...s.matchAll(MARKER)].filter((m) => (m.index ?? 0) === 0 || /\s/.test(s.charAt((m.index ?? 0) - 1)));

  const markers: Marker[] = [];
  for (const text of texts) {
    const inSlice = opening(src.slice(text.start, text.end));
    if (inSlice.length !== opening(text.value).length) return null;
    for (const match of inSlice) {
      const start = text.start + (match.index ?? 0);
      markers.push({ range: [start, start + match[0].length], label: match[1] ?? "" });
    }
  }
  return markers;
};

const check: Rule["check"] = ({ doc, file }) => {
  const findings: Finding[] = [];
  for (const view of doc.paragraphs) {
    if (view.inTable) continue;
    for (const [opener, second] of ENUM_FAMILIES) {
      if (!view.prose.includes(opener) || !view.prose.includes(second)) continue;
      findings.push({
        file,
        line: view.line,
        rule: RULE.INLINE_ENUM,
        message: `enumeration ${opener} ${second} ... inlined in prose; promote to a bullet list`,
      });
      break; // one family per paragraph is enough to report it
    }
  }
  return findings;
};

const fix: Rule["fix"] = ({ doc }) => {
  const { src } = doc;
  const edits: Edit[] = [];
  for (const view of doc.paragraphs) {
    const markers = markersIn(src, view.directTexts);
    if (markers === null || markers.length < 2) continue;
    const sequence = sequenceFor(first(markers).label);
    if (sequence === null || markers.some((marker, i) => marker.label !== sequence[i])) continue;

    const opener = first(markers);
    const closer = last(markers);
    // Markers split across sentences are two references, not one list.
    const between = view.directTexts.map((text) =>
      src.slice(Math.max(text.start, opener.range[1]), Math.min(text.end, closer.range[0])),
    );
    if (between.some((slice) => /[.!?]\s/.test(slice))) continue;

    const span = sentenceSpan(src, view, opener.range[0], closer.range[1]);
    // Two markers joined only by a conjunction, with no colon to announce
    // them, read as cross-references ("see (a) above and (b) below").
    const announced = /:\s*$/.test(src.slice(span[0], opener.range[0]));
    const separated = /[,;]\s*$/.test(src.slice(opener.range[1], first(markers.slice(1)).range[0]));
    if (markers.length === 2 && !announced && !separated) continue;

    const edit = promote({
      rule: RULE.INLINE_ENUM,
      src,
      view,
      span,
      leadIn: cleanLeadIn(src.slice(span[0], opener.range[0])),
      items: itemsBetween(
        src,
        markers.map((marker) => marker.range),
        span[1],
      ).map((text) => ({ text })),
      ordered: true,
    });
    if (edit) edits.push(edit);
  }
  return edits;
};

export const pg007: Rule = {
  id: RULE.INLINE_ENUM,
  category: "list",
  summary: "enumeration markers (a)/(b) or (1)/(2) inlined in prose",
  check,
  fix,
};
