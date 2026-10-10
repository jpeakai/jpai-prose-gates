// What the tell rules share: which text they may read, how a finding is written as an instruction, and a
// factory for the rules that look a lexicon up in prose. A tell rule only ever reports. It never edits,
// because a phrase that signals more than it states cannot be mended without choosing new words
// (PRS-0004, PRS-0032).

import type { Node } from "mdast";
import { type Lexicon, scan } from "./lexicon.ts";
import type { DocModel, ParagraphView, TextView } from "./model.ts";
import type { Finding, Rule, RuleId, Severity } from "./rules/types.ts";

// Running prose outside tables and quoted text. A quotation shows a phrase and does not use it, so a
// document about stock phrases can quote them without tripping its own rule.
export const tellParagraphs = (doc: DocModel): ParagraphView[] =>
  doc.paragraphs.filter((view) => !view.inTable && !view.inBlockquote);

// Every prose text node, headings and list items included, except those inside quoted text.
export const tellTexts = (doc: DocModel): TextView[] => {
  const quoted = new Set<unknown>(doc.paragraphs.filter((view) => view.inBlockquote).map((view) => view.node));
  return doc.texts.filter((text) => text.block === undefined || !quoted.has(text.block));
};

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The file line where `evidence` starts inside a paragraph's own source. A paragraph that wraps over
// several lines keeps its matches apart this way. If the source and the prose disagree (an entity, a
// link), the paragraph's first line stands in.
export const lineWithin = (view: ParagraphView, evidence: string): number => {
  const words = evidence.trim().split(/\s+/).map(escapeRegex);
  const at = new RegExp(words.join("\\s+"), "i").exec(view.raw);
  return at ? view.line + (view.raw.slice(0, at.index).match(/\n/g)?.length ?? 0) : view.line;
};

export interface Tell {
  // What was found, as a short noun phrase.
  what: string;
  // The exact text it is about, kept short.
  evidence: string;
  // What to do about it, in the imperative.
  instruction: string;
  // What a rewrite must keep.
  preserve?: string;
}

const CLIP = 80;

const clip = (text: string): string => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= CLIP ? flat : `${flat.slice(0, CLIP - 1).trimEnd()}…`;
};

export const KEEP_FACTS = "Every fact, name, number and link. Add none.";

// A finding that reads as a prompt. The message is the one line a person or an agent sees, and the
// same parts travel in the JSON for a tool that wants them apart (PRS-0031).
export const tellFinding = (rule: RuleId, file: string, line: number, tell: Tell): Finding => {
  const evidence = clip(tell.evidence);
  return {
    file,
    line,
    rule,
    message: `${tell.what}: "${evidence}". ${tell.instruction}`,
    evidence,
    instruction: tell.instruction,
    preserve: tell.preserve ?? KEEP_FACTS,
  };
};

export interface LexiconRuleSpec {
  id: RuleId;
  category: string;
  summary: string;
  defaultSeverity?: Severity;
  lexicon: Lexicon;
  what: string;
  instruction: string;
  preserve?: string;
  // Whole paragraphs of prose, or every text node. A punctuation rule reads text nodes, because a stray
  // glyph is wrong in a heading as well.
  scope?: "paragraphs" | "texts";
}

export const lexiconRule = (spec: LexiconRuleSpec): Rule => ({
  id: spec.id,
  category: spec.category,
  summary: spec.summary,
  ...(spec.defaultSeverity ? { defaultSeverity: spec.defaultSeverity } : {}),
  check: ({ doc, file }) => {
    const tellOf = (text: string, entry: { label?: string; instruction?: string }): Tell => ({
      what: entry.label ?? spec.what,
      evidence: text,
      instruction: entry.instruction ?? spec.instruction,
      ...(spec.preserve ? { preserve: spec.preserve } : {}),
    });
    if (spec.scope === "texts") {
      return tellTexts(doc).flatMap((text) =>
        scan(spec.lexicon, text.value).map(({ entry, text: found, index }) =>
          tellFinding(
            spec.id,
            file,
            text.line + (text.value.slice(0, index).match(/\n/g)?.length ?? 0),
            tellOf(found, entry),
          ),
        ),
      );
    }
    return tellParagraphs(doc).flatMap((view) =>
      scan(spec.lexicon, view.prose).map(({ entry, text: found }) =>
        tellFinding(spec.id, file, lineWithin(view, found), tellOf(found, entry)),
      ),
    );
  },
});

// The words of a node as a reader sees them: text and, unless told otherwise, inline code, in order,
// with markup stripped.
export const textOf = (node: Node, withCode = true): string => {
  const n = node as Node & { value?: string; children?: Node[] };
  if (n.type === "text" || (withCode && n.type === "inlineCode")) return n.value ?? "";
  return (n.children ?? []).map((child) => textOf(child, withCode)).join("");
};

// Whether any ancestor is a quotation, which shows a form and does not use it.
export const quoted = (ancestors: readonly Node[]): boolean => ancestors.some((a) => a.type === "blockquote");
