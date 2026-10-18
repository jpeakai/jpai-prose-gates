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
import { type Document, isMap, isPair, isScalar, isSeq, LineCounter, parseDocument, type Scalar } from "yaml";
import { type ConceptModel, NO_CONCEPTS } from "./concepts.ts";
import { type LanguageView, languageOf } from "./language.ts";
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
  // Its sentences, words, tags and lemmas, read from `prose` on first use.
  readonly language: LanguageView;
}

export interface TextView {
  value: string;
  line: number;
  start: number | undefined;
  end: number | undefined;
  block: Node | undefined; // nearest paragraph, heading or table cell
  // Its sentences, words, tags and lemmas, read from `value` on first use. A
  // text node is a fragment, so emphasis or a link splits a sentence across texts.
  readonly language: LanguageView;
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

// How a YAML string is written, which a fixer needs to rewrite it safely.
export type ScalarStyle = "plain" | "double" | "single" | "literal" | "folded";

// A string value anywhere in the frontmatter, found by walking the whole YAML
// document in order. A value in a nested map or a list is here too, with the
// path that leads to it.
export interface FrontmatterScalar {
  path: (string | number)[]; // keys and list indexes from the document root
  key: string | null; // the nearest map key above it, at any depth
  keyLine: number | null; // file line of that key
  value: string; // the string as YAML reads it
  line: number; // file line where the value starts
  start: number; // absolute source offsets of the value, quotes included
  end: number;
  style: ScalarStyle;
  indent: number; // leading spaces of the line the key, or the value, sits on
  node: Scalar; // the yaml package node, for anything this view does not carry
}

export interface FrontmatterView {
  format: "yaml";
  // The top-level string entries, kept for the common flat case.
  entries: FrontmatterEntry[];
  // Every string scalar at any depth, in document order.
  scalars: FrontmatterScalar[];
  // The whole parsed document, from the yaml package, for full traversal.
  document: Document.Parsed;
  // Absolute offset in `src` where the YAML text starts, so a node range from
  // `document` maps to the source as offset + range.
  offset: number;
  // The file line of an absolute source offset inside the block.
  lineOf: (absoluteOffset: number) => number;
}

export interface DocModel {
  src: string;
  tree: Root;
  paragraphs: ParagraphView[];
  texts: TextView[]; // every prose text node, including headings and lists
  fences: FenceView[]; // embedded-markdown fences, audited recursively
  // The project's concepts, which every paragraph's language view names.
  concepts: ConceptModel;
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

// The views a single walk of the tree fills in, in document order.
interface WalkState {
  src: string;
  paragraphs: ParagraphView[];
  texts: TextView[];
  fences: FenceView[];
  viewOf: Map<Paragraph, ParagraphView>;
  proseParts: Map<Paragraph, string[]>;
  concepts: ConceptModel;
}

// A markdown-tagged fence is kept as a template to audit; any other code is exempt.
const visitCode = (state: WalkState, c: Code): void => {
  if (c.lang != null && MARKDOWN_FENCE_LANGS.has(c.lang) && c.position) {
    state.fences.push({ value: c.value, line: c.position.start.line });
  }
};

// A paragraph opens a view that its descendants fill in as the walk reaches them.
const visitParagraph = (state: WalkState, p: Paragraph, ancestors: Node[]): void => {
  const pos = p.position;
  if (!pos || pos.start.offset == null || pos.end.offset == null) return;
  const parent = ancestors.at(-1) as Parent | undefined;
  const view: ParagraphView = {
    node: p,
    raw: state.src.slice(pos.start.offset, pos.end.offset),
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
    // Tagging is the slowest step in a check, so it waits for the first read.
    // By then the walk has joined the prose, which it is built from.
    get language() {
      language ??= languageOf(view.prose, state.concepts);
      return language;
    },
  };
  let language: LanguageView | undefined;
  state.paragraphs.push(view);
  state.viewOf.set(p, view);
  state.proseParts.set(p, []);
};

// Every text node is prose; one directly under its paragraph is also a split point.
const visitText = (state: WalkState, t: Text, ancestors: Node[], paragraph: Paragraph | undefined): void => {
  const start = t.position?.start.offset;
  const end = t.position?.end.offset;
  let language: LanguageView | undefined;
  state.texts.push({
    value: t.value,
    line: t.position?.start.line ?? 0,
    start,
    end,
    block: ancestors.findLast((a) => a.type === "paragraph" || a.type === "heading" || a.type === "tableCell"),
    get language() {
      language ??= languageOf(t.value, state.concepts);
      return language;
    },
  });
  if (!paragraph) return;
  state.proseParts.get(paragraph)?.push(t.value);
  const view = state.viewOf.get(paragraph);
  if (view && ancestors.at(-1) === paragraph && start != null && end != null) {
    view.directTexts.push({ value: t.value, start, end });
  }
};

// Inline code reads as one CODE token in the prose, and its range is exempt.
const visitInlineCode = (state: WalkState, c: InlineCode, paragraph: Paragraph, view: ParagraphView): void => {
  state.proseParts.get(paragraph)?.push("CODE");
  if (c.position?.start.offset != null && c.position.end.offset != null) {
    view.codeRanges.push([c.position.start.offset, c.position.end.offset]);
  }
};

// Route one node of the walk to the view it feeds.
const visitNode = (state: WalkState, node: Node, ancestors: Node[]): void => {
  if (node.type === "code") {
    visitCode(state, node as Code);
    return;
  }
  if (node.type === "paragraph") {
    visitParagraph(state, node as Paragraph, ancestors);
    return;
  }
  const paragraph = ancestors.findLast((a): a is Paragraph => a.type === "paragraph");
  if (node.type === "text") {
    visitText(state, node as Text, ancestors, paragraph);
    return;
  }
  const view = paragraph ? state.viewOf.get(paragraph) : undefined;
  if (!(paragraph && view)) return;
  if (node.type === "inlineCode") visitInlineCode(state, node as InlineCode, paragraph, view);
  else if (node.type === "break") view.hasBreak = true;
};

export const buildDocModel = (src: string, concepts: ConceptModel = NO_CONCEPTS): DocModel => {
  const tree = parse(src);
  const state: WalkState = {
    src,
    paragraphs: [],
    texts: [],
    fences: [],
    viewOf: new Map(),
    proseParts: new Map(),
    concepts,
  };
  visitParents(tree, (node: Node, ancestors: Node[]) => {
    visitNode(state, node, ancestors);
  });

  for (const [p, parts] of state.proseParts) {
    const view = state.viewOf.get(p);
    if (view) view.prose = parts.join(" ").replace(/\s+/g, " ").trim();
  }
  let frontmatter: FrontmatterView | null | undefined;
  return {
    src,
    tree,
    paragraphs: state.paragraphs,
    texts: state.texts,
    fences: state.fences,
    concepts,
    get frontmatter() {
      frontmatter ??= readFrontmatter(src, tree);
      return frontmatter;
    },
  };
};

const STYLES: Record<string, ScalarStyle> = {
  PLAIN: "plain",
  QUOTE_DOUBLE: "double",
  QUOTE_SINGLE: "single",
  BLOCK_LITERAL: "literal",
  BLOCK_FOLDED: "folded",
};

// What the walk of a YAML document needs to place each scalar in the source,
// and the list it fills in document order.
interface ScalarWalk {
  contentStart: number; // absolute offset where the YAML text starts
  lineOf: (absoluteOffset: number) => number;
  indentOf: (relativeOffset: number) => number;
  scalars: FrontmatterScalar[];
}

// A string scalar with a range is recorded; anything else is left out.
const visitScalar = (walk: ScalarWalk, value: Scalar, path: (string | number)[], key: Scalar | null): void => {
  if (typeof value.value !== "string" || !value.range) return;
  const { contentStart, lineOf } = walk;
  const [from, to] = value.range;
  const anchor = key?.range ? key.range[0] : from;
  walk.scalars.push({
    path,
    key: key && typeof key.value === "string" ? key.value : null,
    keyLine: key?.range ? lineOf(contentStart + key.range[0]) : null,
    value: value.value,
    line: lineOf(contentStart + from),
    start: contentStart + from,
    end: contentStart + to,
    style: STYLES[value.type ?? "PLAIN"] ?? "plain",
    indent: walk.indentOf(anchor),
    node: value,
  });
};

// Descend into a YAML node in order: a map by key, a list by index, keeping the
// nearest map key above each scalar.
const walkYaml = (walk: ScalarWalk, value: unknown, path: (string | number)[], key: Scalar | null): void => {
  if (isScalar(value)) {
    visitScalar(walk, value, path, key);
    return;
  }
  if (isMap(value)) {
    for (const pair of value.items) {
      if (!isPair(pair)) continue;
      const k = isScalar(pair.key) ? pair.key : null;
      walkYaml(walk, pair.value, [...path, k ? String(k.value) : ""], k);
    }
    return;
  }
  if (isSeq(value)) {
    value.items.forEach((item, i) => {
      walkYaml(walk, item, [...path, i], key);
    });
  }
};

// A leading YAML block as a whole document, plus the string scalars found by
// walking all of it. Only the first node of the tree can be frontmatter, and
// TOML is not read. A value that is not a string is left out of `scalars`
// rather than guessed at, and an alias is not followed. Invalid YAML throws with
// the line, so a rule that needs the keys cannot run on a block it could not read.
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
  const lineOf = (absolute: number): number => opening.line + lines.linePos(absolute - contentStart).line;
  const indentOf = (relative: number): number => {
    const lineStart = node.value.lastIndexOf("\n", relative - 1) + 1;
    return /^ */.exec(node.value.slice(lineStart))?.[0].length ?? 0;
  };

  const walk: ScalarWalk = { contentStart, lineOf, indentOf, scalars: [] };
  walkYaml(walk, doc.contents, [], null);
  const { scalars } = walk;

  const entries: FrontmatterEntry[] = scalars
    .filter((s) => s.path.length === 1 && typeof s.path[0] === "string")
    .map((s) => ({ key: s.path[0] as string, value: s.value, line: s.line, start: s.start, end: s.end }));
  return { format: "yaml", entries, scalars, document: doc, offset: contentStart, lineOf };
};
