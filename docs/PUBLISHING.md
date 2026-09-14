# Publishing

How `@jpeakai/prose-gates` gets to npm.
Every release after the first goes through the Publish workflow in GitHub Actions, with no npm token anywhere.
The decision behind it is [PRS-0013](../adrs/0013-releases-publish-from-github-actions.md).

## Speed run

Use this for every release once the one-time setup below is done.

```sh
make ci                                  # the full local gate, including the decision bundle
npm version patch --no-git-tag-version   # or minor, major, or prerelease --preid=rc
git commit -am "Release v$(node -p "require('./package.json').version")"
git push origin main
gh workflow run publish.yml --ref main
gh run watch "$(gh run list --workflow=publish.yml --limit 1 --json databaseId -q '.[0].databaseId')"
npm view @jpeakai/prose-gates version    # confirm the new version is live
```

The workflow creates the tag and the GitHub release itself, so never tag by hand.
A version containing `alpha`, `beta` or `rc` publishes under that npm dist-tag and is marked a prerelease.

## What the workflow does

1. `prepare` reads the version from `package.json` on `main` and pins that commit.
2. It stops if the tag, the GitHub release or the npm version already exists.
3. It creates a draft GitHub release with generated notes.
4. `publish-npm` checks out the pinned commit and runs `npm publish --provenance`.
5. npm runs `prepublishOnly`, which is `make check`, then `prepack`, which is `make build`.
6. `finalize-release` flips the draft to published once npm has accepted the package.

## One-time setup

These steps were needed once, for the first version.
They are kept so the next package in this org can repeat them.

### 1. Create the npm org

Create the `jpeakai` organisation on npmjs.com.
The free plan allows unlimited public packages.

### 2. Publish the first version by hand

npm attaches a trusted publisher to a package that already exists, so the first version is uploaded from a laptop.

```sh
npm login                      # opens the browser, and 2FA is required
npm whoami                     # confirm the account is a member of jpeakai
make ci                        # the full local gate
npm publish --access public    # runs make check and make build first
```

A local publish cannot carry provenance, and that is expected for this one version.

### 3. Record the release on GitHub

The workflow did not create this version, so tag it to match what later runs produce.

```sh
gh release create "v$(node -p "require('./package.json').version")" --target main --generate-notes
```

### 4. Add the trusted publisher

On npmjs.com, open the package, then Settings, then Trusted Publisher, and choose GitHub Actions.

| Field | Value |
|---|---|
| Organization or user | `jpeakai` |
| Repository | `jpai-prose-gates` |
| Workflow filename | `publish.yml` |
| Environment | leave empty |

The workflow filename is only the file name, never the `.github/workflows/` path.

### 5. Lock publishing to the workflow

In the same package settings, open Publishing access.
Choose the option that requires two-factor authentication and disallows tokens.
From then on only the workflow can publish, and a leaked token cannot.

### 6. Prove it

Bump to the next patch version and run the speed run above.
The package page on npmjs.com should show a provenance badge that links to the workflow run.

## When it fails

| Symptom | Cause and fix |
|---|---|
| `Release vX already exists` | Bump the version in `package.json`, or delete the release with `gh release delete vX --cleanup-tag --yes`. |
| `already on npm` | npm never lets a version be reused, even after an unpublish, so bump the version. |
| `E404` or `ENEEDAUTH` on publish | The trusted publisher does not match: check the repository name and that the workflow filename is exactly `publish.yml`. |
| `E403` on publish | The npm account or the trusted publisher has no rights in the `jpeakai` org. |
| Provenance error | The repository must be public, and the job needs `id-token: write`. |
| `make check` fails in the publish job | The same failure shows in the CI workflow, so fix it on `main` first. |
| A draft release is left behind | The npm step failed after `prepare`. Delete the draft with `gh release delete vX --cleanup-tag --yes`, fix the cause, and run again. |

## Why the gates differ

`make ci` also renders the decision bundle with the meta CLI, which lives in a private repo.
GitHub Actions cannot install it without a credential, so CI and `prepublishOnly` run `make check` instead.
Run `make ci` locally before every release, since it is the only gate that catches a stale bundle.
