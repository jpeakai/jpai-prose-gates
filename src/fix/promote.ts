// List promotion: the shared fix for every "hidden list" rule. A sentence
// that strings items together inline becomes a lead-in line and a real
// markdown list. Item text is sliced from the source, never re-serialised,
// so links, emphasis, escapes and code spans travel unchanged.

import type { ParagraphView } from "../model.ts";
import type { Edit, RuleId } from "../rules/types.ts";
import { collapse, type Range, spansBetween } from "../text.ts";

export interface PromotedItem {
  text: string;
  children?: string[];
}

export interface Promotion {
  rule: RuleId;
  src: string;
  view: ParagraphView;
  span: Range; // the sentences the list replaces
  leadIn: string | null;
  items: PromotedItem[];
  ordered: boolean;
}

// A line that would parse as something other than paragraph text when it
// starts a list item: a heading, quote, nested bullet, ordered marker,
// fence, thematic break, table pipe or raw HTML.
const UNSAFE_START =
  /^(?:[-+*](?:\s|$)|#{1,6}(?:\s|$)|>|\d{1,9}[.)](?:\s|$)|`{3}|~{3}|<|\||[-_*=](?:\s*[-_*=]){2,}\s*$)/;

const CONJUNCTION_HEAD = /^(?:and|or)\s+/i;
const CONJUNCTION_TAIL = /\s+(?:and|or)$/i;

export const cleanItem = (raw: string, { last }: { last: boolean }): string => {
  let s = collapse(raw).trim();
  // "b, and" needs the conjunction and the comma gone, in either order. Only
  // the last item may open with the joining conjunction: "or" at the head of
  // a middle item is content the list would otherwise swallow.
  for (let prev = ""; prev !== s; ) {
    prev = s;
    s = s.replace(/[;,]+$/, "").trim();
    s = s.replace(CONJUNCTION_TAIL, "").trim();
    if (last) s = s.replace(CONJUNCTION_HEAD, "").trim();
  }
  if (last) s = s.replace(/(?<!\.)\.$/, "").trim();
  return s;
};

// A run of source spans as cleaned item text, ready to promote. Only the
// last item may shed a joining conjunction or a trailing full stop, so the
// spans must arrive in document order.
export const itemsOf = (src: string, spans: Range[]): string[] =>
  spans.map((span, i) => cleanItem(src.slice(span[0], span[1]), { last: i + 1 === spans.length }));

// The spans between a run of cut points, as cleaned item text. This is the
// shared body of every hidden-list fixer: the rule decides where the cuts
// are, and this decides what each item says.
export const itemsBetween = (src: string, cuts: Range[], end: number): string[] =>
  itemsOf(src, spansBetween(cuts, end));

export const cleanLeadIn = (raw: string): string | null => {
  const s = collapse(raw)
    .trim()
    .replace(/[\s:;,—-]+$/, "")
    .trim();
  return s.length > 0 ? `${s}:` : null;
};

const dedent = (raw: string, indent: string): string =>
  raw
    .split("\n")
    .map((line, i) => (i > 0 && line.startsWith(indent) ? line.slice(indent.length) : line.trimStart()))
    .join("\n");

export const promote = (p: Promotion): Edit | null => {
  const { view, src, span } = p;
  if (view.inTable || view.inBlockquote || view.hasBreak) return null;
  if (p.items.length < 2) return null;

  const texts = [...p.items.flatMap((i) => [i.text, ...(i.children ?? [])]), ...(p.leadIn ? [p.leadIn] : [])];
  if (texts.some((t) => t.length === 0 || UNSAFE_START.test(t))) return null;

  const indent = " ".repeat(view.startColumn - 1);
  const before = dedent(src.slice(view.startOffset, span[0]), indent).trim();
  const after = dedent(src.slice(span[1], view.endOffset), indent).trim();
  const head = [before, p.leadIn].filter((s): s is string => s !== null && s.length > 0).join("\n");

  const list = p.items
    .map((item, i) => {
      const marker = p.ordered ? `${i + 1}. ` : "- ";
      const pad = " ".repeat(marker.length);
      return [`${marker}${item.text}`, ...(item.children ?? []).map((c) => `${pad}- ${c}`)].join("\n");
    })
    .join("\n");

  let fragment: string;
  if (view.inListItem) {
    // Inside a list item a blank line would loosen the parent list, and text
    // after the nested list would become lazy continuation. Both change what
    // renders, so only a lead-in followed by the list is promotable here.
    if (head.length === 0 || after.length > 0) return null;
    fragment = `${head}\n${list}`;
  } else {
    fragment = [head, list, after].filter((s) => s.length > 0).join("\n\n");
  }

  const text = fragment
    .split("\n")
    .map((line, i) => (i === 0 || line.length === 0 ? line : indent + line))
    .join("\n");

  return {
    rule: p.rule,
    start: view.startOffset,
    end: view.endOffset,
    text,
    expect: { kind: "replace-paragraph", view, fragment, listItems: p.items.length },
  };
};
