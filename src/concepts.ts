// The concept model: a project's own vocabulary, read from the GLOSSARY.md or
// CONCEPTS.md at its root. Each H2 heading is a concept, and each Mermaid
// flowchart in the file relates them: a labelled edge is a relation, a dotted
// one is a prohibition, and "is a kind of" makes one concept a kind of another.
// The file is optional, but one that is there must parse, because a rule that
// reads concepts would otherwise run against half a vocabulary.

import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import nlp from "compromise";
import type { Code, Heading, Node, Text } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { AmbiguousConceptsError, ConceptsFileError } from "./errors.ts";

export const CONCEPT_FILES = ["GLOSSARY.md", "CONCEPTS.md"] as const;

// The edge label that makes its source a kind of its target.
export const KIND_OF = "is a kind of";

// One concept. `kinds` is every concept it is a kind of, nearest first, so a
// Local Rule that is a kind of Plugin has kinds ["Plugin"].
export interface Concept {
  name: string;
  kinds: readonly string[];
}

// One edge of a diagram, by concept name. `verb` is the edge label, empty for
// an unlabelled edge. `never` is true for a dotted edge: the source must never
// do what the label says to the target.
export interface ConceptRelation {
  from: string;
  verb: string;
  to: string;
  never: boolean;
}

export interface ConceptModel {
  // The file it came from, relative to the project root. Null when there is none.
  file: string | null;
  concepts: readonly Concept[];
  relations: readonly ConceptRelation[];
}

export const NO_CONCEPTS: ConceptModel = { file: null, concepts: [], relations: [] };

// --- reading the file ------------------------------------------------------

const textOf = (node: Node): string =>
  node.type === "text" || node.type === "inlineCode"
    ? (node as Text).value
    : ((node as { children?: Node[] }).children ?? []).map(textOf).join("");

const NODE = /^\s*([A-Za-z][\w-]*)\["([^"]+)"\]/;
const EDGE = /^\s*([A-Za-z][\w-]*)\s+(?:(--|-\.)\s+(.+?)\s+(-->|\.->)|(-->|-\.->))\s+([A-Za-z][\w-]*)\s*$/;

// One diagram's relations. Node ids are local to their diagram, so two
// diagrams may reuse an id for different concepts.
const relationsOf = (file: string, diagram: Code, names: ReadonlySet<string>): ConceptRelation[] => {
  const label = new Map<string, string>();
  const relations: ConceptRelation[] = [];
  for (const line of diagram.value.split("\n")) {
    const node = NODE.exec(line);
    if (node) {
      const [, id = "", name = ""] = node;
      if (!names.has(name)) throw new ConceptsFileError(file, `diagram node "${name}" is not a term heading`);
      label.set(id, name);
      continue;
    }
    const edge = EDGE.exec(line);
    if (!edge) continue;
    const [, from = "", solidOrDotted, verb = "", , bare, to = ""] = edge;
    const ends = [from, to].map((id) => {
      const name = label.get(id);
      if (!name) throw new ConceptsFileError(file, `edge "${line.trim()}" names "${id}", which no node declares`);
      return name;
    });
    const never = solidOrDotted === "-." || bare === "-.->";
    relations.push({ from: ends[0] as string, verb, to: ends[1] as string, never });
  }
  return relations;
};

// Every concept a concept is a kind of, nearest first. A cycle is an error,
// because it leaves a concept a kind of itself.
const kindsOf = (file: string, name: string, parents: ReadonlyMap<string, string[]>): string[] => {
  const kinds: string[] = [];
  const queue = [...(parents.get(name) ?? [])];
  while (queue.length > 0) {
    const next = queue.shift() as string;
    if (next === name) throw new ConceptsFileError(file, `"${name}" is a kind of itself`);
    if (kinds.includes(next)) continue;
    kinds.push(next);
    queue.push(...(parents.get(next) ?? []));
  }
  return kinds;
};

export const parseConcepts = (file: string, src: string): ConceptModel => {
  const root = fromMarkdown(src);
  const headings = root.children.filter((n): n is Heading => n.type === "heading" && n.depth === 2);
  const names = headings.map((h) => textOf(h).trim());
  if (names.length === 0) throw new ConceptsFileError(file, "it has no H2 headings, and each H2 is a term");
  const repeated = names.find((n, i) => names.indexOf(n) !== i);
  if (repeated) throw new ConceptsFileError(file, `the term "${repeated}" has two headings`);
  const known = new Set(names);
  const diagrams = root.children.filter((n): n is Code => n.type === "code" && n.lang === "mermaid");
  const relations = diagrams.flatMap((d) => relationsOf(file, d, known));
  const parents = new Map<string, string[]>();
  for (const r of relations.filter((x) => x.verb === KIND_OF && !x.never)) {
    parents.set(r.from, [...(parents.get(r.from) ?? []), r.to]);
  }
  return { file, concepts: names.map((name) => ({ name, kinds: kindsOf(file, name, parents) })), relations };
};

const exists = (path: string): Promise<boolean> =>
  access(path).then(
    () => true,
    () => false,
  );

// The concept file at the root, or null. Two at once is ambiguous, so it is
// an error rather than a pick.
export const findConcepts = async (root: string): Promise<string | null> => {
  const found: string[] = [];
  for (const name of CONCEPT_FILES) if (await exists(join(root, name))) found.push(name);
  if (found.length > 1) throw new AmbiguousConceptsError(root, found);
  return found[0] ?? null;
};

export const loadConcepts = async (root: string): Promise<ConceptModel> => {
  const name = await findConcepts(root);
  return name ? parseConcepts(name, await readFile(join(root, name), "utf8")) : NO_CONCEPTS;
};

// --- finding concepts in a sentence ----------------------------------------

// One place a sentence names a concept. `start` and `length` count words of
// the sentence. `text` is the words as written, so "prose gates" names Prose Gate.
export interface ConceptMention {
  concept: string;
  text: string;
  start: number;
  length: number;
  kinds: readonly string[];
}

interface Form {
  concept: Concept;
  words: readonly string[];
}

// The word sequences that name each concept, its own and its plural, longest
// first, keyed by their first word. compromise tokenises each so they line up
// with the sentence's words, which it tokenised the same way.
const formsCache = new WeakMap<ConceptModel, Map<string, Form[]>>();

const tokens = (text: string): string[] =>
  (nlp(text).json() as { terms: { text: string }[] }[]).flatMap((s) => s.terms.map((t) => t.text.toLowerCase()));

const formsOf = (model: ConceptModel): Map<string, Form[]> => {
  const cached = formsCache.get(model);
  if (cached) return cached;
  const byFirst = new Map<string, Form[]>();
  for (const concept of model.concepts) {
    const lower = concept.name.toLowerCase();
    const plural = nlp(lower).nouns().toPlural().text();
    for (const form of new Set([lower, plural].filter((f) => f.length > 0))) {
      const words = tokens(form);
      const first = words[0] as string;
      byFirst.set(first, [...(byFirst.get(first) ?? []), { concept, words }]);
    }
  }
  for (const forms of byFirst.values()) forms.sort((a, b) => b.words.length - a.words.length);
  formsCache.set(model, byFirst);
  return byFirst;
};

interface MatchWord {
  text: string;
  tags: readonly string[];
}

// A one-word concept must be read as a noun there, so "release the package"
// names no Release. A longer one is specific enough as it stands.
const matchAt = (words: readonly MatchWord[], at: number, forms: readonly Form[]): Form | undefined =>
  forms.find(
    (f) =>
      f.words.every((w, i) => words[at + i]?.text.toLowerCase() === w) &&
      (f.words.length > 1 || (words[at]?.tags.includes("Noun") ?? false)),
  );

// Every concept the words name, longest match first, never overlapping.
export const mentionsIn = (words: readonly MatchWord[], model: ConceptModel): ConceptMention[] => {
  if (model.concepts.length === 0) return [];
  const byFirst = formsOf(model);
  const mentions: ConceptMention[] = [];
  for (let at = 0; at < words.length; at++) {
    const form = matchAt(words, at, byFirst.get(words[at]?.text.toLowerCase() ?? "") ?? []);
    if (!form) continue;
    const length = form.words.length;
    const text = words
      .slice(at, at + length)
      .map((w) => w.text)
      .join(" ");
    mentions.push({ concept: form.concept.name, text, start: at, length, kinds: form.concept.kinds });
    at += length - 1;
  }
  return mentions;
};
