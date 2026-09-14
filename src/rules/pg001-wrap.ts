// PG001: a newline inside a paragraph whose preceding non-space character
// does not end a sentence is a mid-sentence wrap. The fix reflows the
// paragraph to one sentence per line.

import { type DocModel, inRanges } from "../model.ts";
import { interpunctRuns } from "./interpunct.ts";
import { type Edit, type Finding, RULE, type Rule } from "./types.ts";

const TERMINALS = new Set([".", "!", "?", ":", ";"]);

const check: Rule["check"] = ({ doc, file }) => {
  const findings: Finding[] = [];
  for (const p of doc.paragraphs) {
    if (p.inTable) continue;
    for (let i = 0; i < p.raw.length; i++) {
      if (p.raw[i] !== "\n") continue;
      if (inRanges(p.startOffset + i, p.codeRanges)) continue;
      let j = i - 1;
      while (j >= 0 && (p.raw[j] === " " || p.raw[j] === "\t" || p.raw[j] === "\r" || p.raw[j] === "\\")) j--;
      if (j >= 0 && !TERMINALS.has(p.raw[j] as string)) {
        const line = p.line + p.raw.slice(0, i).split("\n").length - 1;
        findings.push({ file, line, rule: RULE.WRAP, message: "mid-sentence line wrap; write one sentence per line" });
      }
    }
  }
  return findings;
};

const fix = (doc: DocModel): Edit[] => {
  const edits: Edit[] = [];
  // Interpunct runs stacked on several lines are a nested list PG009 either
  // promotes or leaves for a human. Joining the lines would destroy the
  // structure and hand PG006 a flat run it would merge wrongly.
  const stacked = interpunctRuns(doc)
    .filter((r) => r.lines >= 2)
    .map((r) => r.range[0]);
  for (const p of doc.paragraphs) {
    // A hard break is structure the author chose, so the paragraph is left
    // exactly as written.
    if (p.inTable || p.inBlockquote || p.hasBreak || stacked.includes(p.startOffset)) continue;

    // Continuation lines keep the paragraph's own indent column, and the
    // paragraph's own line ending.
    const indent = " ".repeat(p.startColumn - 1);
    const eol = p.raw.includes("\r\n") ? "\r\n" : "\n";

    // Mask code spans character for character, keeping whitespace, so the
    // same join applies to both strings and offsets stay aligned. A terminal
    // inside a code span then never splits a sentence.
    const masked = [...p.raw]
      .map((ch, i) => (inRanges(p.startOffset + i, p.codeRanges) && !/\s/.test(ch) ? "x" : ch))
      .join("");
    const join = (s: string): string => s.replace(/[ \t]*\r?\n[ \t]*/g, " ");
    const joined = join(p.raw);
    const joinedMask = join(masked);

    const out: string[] = [];
    let last = 0;
    for (const m of joinedMask.matchAll(/[.!?]\s+(?=[A-Z`"'([])/g)) {
      const at = m.index ?? 0;
      out.push(joined.slice(last, at + 1));
      last = at + m[0].length;
    }
    out.push(joined.slice(last));
    const text = out.map((s, i) => (i === 0 ? s.trim() : indent + s.trim())).join(eol);
    if (text !== p.raw) {
      edits.push({ rule: RULE.WRAP, start: p.startOffset, end: p.endOffset, text, expect: { kind: "same-tree" } });
    }
  }
  return edits;
};

export const pg001: Rule = {
  id: RULE.WRAP,
  category: "sentence",
  summary: "mid-sentence line wrap (one sentence per line)",
  check,
  fix,
};
