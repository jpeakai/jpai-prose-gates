// The fix engine: a fixpoint loop over splice edits. Each pass rebuilds the
// model, asks the fixers for edits in priority order, and keeps the first
// edit that survives verification. Offsets are only ever valid for the
// source they were computed from, so every accepted edit restarts the pass.

import type { Root } from "mdast";
import { buildDocModel, parse } from "../model.ts";
import { BUILTIN, type Registry, ruleContext, TEXT_HELPERS } from "../rules/registry.ts";
import type { Edit, Rule, RuleContext } from "../rules/types.ts";
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

// Offsets are whole numbers inside the source, in order, and the replacement
// is text. Anything else is a malformed edit from a fixer that miscounted.
const wellFormed = (e: Edit, length: number): boolean =>
  Number.isInteger(e.start) &&
  Number.isInteger(e.end) &&
  e.start >= 0 &&
  e.start <= e.end &&
  e.end <= length &&
  typeof e.text === "string";

// What the loop carries between passes. An edit refused once stays refused
// while its source slice is unchanged, which `refusedKeys` remembers.
interface FixState {
  current: string;
  applied: Edit[];
  refused: Edit[];
  refusedKeys: Set<string>;
}

type Before = { src: string; tree: Root };

const keyOf = (state: FixState, e: Edit): string =>
  `${e.rule}\u0000${state.current.slice(e.start, e.end)}\u0000${e.text}`;

// Splice the edits, re-parse, and keep the result only if every edit is
// proven against the tree the pass started from.
const attempt = (state: FixState, edits: Edit[], before: Before): boolean => {
  const next = splice(state.current, edits);
  const afterTree = parse(next);
  if (!edits.every((e) => verify(e, before, afterTree) === "accept")) return false;
  state.current = next;
  state.applied.push(...edits);
  return true;
};

// An edit that points outside the source cannot be proven, so it is
// refused before it is ever spliced. A built-in never proposes one.
const keepWellFormed = (state: FixState, proposed: Edit[]): Edit[] =>
  proposed.filter((e) => {
    if (wellFormed(e, state.current.length)) return true;
    const key = `${e.rule}\u0000malformed\u0000${e.start}:${e.end}`;
    if (!state.refusedKeys.has(key)) {
      state.refusedKeys.add(key);
      state.refused.push(e);
    }
    return false;
  });

// The rule's edits that would change something and have not been refused.
const proposeEdits = async (state: FixState, rule: Rule, ctx: RuleContext, registry: Registry): Promise<Edit[]> => {
  const proposed =
    (await rule.fix?.({ ...ctx, options: registry.options.get(rule.id) ?? {}, helpers: TEXT_HELPERS })) ?? [];
  const sound = keepWellFormed(state, proposed);
  return sound.filter((e) => state.current.slice(e.start, e.end) !== e.text && !state.refusedKeys.has(keyOf(state, e)));
};

// Whitespace and glyph edits leave the tree's shape alone, so a rule's
// whole batch can be proven in one re-parse. A batch that fails falls
// back to one edit at a time, so one bad edit never blocks the rest.
const applyRuleEdits = (state: FixState, edits: Edit[], before: Before): boolean => {
  const batchable = edits.length > 1 && !overlaps(edits) && edits.every((e) => e.expect.kind !== "replace-paragraph");
  if (batchable && attempt(state, edits, before)) return true;
  for (const edit of edits) {
    if (attempt(state, [edit], before)) return true;
    state.refusedKeys.add(keyOf(state, edit));
    state.refused.push(edit);
  }
  return false;
};

// One pass: rules in fix order until one edit lands. True when it did.
const runPass = async (state: FixState, registry: Registry): Promise<boolean> => {
  const ctx = ruleContext(buildDocModel(state.current, registry.concepts), registry);
  const before = { src: state.current, tree: ctx.doc.tree };
  for (const rule of registry.fixOrder) {
    const edits = await proposeEdits(state, rule, ctx, registry);
    if (edits.length === 0) continue;
    if (applyRuleEdits(state, edits, before)) return true;
  }
  return false;
};

export const fixMarkdownReport = async (src: string, registry: Registry = BUILTIN): Promise<FixReport> => {
  const state: FixState = { current: src, applied: [], refused: [], refusedKeys: new Set<string>() };
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    if (!(await runPass(state, registry))) {
      return { output: state.current, applied: state.applied, refused: state.refused };
    }
  }
  throw new Error(`fix did not converge after ${MAX_PASSES} passes; a fixer keeps proposing edits`);
};

export const fixMarkdown = async (src: string, registry: Registry = BUILTIN): Promise<string> =>
  (await fixMarkdownReport(src, registry)).output;
