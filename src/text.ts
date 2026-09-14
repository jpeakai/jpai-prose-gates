// Text and range arithmetic that knows nothing about markdown. Everything
// here is a pure function of its arguments, so it is the one layer that can
// be read without the document model in mind.

// A half-open span of absolute offsets into a source string. Every range in
// this package is [start, end), and is only valid for the source it was
// computed from.
export type Range = [number, number];

// The ends of a list the caller has already proved non-empty. Written once
// here so `noUncheckedIndexedAccess` costs the package two casts rather than
// one per rule.
export const first = <T>(xs: readonly T[]): T => xs[0] as T;

export const last = <T>(xs: readonly T[]): T => xs[xs.length - 1] as T;

export const within = (r: Range, span: Range): boolean => r[0] >= span[0] && r[1] <= span[1];

// Soft line breaks collapse to single spaces; nothing else in the slice moves.
export const collapse = (s: string): string => s.replace(/[ \t]*\r?\n[ \t]*/g, " ");

// How many times a pattern matches. The pattern must be global: matchAll
// throws otherwise, which is the loud failure we want over a silent count
// of one.
export const countOf = (text: string, pattern: RegExp): number => [...text.matchAll(pattern)].length;

// The spans a run of cut points carves out of a sentence. Each span runs from
// the end of its own cut to the start of the next one, and the last runs to
// `end`. Every hidden-list fixer needs exactly this, so the fencepost is
// written once here rather than once per rule.
export const spansBetween = (cuts: Range[], end: number): Range[] =>
  cuts.map((cut, i) => {
    const next = cuts[i + 1];
    return [cut[1], next ? next[0] : end];
  });

// Words of a sentence or an item, counted the one way for every rule.
export const words = (text: string): number => text.split(/\s+/).filter(Boolean).length;

// Whether an offset falls inside any of the ranges.
export const inRanges = (offset: number, ranges: Range[]): boolean =>
  ranges.some(([a, b]) => offset >= a && offset < b);

// Prose split on terminals. A check reads sentences this way; a fixer needs
// the source offsets instead and asks `sentenceSpans` for them.
export const sentences = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
