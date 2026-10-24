# Ticketing

This repo tracks work items in GitHub Issues.
A GitHub Issue may be shortened to "GH Issue".

## Who Am I

Identity matters in a repo with more than one contributor.

Read both the `git` config and the `gh` CLI login, and check they name the same person before filtering to them.

```sh
git config user.name
git config user.email
gh api user -q .login
```

## Backlog

Issues fall into two categories:

- Bugs
- Features

More categories may be added over time.

Each issue title starts with its category prefix, and carries the matching label:

| Category | Title prefix | Label |
|---|---|---|
| Bug | `[bug]` | `bug` |
| Feature | `[feat]` | `enhancement` |

The categories help decide which kind of work to pick up next.

The owner of this repo is `neozenith`, and every issue is assigned to them.

```sh
gh issue create --title "[feat] {title}" --label enhancement --assignee neozenith --body-file {body}
```

## Deduplication

Before creating an issue, search open and closed issues for the same work.

```sh
gh issue list --state all --search "{key words} in:title,body" --json number,title,state,createdAt --limit 50
```

The earliest issue is the **canonical** issue.
Every later issue for the same work is closed as a duplicate of it, never the other way round.

```sh
gh issue close {duplicate} --duplicate-of {canonical}
```

The canonical issue keeps a count of its duplicates in one tracking comment, edited in place rather than added to:

```text
Duplicates: 2
- #31
- #35
```

Create the comment on the first duplicate.
Edit it for each later one, raising the count and adding the issue number.

When a duplicate sheds new light on the work, rewrite the canonical issue's title and body into a refined version.
GH Issues keeps every edit of the body in its history, so nothing is lost.

```sh
gh issue edit {canonical} --title "{refined title}" --body-file {refined body}
```

Emoji reactions on the canonical issue are upvotes.
Anyone who hits the same need reacts with 👍 instead of filing a new issue.
An issue's **demand** is its duplicate count plus its total reactions.

## Relationships

Issues are linked with the GH Issues `blocked by` and `blocking` relationships, so the backlog forms a DAG of the work.

- An issue that cannot start until another is done is `blocked by` it.
- The graph stays acyclic, so before adding a link, check the blocker is not already blocked by the issue, directly or transitively.
- When creating an issue, ask whether it is blocked by or blocking any open issue, and link it then.

```sh
gh issue create ... --blocked-by 12,14 --blocking 20
gh issue edit 23 --add-blocked-by 12
gh issue edit 23 --remove-blocked-by 12
gh issue list --state open --json number,title,labels,blockedBy,blocking --limit 200
```

An issue is **ready** when every issue it is blocked by is CLOSED.

To choose the next piece of work, take the ready issues in dependency order, the topological order of the DAG.
Among ready issues, prefer the one blocking the most open work.
Then prefer `[bug]` before `[feat]`, then the highest demand, then the lowest issue number.

## Works In Progress (WIP)

Work in progress is at one of three stages:

1. A feature branch, with no PR yet
2. A draft PR
3. An open PR

When work starts, the branch is named after its issue:

| Category | Branch |
|---|---|
| Bug | `fix/PRS-{issue_number}-{4 words description in kebab-case}` |
| Feature | `feat/PRS-{issue_number}-{4 words description in kebab-case}` |

The PR title follows the same pattern:

| Category | PR title |
|---|---|
| Bug | `[bug] PRS-{issue_number} {4 words description}` |
| Feature | `[feat] PRS-{issue_number} {4 words description}` |

The PR body names its issue as `Closes #{issue_number}`.

A release bump has no issue, so its branch keeps the `release-v{version}` name that [docs/PUBLISHING.md](docs/PUBLISHING.md) gives it.

Work on an open issue happens in a new git worktree, named `PRS-{issue_number}-{4 words description in kebab-case}`.
Worktrees are sibling directories of the main checkout, never inside it.

```sh
git worktree add -b feat/PRS-{issue_number}-{description} ../PRS-{issue_number}-{description} main
```

## Completed Work

When a PR is MERGED, its branch is cleaned up and its GH Issue is CLOSED.
When a PR is CLOSED unmerged, its branch is cleaned up and its GH Issue stays OPEN.
When an issue is CLOSED, its git worktrees and branches can be cleaned up.
