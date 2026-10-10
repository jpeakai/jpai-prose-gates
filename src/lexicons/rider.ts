// A participle phrase bolted onto a plain fact to make it sound deeper (humanizer pattern 15). The
// pattern is a comma followed by one of the participles, because the same word at the start of a
// clause is ordinary. A participle in technical writing is often honest, so the rule starts off.

import type { Lexicon } from "../lexicon.ts";

export const RIDER: Lexicon = {
  id: "rider",
  reviewed: "2026-10-10",
  sources: ["blader/humanizer 3.1.0 (MIT), pattern 15"],
  entries: [
    {
      pattern:
        "(?<=,\\s)(?:highlighting|underscoring|emphasi[sz]ing|ensuring|reflecting|symboli[sz]ing|contributing to|cultivating|fostering|showcasing)",
    },
  ],
};
