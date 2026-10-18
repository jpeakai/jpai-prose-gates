// The language model of a paragraph: its sentences, and each sentence's words
// with their part-of-speech tags and lemmas. Everything here takes a string and
// returns plain data. compromise does the work, pinned exactly so a finding
// never changes under an upgrade: it splits the sentences, tags each word and
// gives its lemma. A paragraph exposes this as its lazy `language` view, so a
// rule that never reads it pays nothing.

import nlp from "compromise";
import { type ConceptMention, type ConceptModel, mentionsIn, NO_CONCEPTS } from "./concepts.ts";

// One word of a sentence. `lemma` is lower case, so "Parsing" reads as "parse".
// `content` is true for a noun, verb or adjective that is not a pronoun or an
// auxiliary, and never for the CODE token that stands for inline code.
export interface LanguageWord {
  text: string;
  lemma: string;
  tags: readonly string[];
  content: boolean;
}

// One sentence, as the paragraph's prose holds it, with inline code as CODE.
// `terms` is the lemmas of its content words. `opener` is CODE when the
// sentence opens with inline code, else the lemma of a content word it opens
// with, else null. `refersBack` is true when its first word is a pronoun, a
// possessive, an adverb or a connective: "It", "Its", "Then", "However".
// `verbPhrases` is how many verb phrases compromise finds, with an auxiliary
// counted inside its verb, so "is shared" is one. `concepts` is each place it
// names a concept of the project's concept file, empty when it has none.
export interface LanguageSentence {
  text: string;
  words: readonly LanguageWord[];
  terms: ReadonlySet<string>;
  opener: string | null;
  refersBack: boolean;
  verbPhrases: number;
  concepts: readonly ConceptMention[];
}

export interface LanguageView {
  sentences: readonly LanguageSentence[];
}

const CONTENT = new Set(["Noun", "Verb", "Adjective"]);
const FUNCTION = new Set(["Pronoun", "Possessive", "Auxiliary", "Copula", "Modal", "Determiner"]);
const REFERS_BACK = new Set(["Pronoun", "Possessive", "Adverb", "Conjunction"]);

// The shape compromise returns for a term once compute("root") has run.
interface TaggedTerm {
  text: string;
  normal: string;
  root?: string;
  tags: string[];
}

const wordOf = (term: TaggedTerm): LanguageWord => ({
  text: term.text,
  lemma: (term.root ?? term.normal).toLowerCase(),
  tags: term.tags,
  content: term.text !== "CODE" && term.tags.some((t) => CONTENT.has(t)) && !term.tags.some((t) => FUNCTION.has(t)),
});

// One tagging pass gives the words and the verb phrases.
const tag = (sentence: string): { words: LanguageWord[]; verbPhrases: number } => {
  const doc = nlp(sentence);
  // A participle between a determiner, adjective or number and a noun
  // describes the noun, as in "the signed tag", so it is no verb phrase.
  doc.match("(#Determiner|#Adjective|#Value) [(#PastTense|#Participle)] #Noun", 0).tag("Adjective");
  doc.compute("root");
  // compromise's option types omit root, which compute("root") adds.
  const rows = doc.json({ terms: { normal: true, root: true, tags: true } } as object) as { terms: TaggedTerm[] }[];
  return { words: rows.flatMap((row) => row.terms).map(wordOf), verbPhrases: doc.verbs().length };
};

const openerOf = (first: LanguageWord | undefined): string | null => {
  if (!first) return null;
  if (first.text === "CODE") return "CODE";
  return first.content ? first.lemma : null;
};

// One sentence's words and what they say about cohesion, and the concepts it names.
const sentenceWith = (text: string, concepts: ConceptModel): LanguageSentence => {
  const { words, verbPhrases } = tag(text);
  const first = words[0];
  return {
    text,
    words,
    terms: new Set(words.filter((w) => w.content).map((w) => w.lemma)),
    opener: openerOf(first),
    refersBack: first?.tags.some((t) => REFERS_BACK.has(t)) ?? false,
    verbPhrases,
    concepts: mentionsIn(words, concepts),
  };
};

// One sentence on its own, with no concepts. It takes one argument, so it is
// safe to pass to map.
export const sentenceOf = (text: string): LanguageSentence => sentenceWith(text, NO_CONCEPTS);

// The sentences of a paragraph's prose. compromise keeps abbreviations such
// as e.g. and Dr., decimals and urls inside the sentence they belong to, and
// still ends one after a number or before a lower-case word.
export const sentenceTexts = (prose: string): string[] =>
  (nlp(prose).sentences().out("array") as string[]).map((s) => s.trim()).filter((s) => s.length > 0);

export const languageOf = (prose: string, concepts: ConceptModel = NO_CONCEPTS): LanguageView => ({
  sentences: sentenceTexts(prose).map((s) => sentenceWith(s, concepts)),
});
