// Paragraphs whose prose joins a run of items with 2+ interpunct separators.
// PG006 and PG009 report the run, and PG005 stays quiet inside one, so the
// runs are computed once and passed to every check as data.

import type { DocModel } from "../model.ts";
import type { InterpunctRun } from "./types.ts";

export const interpunctRuns = (doc: DocModel): InterpunctRun[] => {
  const runs: InterpunctRun[] = [];
  for (const p of doc.paragraphs) {
    if (p.inTable) continue;
    const separators = (p.prose.match(/·/g) ?? []).length;
    if (separators >= 2) {
      const lines = p.raw.split("\n").filter((l) => l.includes("·")).length;
      runs.push({ range: [p.startOffset, p.endOffset], line: p.line, separators, lines });
    }
  }
  return runs;
};
