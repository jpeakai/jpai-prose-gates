A release runs from the Publish workflow on main.
The workflow needs:

- a version bump
- a changelog entry
- a green build
- a signed tag

It then uploads the package to npm.
The tag starts the GitHub release.
The release notes come from the merged pull requests.
Nothing in that path runs from a laptop.
