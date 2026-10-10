// phrase-staged-run-up: An opener such as "Let's dive in" that announces the point or stages a moment of candour.

import { STAGED_RUN_UP } from "../lexicons/staged-run-up.ts";
import { lexiconRule } from "../tells.ts";
import { RULE } from "./types.ts";

export const phraseStagedRunUp = lexiconRule({
  id: RULE.STAGED_RUN_UP,
  category: "phrase",
  summary: "a stock opener that announces the point instead of making it",
  defaultSeverity: "warn",
  lexicon: STAGED_RUN_UP,
  what: "stock run-up before the point",
  instruction: "Remove the run-up and state the point itself.",
});
