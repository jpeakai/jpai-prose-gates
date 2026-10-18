The parser reads each markdown file once.
It builds a syntax tree that every rule shares.
Parsing twice would let two rules disagree about the tree.

Releases publish from GitHub Actions on main.
A release needs a signed tag and a green build.
The publish workflow refuses to run from a branch.

Plugins load on their own from the project folder.
