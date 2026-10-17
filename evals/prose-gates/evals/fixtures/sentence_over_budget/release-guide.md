# Release guide

A release starts from a green build on main.
When the maintainer has bumped the version in the manifest and pushed the signed tag, the Publish workflow builds the Node bundle, runs the full test suite against both supported runtimes, and uploads the package to the registry, which then serves it to every consumer that pins a compatible range.
The workflow never runs from a laptop.
