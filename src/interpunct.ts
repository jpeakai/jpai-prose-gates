// The interpunct run: the one piece of data derived from a whole document
// that more than one rule reads. PG006 and PG009 report a run, PG005 stays
// quiet inside one, and PG001 leaves a stacked one unreflowed, so it is
// derived once per document and handed to every rule as data.

import type { DocModel, ParagraphView } from "./model.ts";
import { proseParagraphs } from "./query.ts";
import { countOf, type Range } from "./text.ts";

export const INTERPUNCT = "·";

// The glyph on its own, for counting, and the glyph with the space a run
// puts around it, for splitting. PG006 and PG009 both cut on the separator;
// PG005 is stricter and needs space on both sides, so it keeps its own.
export const GLYPH = /·/g;
export const RUN_SEPARATOR = /[ \t]*·[ \t]*/;

// A paragraph whose prose joins a run of items with 2+ interpunct separators.
export interface InterpunctRun {
  range: Range;
  line: number;
  separators: number;
  lines: number; // source lines of the paragraph that carry a separator
}

export const interpunctRuns = (doc: DocModel): InterpunctRun[] => {
  const runs: InterpunctRun[] = [];
  for (const view of proseParagraphs(doc)) {
    const separators = countOf(view.prose, GLYPH);
    if (separators < 2) continue;
    const lines = view.raw.split("\n").filter((line) => line.includes(INTERPUNCT)).length;
    runs.push({ range: [view.startOffset, view.endOffset], line: view.line, separators, lines });
  }
  return runs;
};

// A run on one source line is a flat list, which PG006 owns. A run spread
// over two or more lines is a two-level structure, which PG009 owns and
// PG001 leaves unreflowed. The two predicates partition every run.
export const isFlat = (run: InterpunctRun): boolean => run.lines === 1;

export const isStacked = (run: InterpunctRun): boolean => run.lines >= 2;

// The paragraphs those runs were derived from. A run is keyed by the
// paragraph it spans, so this is how a rule gets from the runs it was handed
// back to the views its fixer needs.
export const paragraphsOf = (doc: DocModel, runs: InterpunctRun[]): ParagraphView[] =>
  doc.paragraphs.filter((view) => runs.some((run) => run.range[0] === view.startOffset));
