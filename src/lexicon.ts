// A lexicon is a list of phrases a rule looks for, kept as data so a list can change without a rule
// changing. Matching is plain: whole words only, any case, any run of whitespace standing for one
// space, and a curly apostrophe standing for a straight one. Nothing here reads meaning, so the
// same text always gives the same matches on every runtime (PRS-0034).

export interface LexiconEntry {
  // Literal text. Regular-expression characters in it are matched as themselves.
  phrase?: string;
  // Or the source of a regular expression, for forms a literal cannot cover, such as inflections.
  // It runs with the u and i flags, inside the same word boundaries as a phrase.
  pattern?: string;
  // What this kind of match is called in a message, when the rule's own name is too broad.
  label?: string;
  // Advice for this entry alone, when the rule's general advice is too blunt.
  instruction?: string;
}

export interface Lexicon {
  id: string;
  // The date a person last reviewed the list, so a reader can tell how stale it is.
  reviewed: string;
  // Where the ideas came from. The lists are our own wording, and these names are credit.
  sources: readonly string[];
  // Words are matched whole. A list of glyphs, spacing or markup, which has no words to bound, says "none".
  boundary?: "word" | "none";
  entries: readonly LexiconEntry[];
}

export interface LexiconMatch {
  entry: LexiconEntry;
  text: string;
  // Offset of the match inside the scanned text.
  index: number;
}

const WORD = "[\\p{L}\\p{N}_]";
const LEFT = `(?<!${WORD})`;
const RIGHT = `(?!${WORD})`;

const escapeLiteral = (text: string): string =>
  text
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/['’]/g, "['’]")
    .replace(/\s+/g, "\\s+");

const compiled = new WeakMap<Lexicon, { entry: LexiconEntry; regex: RegExp }[]>();

const compile = (lexicon: Lexicon): { entry: LexiconEntry; regex: RegExp }[] => {
  const cached = compiled.get(lexicon);
  if (cached) return cached;
  const built = lexicon.entries.map((entry) => {
    const body = entry.pattern ?? (entry.phrase === undefined ? "" : escapeLiteral(entry.phrase));
    if (body === "") throw new Error(`lexicon ${lexicon.id}: an entry needs a phrase or a pattern`);
    // A pattern is bounded on both ends, and a lexicon of glyphs or markup says "none" and guards its
    // own patterns. A phrase is bounded only where it starts or ends with a word character, because
    // "sandbox:/mnt/" has no word to stop at after its slash.
    const phrase = entry.pattern === undefined ? (entry.phrase ?? "") : undefined;
    const left = lexicon.boundary === "none" ? "" : phrase === undefined || /^[\p{L}\p{N}_]/u.test(phrase) ? LEFT : "";
    const right =
      lexicon.boundary === "none" ? "" : phrase === undefined || /[\p{L}\p{N}_]$/u.test(phrase) ? RIGHT : "";
    return { entry, regex: new RegExp(`${left}(?:${body})${right}`, "giu") };
  });
  compiled.set(lexicon, built);
  return built;
};

// Every match of every entry in the text, in order of position. Where two matches overlap, the one
// that starts first wins, and the longer one on a tie, so a phrase and a shorter phrase inside it
// report once.
export const scan = (lexicon: Lexicon, text: string): LexiconMatch[] => {
  const found: LexiconMatch[] = [];
  for (const { entry, regex } of compile(lexicon)) {
    for (const m of text.matchAll(regex)) found.push({ entry, text: m[0], index: m.index ?? 0 });
  }
  found.sort((a, b) => a.index - b.index || b.text.length - a.text.length);
  const kept: LexiconMatch[] = [];
  let end = -1;
  for (const m of found) {
    if (m.index < end) continue;
    kept.push(m);
    end = m.index + m.text.length;
  }
  return kept;
};
