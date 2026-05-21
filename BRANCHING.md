# Branching workflow

All project changes should happen on a work branch and be merged only after approval.

## Start work

```sh
scripts/start-branch.sh short-change-name
```

This creates a branch named `work/short-change-name` from `main`.

## Submit for approval

Share the branch or diff for review. Do not merge it yourself until it is approved.

## Merge after approval

After approval, switch to `main` and run:

```sh
scripts/merge-approved.sh work/short-change-name --approved-by "Reviewer Name"
```

The merge commit records the approver in the commit message.

## Local guardrails

The tracked hooks in `.githooks/` block direct commits to `main`/`master` and block ordinary merges into `main`/`master`.
