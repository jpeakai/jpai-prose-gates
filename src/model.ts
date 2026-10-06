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
import { isMap, isScalar, LineCounter, parseDocument } from "yaml";
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

// One top-level key of the frontmatter whose value is a string.
export interface FrontmatterEntry {
  key: string;
  value: string; // the scalar as text, folded lines joined
  line: number; // file line where the value starts
  start: number; // source offsets of the value, quotes included
  end: number;
}

export interface FrontmatterView {
  format: "yaml";
  entries: FrontmatterEntry[];
}

export interface DocModel {
  src: string;
  tree: Root;
  paragraphs: ParagraphView[];
  texts: TextView[]; // every prose text node, including headings and lists
  fences: FenceView[]; // embedded-markdown fences, audited recursively
  // The leading YAML block as keys and values, read on first use so a document
  // whose frontmatter is not valid YAML only fails the rules that ask for it.
  readonly frontmatter: FrontmatterView | null;
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
  let frontmatter: FrontmatterView | null | undefined;
  return {
    src,
    tree,
    paragraphs,
    texts,
    fences,
    get frontmatter() {
      frontmatter ??= readFrontmatter(src, tree);
      return frontmatter;
    },
  };
};

// The top-level string entries of a leading YAML block. Only the first node
// of the tree can be frontmatter, and TOML is not read. A value that is not a
// plain string, and anything nested, is left out rather than guessed at. Invalid
// YAML throws with the line, so a rule that needs the keys cannot run on a
// block it could not read.
const readFrontmatter = (src: string, tree: Root): FrontmatterView | null => {
  const node = tree.children[0];
  const offset = node?.position?.start.offset;
  if (node?.type !== "yaml" || offset == null || !node.position) return null;
  const opening = node.position.start;
  const contentStart = offset + src.slice(offset).indexOf("\n") + 1;
  const lines = new LineCounter();
  const doc = parseDocument(node.value, { lineCounter: lines });
  const [problem] = doc.errors;
  if (problem) {
    const line = opening.line + (problem.linePos?.[0].line ?? 1);
    throw new Error(`frontmatter YAML error at line ${line}: ${problem.message.split("\n")[0]}`);
  }
  const entries: FrontmatterEntry[] = [];
  if (isMap(doc.contents)) {
    for (const pair of doc.contents.items) {
      const { key, value } = pair;
      if (!isScalar(key) || typeof key.value !== "string" || !isScalar(value) || typeof value.value !== "string")
        continue;
      const [from, to] = value.range ?? [0, 0];
      entries.push({
        key: key.value,
        value: value.value,
        line: opening.line + lines.linePos(from).line,
        start: contentStart + from,
        end: contentStart + to,
      });
    }
  }
  return { format: "yaml", entries };
};
