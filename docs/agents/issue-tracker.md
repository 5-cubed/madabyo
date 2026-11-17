# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `5-cubed/madabyo`.
Use the `gh` CLI, targeting `5-cubed/madabyo` explicitly as shown below.

## Operations

- Create: `gh issue create --repo 5-cubed/madabyo --title "..." --body-file <file>`.
- Read: `gh issue view <number> --repo 5-cubed/madabyo --json number,title,body,labels,comments`.
- List: `gh issue list --repo 5-cubed/madabyo --state open --json number,title,body,labels`.
- Label: `gh issue edit <number> --repo 5-cubed/madabyo --add-label "..."` or `--remove-label "..."`.
- Comment: `gh issue comment <number> --repo 5-cubed/madabyo --body-file <file>`.
- Close: post the explanation as a comment, then run `gh issue close <number> --repo 5-cubed/madabyo`.

Use native GitHub sub-issues and issue dependencies when supported.
Otherwise, put `Part of #<parent>` and `Blocked by: #<number>` at the
top of child issue bodies. A ticket is unblocked when all blockers close.

Before creating the first issue in a session, verify the target with
`gh repo view 5-cubed/madabyo --json nameWithOwner`.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Skill terminology

“Publish to the issue tracker” means create a GitHub issue.
“Fetch the relevant ticket” means read the GitHub issue.
