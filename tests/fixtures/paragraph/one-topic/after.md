The fix engine applies every verified edit in a fixed rule order.
Each edit names the rule that proposed it and the expectation it claims.
The engine reparses the document after each edit and compares the trees.
A tree that changed shape sends the edit back as a refusal.

The engine keeps looping until no rule proposes a verifiable edit.
That loop ends at stable text, which the engine writes once.
A second fix run over stable text proposes no edit at all.
