// list-inline-enumeration-markers: parenthesised enumerators inlined in one paragraph are a hidden
// list. Requiring the first two members of a family keeps citations and a
// lone "(a)" reference from firing. The fix only trusts a clean sequence:
// every marker in order, none skipped, none from another family.

import { cleanLeadIn, itemsBetween, promote } from "../fix/promote.ts";
import type { DirectText, ParagraphView } from "../model.ts";
import { proseParagraphs, sentenceSpan } from "../query.ts";
import { first, last, type Range } from "../text.ts";
import { type Edit, RULE, type Rule } from "./types.ts";

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

// The first family whose opening two markers both appear, or undefined. One
// family per paragraph is enough to report it.
const familyIn = (prose: string): [string, string] | undefined =>
  ENUM_FAMILIES.find(([opener, second]) => prose.includes(opener) && prose.includes(second));

const check: Rule["check"] = ({ doc, file }) =>
  proseParagraphs(doc).flatMap((view) => {
    const family = familyIn(view.prose);
    if (!family) return [];
    const [opener, second] = family;
    return [
      {
        file,
        line: view.line,
        rule: RULE.INLINE_ENUM,
        message: `enumeration ${opener} ${second} ... inlined in prose; promote to a bullet list`,
      },
    ];
  });

// The paragraph's markers when they form a clean sequence: at least two, every
// one in order from the family the first opens, none skipped. Otherwise null.
const cleanSequence = (src: string, view: ParagraphView): Marker[] | null => {
  const markers = markersIn(src, view.directTexts);
  if (markers === null || markers.length < 2) return null;
  const sequence = sequenceFor(first(markers).label);
  if (sequence === null || markers.some((marker, i) => marker.label !== sequence[i])) return null;
  return markers;
};

// Markers split across sentences are two references, not one list.
const splitAcrossSentences = (src: string, view: ParagraphView, opener: Marker, closer: Marker): boolean =>
  view.directTexts
    .map((text) => src.slice(Math.max(text.start, opener.range[1]), Math.min(text.end, closer.range[0])))
    .some((slice) => /[.!?]\s/.test(slice));

// Two markers joined only by a conjunction, with no colon to announce
// them, read as cross-references ("see (a) above and (b) below"). With
// exactly two markers the closer is also the second, so the text between
// them is the whole of the first item.
const crossReference = (src: string, span: Range, markers: Marker[]): boolean => {
  if (markers.length !== 2) return false;
  const opener = first(markers);
  const closer = last(markers);
  const announced = /:\s*$/.test(src.slice(span[0], opener.range[0]));
  const separated = /[,;]\s*$/.test(src.slice(opener.range[1], closer.range[0]));
  return !announced && !separated;
};

const fixParagraph = (src: string, view: ParagraphView): Edit | null => {
  const markers = cleanSequence(src, view);
  if (markers === null) return null;
  const opener = first(markers);
  const closer = last(markers);
  if (splitAcrossSentences(src, view, opener, closer)) return null;

  const span = sentenceSpan(src, view, opener.range[0], closer.range[1]);
  if (crossReference(src, span, markers)) return null;

  return promote({
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
};

const fix: Rule["fix"] = ({ doc }) =>
  doc.paragraphs.map((view) => fixParagraph(doc.src, view)).filter((edit): edit is Edit => edit !== null);

export const listInlineEnumerationMarkers: Rule = {
  id: RULE.INLINE_ENUM,
  category: "list",
  summary: "enumeration markers (a)/(b) or (1)/(2) inlined in prose",
  check,
  fix,
};
