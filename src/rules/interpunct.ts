// Paragraphs whose prose joins a run of items with 2+ interpunct separators.
// PG006 and PG009 report the run, and PG005 stays quiet inside one, so the
// runs are computed once and passed to every rule as data.

import type { DocModel } from "../model.ts";
import type { InterpunctRun } from "./types.ts";

export const interpunctRuns = (doc: DocModel): InterpunctRun[] => {
  const runs: InterpunctRun[] = [];
  for (const view of doc.paragraphs) {
    if (view.inTable) continue;
    const separators = (view.prose.match(/·/g) ?? []).length;
    if (separators < 2) continue;
    const lines = view.raw.split("\n").filter((line) => line.includes("·")).length;
    runs.push({ range: [view.startOffset, view.endOffset], line: view.line, separators, lines });
  }
  return runs;
};

// A run on one source line is a flat list, which PG006 owns. A run spread
// over two or more lines is a two-level structure, which PG009 owns and
// PG001 leaves unreflowed. The two predicates partition every run.
export const isFlat = (run: InterpunctRun): boolean => run.lines === 1;

export const isStacked = (run: InterpunctRun): boolean => run.lines >= 2;
