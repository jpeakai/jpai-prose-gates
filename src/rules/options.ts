// Options the list run rules share. Each run rule takes a minItems option,
// read the same way by its check and its fix so the two never disagree about
// how long a run must be. The registry has already checked it is a whole
// number of at least 2, the fewest items a list can hold.

import type { RuleOptions } from "./types.ts";

export const MIN_ITEMS = { minItems: "number" } as const;

export const minItemsOf = (options: RuleOptions, fallback: number): number =>
  typeof options.minItems === "number" ? options.minItems : fallback;
