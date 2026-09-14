// Read-only questions about one document. Everything here takes the model, or
// a view out of it, and answers where something is or what may be read; none
// of it builds an edit. Both halves of a rule ask the same questions here, so
// a check and its fix can never disagree about what the document holds.

import type { DirectText, DocModel, ParagraphView, TextView } from "./model.ts";
import { countOf, type Range, sentences, within } from "./text.ts";

// --- what a rule may read -------------------------------------------------

// Table cells are exempt by construction, so every rule that reads running
// prose starts here rather than filtering for itself.
export const proseParagraphs = (doc: DocModel): ParagraphView[] => doc.paragraphs.filter((view) => !view.inTable);

// One sentence with the paragraph it came from, so a finding can name the
// line without the rule tracking it through a nested loop.
export interface ProseSentence {
  view: ParagraphView;
  sentence: string;
}

export const proseSentences = (doc: DocModel): ProseSentence[] =>
  proseParagraphs(doc).flatMap((view) => sentences(view.prose).map((sentence) => ({ view, sentence })));

// The prose text nodes holding a glyph. This is how a punctuation rule finds
// what it reports, and it reads headings and list items as well as
// paragraphs, because a stray glyph is wrong wherever it sits.
export const textsContaining = (doc: DocModel, glyph: string): TextView[] =>
  doc.texts.filter((text) => text.value.includes(glyph));

// --- where something sits in the source -----------------------------------

// Absolute offsets of every match of `pattern` inside a text node, or null
// when the source slice and the parsed value disagree (an entity like
// `&middot;` or an escape). A rule that cannot map a glyph back to the
// source refuses rather than guesses.
export const matchesIn = (src: string, text: DirectText, pattern: RegExp): Range[] | null => {
  const slice = src.slice(text.start, text.end);
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const inSlice = [...slice.matchAll(new RegExp(pattern.source, flags))];
  const inValue = [...text.value.matchAll(new RegExp(pattern.source, flags))];
  if (inSlice.length !== inValue.length) return null;
  return inSlice.map((m) => [text.start + (m.index ?? 0), text.start + (m.index ?? 0) + m[0].length]);
};

export const matchesInAll = (src: string, texts: DirectText[], pattern: RegExp): Range[] | null => {
  const out: Range[] = [];
  for (const t of texts) {
    const found = matchesIn(src, t, pattern);
    if (found === null) return null;
    out.push(...found);
  }
  return out;
};

// A glyph the author escaped is literal text, never a separator to rewrite.
export const escaped = (src: string, offset: number): boolean => src[offset - 1] === "\\";

// Every separator in a paragraph that a fixer may split on, or null when one
// of them cannot be trusted. A separator is untrustworthy when the parsed
// value and the source slice disagree (an entity like `&middot;`), when the
// author escaped it, or when it sits inside a link or emphasis rather than
// direct text. Splitting on a subset would silently drop an item, so the
// fixer refuses instead.
export const splittableSeparators = (
  src: string,
  view: ParagraphView,
  separator: RegExp,
  glyph: RegExp,
): Range[] | null => {
  const found = matchesInAll(src, view.directTexts, separator);
  if (found === null) return null;
  if (found.length !== countOf(view.prose, glyph)) return null;
  if (found.some(([start]) => escaped(src, start))) return null;
  return found;
};

// --- sentences, as source offsets -----------------------------------------

// Sentence boundaries a fixer trusts: a terminal followed by whitespace,
// inside a direct text node. Terminals inside links, emphasis or code never
// split a sentence. Each boundary is [end of terminal, start of next sentence].
const boundaries = (src: string, view: ParagraphView): Range[] => {
  const out: Range[] = [];
  for (const t of view.directTexts) {
    const slice = src.slice(t.start, t.end);
    for (const m of slice.matchAll(/[.!?]+(\s+)/g)) {
      const at = t.start + (m.index ?? 0);
      out.push([at + m[0].length - (m[1]?.length ?? 0), at + m[0].length]);
    }
  }
  return out.sort((a, b) => a[0] - b[0]);
};

// The sentence span that covers [from, to): from the start of the sentence
// holding `from` to the end of the sentence holding `to`.
export const sentenceSpan = (src: string, view: ParagraphView, from: number, to: number): Range => {
  let start = view.startOffset;
  let end = view.endOffset;
  for (const [terminalEnd, nextStart] of boundaries(src, view)) {
    if (nextStart <= from) start = nextStart;
    if (terminalEnd >= to && end === view.endOffset) end = terminalEnd;
  }
  return [start, end];
};

// Every sentence span of a paragraph, in order.
export const sentenceSpans = (src: string, view: ParagraphView): Range[] => {
  const spans: Range[] = [];
  let start = view.startOffset;
  for (const [terminalEnd, nextStart] of boundaries(src, view)) {
    spans.push([start, terminalEnd]);
    start = nextStart;
  }
  spans.push([start, view.endOffset]);
  return spans;
};

// --- lead-ins -------------------------------------------------------------

// The colons of a paragraph as source ranges, or null when one of them
// cannot be trusted. Every rule that promotes a list needs these to find the
// lead-in that announces it.
export const colonsIn = (src: string, view: ParagraphView): Range[] | null => matchesInAll(src, view.directTexts, /:/);

// The colons that could announce a list: inside `range`, and closing before
// the first item starts. Which one a rule takes is the only thing the list
// rules disagree about, so they pick from this rather than each writing the
// filter again.
export const colonsBefore = (colons: Range[], range: Range, item: number): Range[] =>
  colons.filter((colon) => within(colon, range) && colon[1] <= item);
