// The rule catalogue, in id order. To add a rule: write one module exporting
// a Rule with its category, register it here, and add its section and
// examples to RULES.md, which tests/rules-doc.test.ts holds to the code.

import { pg001 } from "./pg001-wrap.ts";
import { pg002 } from "./pg002-length.ts";
import { pg003 } from "./pg003-semicolon-list.ts";
import { pg004 } from "./pg004-em-dash.ts";
import { pg005 } from "./pg005-interpunct.ts";
import { pg006 } from "./pg006-interpunct-run.ts";
import { pg007 } from "./pg007-inline-enum.ts";
import { pg008 } from "./pg008-labelled-run.ts";
import { pg009 } from "./pg009-stacked-runs.ts";
import type { Rule } from "./types.ts";

export const RULES: Rule[] = [pg001, pg002, pg003, pg004, pg005, pg006, pg007, pg008, pg009];

// The order fixers run in. Structure first: a promotion needs the separators
// a glyph swap would erase, so PG009 and the list rules run before PG005
// turns interpuncts into commas. Reflow runs last, over the settled blocks.
export const FIX_ORDER: Rule[] = [pg009, pg007, pg008, pg006, pg003, pg005, pg004, pg001];
