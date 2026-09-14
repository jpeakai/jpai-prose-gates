// Source-offset helpers shared by fixers. Everything here works on absolute
// offsets into the document source, and only ever looks inside text the
// parser proved is prose.

import type { DirectText, ParagraphView, Range } from "../model.ts";

// Absolute offsets of every match of `pattern` inside a text node, or null
// when the source slice and the parsed value disagree (an entity like
// `&middot;` or an escape). A fixer that cannot map a glyph back to the
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

export const within = (r: Range, span: Range): boolean => r[0] >= span[0] && r[1] <= span[1];

// Soft line breaks collapse to single spaces; nothing else in the slice moves.
export const collapse = (s: string): string => s.replace(/[ \t]*\r?\n[ \t]*/g, " ");

// A glyph the author escaped is literal text, never a separator to rewrite.
export const escaped = (src: string, offset: number): boolean => src[offset - 1] === "\\";
