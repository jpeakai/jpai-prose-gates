// Paragraphs whose prose joins a run of items with 2+ interpunct separators.
// PG006 and PG009 report the run, and PG005 stays quiet inside one, so the
// runs are computed once and passed to every rule as data.

import type { DocModel, ParagraphView } from "../model.ts";
import type { InterpunctRun } from "./types.ts";
import { countOf, proseParagraphs } from "./utils.ts";

export const INTERPUNCT = "·";

// The glyph on its own, for counting, and the glyph with the space a run
// puts around it, for splitting. PG006 and PG009 both cut on the separator;
// PG005 is stricter and needs space on both sides, so it keeps its own.
export const GLYPH = /·/g;
export const RUN_SEPARATOR = /[ \t]*·[ \t]*/;

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
