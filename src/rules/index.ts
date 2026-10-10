// The rule catalogue, in id order. To add a rule: write one module exporting
// a Rule with its category, register it here, and add its section and
// examples to RULES.md, which tests/rules-doc.test.ts holds to the code.

import { listCommaLabelledRun } from "./list-comma-labelled-run.ts";
import { listInlineEnumerationMarkers } from "./list-inline-enumeration-markers.ts";
import { listInterpunctJoinedRun } from "./list-interpunct-joined-run.ts";
import { listSemicolonDelimitedRun } from "./list-semicolon-delimited-run.ts";
import { listStackedInterpunctRuns } from "./list-stacked-interpunct-runs.ts";
import { phraseAiOverusedWord } from "./phrase-ai-overused-word.ts";
import { phraseArguingWithNoOne } from "./phrase-arguing-with-no-one.ts";
import { phraseAvoidedCopulaVerb } from "./phrase-avoided-copula-verb.ts";
import { phraseBorrowedAuthorityClaim } from "./phrase-borrowed-authority-claim.ts";
import { phraseDocumentSelfReference } from "./phrase-document-self-reference.ts";
import { phraseInflatedSignificanceClaim } from "./phrase-inflated-significance-claim.ts";
import { phraseNegativeContrastPair } from "./phrase-negative-contrast-pair.ts";
import { phraseSalesLanguageClaim } from "./phrase-sales-language-claim.ts";
import { phraseSayingsSoundDeep } from "./phrase-sayings-sound-deep.ts";
import { phraseShallowParticipleRider } from "./phrase-shallow-participle-rider.ts";
import { phraseStackedHedgeRun } from "./phrase-stacked-hedge-run.ts";
import { phraseStagedRunUp } from "./phrase-staged-run-up.ts";
import { phraseStockCloserLine } from "./phrase-stock-closer-line.ts";
import { phraseVagueConnectionLink } from "./phrase-vague-connection-link.ts";
import { punctuationCurlyQuoteInProse } from "./punctuation-curly-quote-in-prose.ts";
import { punctuationEmDashInProse } from "./punctuation-em-dash-in-prose.ts";
import { punctuationInterpunctInProse } from "./punctuation-interpunct-in-prose.ts";
import { punctuationSpacedDashInProse } from "./punctuation-spaced-dash-in-prose.ts";
import { residueChatbotWrapperPhrase } from "./residue-chatbot-wrapper-phrase.ts";
import { residueToolMarkupArtifact } from "./residue-tool-markup-artifact.ts";
import { residueUnfilledPlaceholderText } from "./residue-unfilled-placeholder-text.ts";
import { sentenceOnePerLine } from "./sentence-one-per-line.ts";
import { sentenceRepeatedOpeningRun } from "./sentence-repeated-opening-run.ts";
import { sentenceShortFragmentRun } from "./sentence-short-fragment-run.ts";
import { sentenceWordBudgetExceeded } from "./sentence-word-budget-exceeded.ts";
import { structureBoldLabelListItem } from "./structure-bold-label-list-item.ts";
import { structureEmojiInHeading } from "./structure-emoji-in-heading.ts";
import { structureHeadingRestatingSentence } from "./structure-heading-restating-sentence.ts";
import { structureThematicBreakDensity } from "./structure-thematic-break-density.ts";
import { structureTitleCaseHeading } from "./structure-title-case-heading.ts";
import type { Rule } from "./types.ts";

export const RULES: Rule[] = [
  sentenceOnePerLine,
  sentenceWordBudgetExceeded,
  listSemicolonDelimitedRun,
  punctuationEmDashInProse,
  punctuationInterpunctInProse,
  listInterpunctJoinedRun,
  listInlineEnumerationMarkers,
  listCommaLabelledRun,
  listStackedInterpunctRuns,
  residueToolMarkupArtifact,
  residueChatbotWrapperPhrase,
  residueUnfilledPlaceholderText,
  phraseAiOverusedWord,
  phraseStagedRunUp,
  phraseStockCloserLine,
  phraseInflatedSignificanceClaim,
  phraseSalesLanguageClaim,
  phraseNegativeContrastPair,
  phraseArguingWithNoOne,
  phraseVagueConnectionLink,
  phraseBorrowedAuthorityClaim,
  phraseSayingsSoundDeep,
  phraseDocumentSelfReference,
  phraseAvoidedCopulaVerb,
  phraseShallowParticipleRider,
  structureEmojiInHeading,
  structureThematicBreakDensity,
  structureTitleCaseHeading,
  structureHeadingRestatingSentence,
  structureBoldLabelListItem,
  sentenceRepeatedOpeningRun,
  punctuationSpacedDashInProse,
  punctuationCurlyQuoteInProse,
  phraseStackedHedgeRun,
  sentenceShortFragmentRun,
];

// The order fixers run in. Structure first: a promotion needs the separators
// a glyph swap would erase, so list-stacked-interpunct-runs and the list rules run before punctuation-interpunct-in-prose
// turns interpuncts into commas. Reflow runs last, over the settled blocks.
export const FIX_ORDER: Rule[] = [
  listStackedInterpunctRuns,
  listInlineEnumerationMarkers,
  listCommaLabelledRun,
  listInterpunctJoinedRun,
  listSemicolonDelimitedRun,
  punctuationInterpunctInProse,
  punctuationEmDashInProse,
  sentenceOnePerLine,
];
