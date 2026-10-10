// phrase-stock-closer-line: a one-sentence paragraph that tells the reader how to feel about the paragraph
// before it ("That is the real win."). A longer sentence that merely contains the words is left alone.
// A short paragraph that repeats under several sections is not reported: API reference text repeats
// short descriptions on purpose, and calibration on public READMEs showed it only produced noise.

import { scan } from "../lexicon.ts";
import { STOCK_CLOSER } from "../lexicons/stock-closer.ts";
import { lineWithin, tellFinding, tellParagraphs } from "../tells.ts";
import { sentences } from "../text.ts";
import { type Finding, RULE, type Rule } from "./types.ts";

const check: Rule["check"] = ({ doc, file }) => {
  const found: Finding[] = [];
  for (const view of tellParagraphs(doc)) {
    const [only, ...rest] = sentences(view.prose);
    if (only === undefined || rest.length > 0) continue;
    const bare = only.replace(/[.!?]+$/, "").trim();
    const hit = scan(STOCK_CLOSER, only)[0];
    if (hit && hit.index === 0 && hit.text.length === bare.length) {
      found.push(
        tellFinding(RULE.STOCK_CLOSER, file, lineWithin(view, bare), {
          what: "stock closer line",
          evidence: only,
          instruction: "Cut the line. If it holds a fact the paragraph lacks, put the fact in the paragraph.",
        }),
      );
    }
  }
  return found;
};

export const phraseStockCloserLine: Rule = {
  id: RULE.STOCK_CLOSER,
  category: "phrase",
  summary: 'a stock one-line closer such as "That is the real win."',
  check,
};
