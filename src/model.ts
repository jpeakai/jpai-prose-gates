// The document model: markdown parsed to mdast once, then flattened into the
// views every rule and fixer reads. Code spans, code blocks, tables and
// frontmatter are exempt by construction, never by pattern matching.

import type { Code, InlineCode, Node, Paragraph, Parent, Root, Text } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { frontmatter } from "micromark-extension-frontmatter";
import { gfm } from "micromark-extension-gfm";
import { visitParents } from "unist-util-visit-parents";
import type { Range } from "./text.ts";

// Fenced blocks in these languages hold markdown templates (a conventions or
// skeleton file shown verbatim): their prose is audited as embedded markdown
// instead of being exempt as code. Check-only, so no fix rewrites through a
// fence boundary.
const MARKDOWN_FENCE_LANGS = new Set(["markdown", "md"]);

// A text node that is a direct child of its paragraph. Only these carry
// separators a fixer may split on: text inside a link, emphasis or code is
// cargo and moves whole.
export interface DirectText {
  value: string;
  start: number;
  end: number;
}

// One paragraph with everything the rules need, derived in a single walk.
export interface ParagraphView {
  node: Paragraph;
  raw: string; // exact source slice
  line: number;
  startOffset: number;
  endOffset: number;
  startColumn: number;
  prose: string; // text values joined; inline code becomes one CODE token
  codeRanges: Range[]; // inline-code offsets in src
  directTexts: DirectText[];
  hasBreak: boolean; // a hard line break is structure, so reflow leaves it
  inTable: boolean; // check rules skip table cells
  inBlockquote: boolean;
  inListItem: boolean;
  onlyChild: boolean; // the paragraph is its parent's only block
}

export interface TextView {
  value: string;
  line: number;
  start: number | undefined;
  end: number | undefined;
  block: Node | undefined; // nearest paragraph, heading or table cell
}

// A fenced code block tagged markdown/md: a template whose body is itself
// markdown prose, audited recursively.
export interface FenceView {
  value: string; // fence body (starts on the line after the opening fence)
  line: number; // line of the opening fence
}

export interface DocModel {
  src: string;
  tree: Root;
  paragraphs: ParagraphView[];
  texts: TextView[]; // every prose text node, including headings and lists
  fences: FenceView[]; // embedded-markdown fences, audited recursively
}

export const parse = (src: string): Root =>
  // Frontmatter is metadata, not prose. Without this extension a leading
  // `---` block parses as a thematicBreak followed by a setext heading whose
  // text is the raw YAML, so every text rule fires on it.
  fromMarkdown(src, {
    extensions: [frontmatter(["yaml", "toml"]), gfm()],
    mdastExtensions: [frontmatterFromMarkdown(["yaml", "toml"]), gfmFromMarkdown()],
  });

export const buildDocModel = (src: string): DocModel => {
  const tree = parse(src);
  const paragraphs: ParagraphView[] = [];
  const texts: TextView[] = [];
  const fences: FenceView[] = [];
  const viewOf = new Map<Paragraph, ParagraphView>();
  const proseParts = new Map<Paragraph, string[]>();

  visitParents(tree, (node: Node, ancestors: Node[]) => {
    if (node.type === "code") {
      const c = node as Code;
      if (c.lang != null && MARKDOWN_FENCE_LANGS.has(c.lang) && c.position) {
        fences.push({ value: c.value, line: c.position.start.line });
      }
      return;
    }
    const parent = ancestors.at(-1) as Parent | undefined;
    if (node.type === "paragraph") {
      const p = node as Paragraph;
      const pos = p.position;
      if (!pos || pos.start.offset == null || pos.end.offset == null) return;
      const view: ParagraphView = {
        node: p,
        raw: src.slice(pos.start.offset, pos.end.offset),
        line: pos.start.line,
        startOffset: pos.start.offset,
        endOffset: pos.end.offset,
        startColumn: pos.start.column,
        prose: "",
        codeRanges: [],
        directTexts: [],
        hasBreak: false,
        inTable: ancestors.some((a) => a.type === "table" || a.type === "tableCell"),
        inBlockquote: ancestors.some((a) => a.type === "blockquote"),
        inListItem: ancestors.some((a) => a.type === "listItem"),
        onlyChild: parent !== undefined && parent.children.length === 1,
      };
      paragraphs.push(view);
      viewOf.set(p, view);
      proseParts.set(p, []);
    }
    const paragraph = ancestors.findLast((a): a is Paragraph => a.type === "paragraph");
    const view = paragraph ? viewOf.get(paragraph) : undefined;
    if (node.type === "text") {
      const t = node as Text;
      const start = t.position?.start.offset;
      const end = t.position?.end.offset;
      texts.push({
        value: t.value,
        line: t.position?.start.line ?? 0,
        start,
        end,
        block: ancestors.findLast((a) => a.type === "paragraph" || a.type === "heading" || a.type === "tableCell"),
      });
      if (paragraph) proseParts.get(paragraph)?.push(t.value);
      if (view && parent === paragraph && start != null && end != null) {
        view.directTexts.push({ value: t.value, start, end });
      }
    } else if (node.type === "inlineCode" && view) {
      const c = node as InlineCode;
      proseParts.get(paragraph as Paragraph)?.push("CODE");
      if (c.position?.start.offset != null && c.position.end.offset != null) {
        view.codeRanges.push([c.position.start.offset, c.position.end.offset]);
      }
    } else if (node.type === "break" && view) {
      view.hasBreak = true;
    }
  });

  for (const [p, parts] of proseParts) {
    const view = viewOf.get(p);
    if (view) view.prose = parts.join(" ").replace(/\s+/g, " ").trim();
  }
  return { src, tree, paragraphs, texts, fences };
};
