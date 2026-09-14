// Indexed access on an array a guard has already proved non-empty.
//
// `noUncheckedIndexedAccess` is on, so `xs[0]` is `T | undefined` even three
// lines after `if (xs.length < 2) continue`. The assertion lives here, once,
// rather than scattered through the fixers as `(xs[0] as Marker)` noise at
// exactly the points where the logic is hardest to follow.
//
// Every caller guards first. Calling either on an empty array is a bug in the
// caller, not a case to handle here.

export const first = <T>(xs: readonly T[]): T => xs[0] as T;

export const last = <T>(xs: readonly T[]): T => xs[xs.length - 1] as T;
