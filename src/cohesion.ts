// Lexical cohesion between the sentences of one paragraph: which sentences
// talk about the same thing, and where the topic turns. It reads the language
// model a paragraph exposes, so the words, tags and lemmas come from
// src/language.ts. The scoring and the break plan are a guide, not a parse:
// no JavaScript topic segmenter exists to use instead.

import type { LanguageSentence } from "./language.ts";

const shared = (a: ReadonlySet<string>, b: ReadonlySet<string>): number => [...a].filter((t) => b.has(t)).length;

// How strongly the sentences either side of each gap hold together. Gap i
// sits between sentence i and sentence i + 1, counted from zero here. A term
// the two neighbours share counts double. A term shared by sentences two
// apart across the gap counts once, so a sentence that strays for a moment
// does not split a topic. A sentence that opens by referring back counts
// double, and one that opens like its neighbour, in parallel, counts once.
// Zero means nothing ties the two sides together: the topic turns.
export const gapCohesion = (sentences: readonly LanguageSentence[]): number[] => {
  const terms = sentences.map((s) => s.terms);
  const openers = sentences.map((s) => s.opener);
  const none: ReadonlySet<string> = new Set();
  const at = (i: number): ReadonlySet<string> => terms[i] ?? none;
  return sentences.slice(1).map((next, i) => {
    const adjacent = shared(at(i), at(i + 1));
    // A gap at either end has one pair two apart instead of two, so the pairs
    // it has are scaled up. Otherwise an edge would always look weakest.
    const pairs = [
      i - 1 >= 0 ? shared(at(i - 1), at(i + 1)) : null,
      i + 2 < terms.length ? shared(at(i), at(i + 2)) : null,
    ];
    const present = pairs.filter((p): p is number => p !== null);
    const skips = present.length === 0 ? 0 : (2 * present.reduce((a, b) => a + b, 0)) / present.length;
    const parallel = openers[i] !== null && openers[i] === openers[i + 1] ? 1 : 0;
    return 2 * adjacent + skips + (next.refersBack ? 2 : 0) + parallel;
  });
};

// Where to break a paragraph: after every sentence whose gap has no cohesion,
// then inside any group still over the budget, at its weakest gap. A tie goes
// to the gap nearest the middle of the group, so the halves come out even.
// Breaks are sentence numbers counted from one: a break of 3 means a new
// paragraph starts with sentence 4.
export interface BreakPlan {
  topics: number;
  breaks: number[];
}

export const planBreaks = (cohesion: number[], maxSentences: number): BreakPlan => {
  const count = cohesion.length + 1;
  const topicBreaks = cohesion.flatMap((score, i) => (score === 0 ? [i + 1] : []));
  const breaks = new Set(topicBreaks);
  const split = (from: number, to: number): void => {
    // The group holds sentences from + 1 through to.
    if (to - from <= maxSentences) return;
    let best = -1;
    for (let at = from + 1; at < to; at++) {
      const better =
        best === -1 ||
        (cohesion[at - 1] as number) < (cohesion[best - 1] as number) ||
        (cohesion[at - 1] === cohesion[best - 1] && Math.abs(2 * at - from - to) < Math.abs(2 * best - from - to));
      if (better) best = at;
    }
    breaks.add(best);
    split(from, best);
    split(best, to);
  };
  const edges = [0, ...topicBreaks, count];
  for (let i = 0; i + 1 < edges.length; i++) split(edges[i] as number, edges[i + 1] as number);
  return { topics: topicBreaks.length + 1, breaks: [...breaks].sort((a, b) => a - b) };
};
