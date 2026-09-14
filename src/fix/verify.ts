// Proof obligations for a fix. The engine applies one edit, re-parses, and
// checks two things: no word was lost (a fixer bug, so it throws), and the
// document's structure changed exactly as the edit declared (a context the
// fixer could not see, so the edit is refused and the finding stays).

import type { Node, Parent, Root } from "mdast";
import { visitParents as visit } from "unist-util-visit-parents";
import { parse } from "../model.ts";
import type { Edit } from "../rules/types.ts";

export class FixInvariantError extends Error {
  constructor(edit: Edit, detail: string) {
    super(`${edit.rule} fixer lost content (${detail}); this is a bug in the fixer, not the document`);
    this.name = "FixInvariantError";
  }
}

// Words carried by the document: text, code, alt text and every URL. The
// punctuation a fixer is allowed to rewrite (separators, enumeration markers,
// joining conjunctions) is excluded so the comparison proves only that no
// real content moved or vanished. A marker is recognised whatever follows
// it: a separator swap that turns "(1) —" into "(1):" must not make the
// marker count as a word it never was.
const ENUM_MARKER = /(?<![\p{L}\p{N}_])\((?:[a-z]|[ivx]+|\d+)\)/giu;

export const fingerprint = (tree: Root): string[] => {
  const words: string[] = [];
  const take = (s: string | null | undefined, stripMarkers = false): void => {
    if (!s) return;
    const text = stripMarkers ? s.replace(ENUM_MARKER, " ") : s;
    for (const m of text.matchAll(/[\p{L}\p{N}_]+/gu)) {
      const w = m[0];
      if (!/^(?:and|or)$/i.test(w)) words.push(w);
    }
  };
  visit(tree, (node: Node) => {
    const n = node as Node & { value?: string; url?: string; alt?: string; title?: string };
    if (node.type === "text") take(n.value, true);
    else if (node.type === "inlineCode" || node.type === "code" || node.type === "html") take(n.value);
    else if (node.type === "yaml" || node.type === "toml") take(n.value);
    take(n.url);
    take(n.alt);
    take(n.title);
  });
  return words;
};

type Plain = { [k: string]: unknown };

const OMIT = new Set(["position", "data"]);

const normaliseValue = (node: Node, value: string, blankText: boolean): string => {
  if (node.type !== "text") return value;
  return blankText ? "" : value.replace(/\s+/g, " ").trim();
};

// A position-free copy of the tree for structural comparison. `swap`
// replaces one node with a list of nodes, which is how the expected tree for
// a paragraph replacement is built.
export const normalise = (node: Node, opts: { blankText?: boolean; swap?: [Node, Node[]] } = {}): Plain => {
  const out: Plain = {};
  for (const [key, value] of Object.entries(node)) {
    if (OMIT.has(key)) continue;
    if (key === "children" && Array.isArray(value)) {
      out.children = (value as Node[]).flatMap((child) =>
        opts.swap && child === opts.swap[0]
          ? opts.swap[1].map((c) => normalise(c, { blankText: opts.blankText }))
          : [normalise(child, opts)],
      );
    } else if (key === "value" && typeof value === "string") {
      out.value = normaliseValue(node, value, opts.blankText ?? false);
    } else {
      out[key] = value;
    }
  }
  return out;
};

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

// Definitions resolve references document-wide, so a fragment parsed on its
// own borrows every definition from the document it came from.
const definitionsOf = (src: string, tree: Root): string[] => {
  const defs: string[] = [];
  visit(tree, (node: Node) => {
    if ((node.type === "definition" || node.type === "footnoteDefinition") && node.position) {
      const { start, end } = node.position;
      if (start.offset != null && end.offset != null) defs.push(src.slice(start.offset, end.offset));
    }
  });
  return defs;
};

const parseFragment = (fragment: string, defs: string[]): Node[] => {
  const tree = parse([fragment, ...defs].join("\n\n"));
  return tree.children.slice(0, tree.children.length - defs.length);
};

// The fragment must be the shape the fixer meant: optional paragraphs around
// exactly one list whose items each open with paragraph text.
const fragmentShapeOk = (nodes: Node[], listItems: number): boolean => {
  const lists = nodes.filter((n) => n.type === "list") as Parent[];
  if (lists.length !== 1 || nodes.some((n) => n.type !== "list" && n.type !== "paragraph")) return false;
  const items = (lists[0] as Parent).children as Parent[];
  return items.length === listItems && items.every((i) => i.children[0]?.type === "paragraph");
};

export type Verdict = "accept" | "refuse";

export const verify = (edit: Edit, before: { src: string; tree: Root }, afterTree: Root): Verdict => {
  const lost = fingerprint(before.tree).join(" ");
  const kept = fingerprint(afterTree).join(" ");
  if (lost !== kept) {
    const a = lost.split(" ");
    const b = kept.split(" ");
    const diverge = a.findIndex((w, i) => w !== b[i]);
    const at = diverge === -1 ? a.length : diverge;
    throw new FixInvariantError(edit, `word ${at} was "${a[at] ?? ""}", now "${b[at] ?? ""}"`);
  }

  const expect = edit.expect;
  if (expect.kind === "same-tree") {
    return sameJson(normalise(before.tree), normalise(afterTree)) ? "accept" : "refuse";
  }
  if (expect.kind === "same-shape") {
    return sameJson(normalise(before.tree, { blankText: true }), normalise(afterTree, { blankText: true }))
      ? "accept"
      : "refuse";
  }
  const nodes = parseFragment(expect.fragment, definitionsOf(before.src, before.tree));
  if (!fragmentShapeOk(nodes, expect.listItems)) return "refuse";
  const expected = normalise(before.tree, { swap: [expect.view.node, nodes] });
  return sameJson(expected, normalise(afterTree)) ? "accept" : "refuse";
};
