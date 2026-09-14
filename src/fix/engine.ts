// The fix engine: a fixpoint loop over splice edits. Each pass rebuilds the
// model, asks the fixers for edits in priority order, and keeps the first
// edit that survives verification. Offsets are only ever valid for the
// source they were computed from, so every accepted edit restarts the pass.

import { buildDocModel, parse } from "../model.ts";
import { FIX_ORDER, ruleContext } from "../rules/index.ts";
import type { Edit } from "../rules/types.ts";
import { verify } from "./verify.ts";

const MAX_PASSES = 10_000;

export interface FixReport {
  output: string;
  applied: Edit[];
  refused: Edit[];
}

const splice = (src: string, edits: Edit[]): string => {
  let out = src;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
};

const overlaps = (edits: Edit[]): boolean => {
  const sorted = [...edits].sort((a, b) => a.start - b.start);
  return sorted.some((e, i) => i > 0 && e.start < (sorted[i - 1] as Edit).end);
};

export const fixMarkdownReport = (src: string): FixReport => {
  const applied: Edit[] = [];
  const refused: Edit[] = [];
  // An edit refused once stays refused while its source slice is unchanged.
  const refusedKeys = new Set<string>();
  let current = src;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const ctx = ruleContext(buildDocModel(current));
    const before = { src: current, tree: ctx.doc.tree };
    const keyOf = (e: Edit): string => `${e.rule}\u0000${current.slice(e.start, e.end)}\u0000${e.text}`;

    const attempt = (edits: Edit[]): boolean => {
      const next = splice(current, edits);
      const afterTree = parse(next);
      if (edits.every((e) => verify(e, before, afterTree) === "accept")) {
        current = next;
        applied.push(...edits);
        return true;
      }
      return false;
    };

    let progressed = false;
    for (const rule of FIX_ORDER) {
      const edits = (rule.fix?.(ctx) ?? []).filter(
        (e) => current.slice(e.start, e.end) !== e.text && !refusedKeys.has(keyOf(e)),
      );
      if (edits.length === 0) continue;

      // Whitespace and glyph edits leave the tree's shape alone, so a rule's
      // whole batch can be proven in one re-parse. A batch that fails falls
      // back to one edit at a time, so one bad edit never blocks the rest.
      const batchable =
        edits.length > 1 && !overlaps(edits) && edits.every((e) => e.expect.kind !== "replace-paragraph");
      if (batchable && attempt(edits)) {
        progressed = true;
        break;
      }
      for (const edit of edits) {
        if (attempt([edit])) {
          progressed = true;
          break;
        }
        refusedKeys.add(keyOf(edit));
        refused.push(edit);
      }
      if (progressed) break;
    }
    if (!progressed) return { output: current, applied, refused };
  }
  throw new Error(`fix did not converge after ${MAX_PASSES} passes; a fixer keeps proposing edits`);
};

export const fixMarkdown = (src: string): string => fixMarkdownReport(src).output;
