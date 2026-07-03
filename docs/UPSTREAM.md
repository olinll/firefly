# Upstream

This repository is a personal fork of **[CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly)**, a feature-rich static blog theme built on Astro 6 + Svelte 5. Local customizations will be applied on top of upstream updates.

## Modification rule (must follow)

Any git history operation that would **conflict with or diverge from the upstream repository** (e.g. `git reset --hard upstream/master`, `git rebase` against upstream, `git merge --allow-unrelated-histories`, `git read-tree` to re-squash, `git push --force-with-lease` after such operations, `git filter-repo`, cherry-picks that feed back into `master`, etc.) **must not be executed without an explicit human approval**. The required workflow is:

1. **Analyze** — state which upstream commits / branches are involved, which local commits would be affected (dropped / replayed / rewritten), current `origin/master` vs `upstream/master` tree diff, and what each candidate strategy would do.
2. **Present options** — show the user the available strategies (see "Syncing with upstream" below) with a recommendation.
3. **Wait for explicit confirmation** of a specific strategy before running any destructive command.
4. **Execute** the approved command only, and surface any unexpected output immediately.

This rule exists to prevent silent loss of local history or unintended history shape changes.

## How this fork was created

The local `master` is a **squash import** of upstream `master` at the time of forking: one single "Initial commit" whose file tree is byte-identical to the upstream tip, but which shares **no commit ancestors** with the upstream history. This is intentional — it gives a clean local history to build personal customizations on, decoupled from upstream's commit graph.

Practical consequence: `git rev-list --left-right --count origin/master...upstream/master` will always report "1 ahead / N behind" for any N upstream commits, but `git diff origin/master upstream/master` should remain empty until either side changes.

## Remotes

| Remote | URL | Role |
| --- | --- | --- |
| `origin` | `https://github.com/olinll/firefly.git` | This personal fork — push local work here |
| `upstream` | `https://github.com/CuteLeaf/Firefly.git` | Upstream source — fetch from here |

Verify with:

```bash
git remote -v
```

## State at time of recording (2026-07-03)

| Ref | Commit | Note |
| --- | --- | --- |
| `origin/master` | `7ab77d88` | "Initial commit" — squash import of upstream tip |
| `upstream/master` | `592419b0` | "fix: Build error (#461)" — latest upstream tip |
| Tree diff (`origin/master` vs `upstream/master`) | **empty** | content is identical at recording time |

Other notable upstream branches (for awareness, not auto-tracked):

- `astro-v5api`
- `TailwindCSS-v4`
- `feat/anime`
- `feat/font-api-migration`
- `feat/sidebar-hide-on-post`
- `overlayscrollbars`
- `pages`

## Verifying alignment

A quick health check — these should all return empty output while the local tree tracks upstream:

```bash
git fetch upstream
git diff upstream/master..origin/master            # working tree vs upstream
git diff upstream/master..HEAD                     # committed local vs upstream
```

If either shows non-empty output, the local tree has diverged from upstream and needs a sync (see below).

## Syncing with upstream

> ⚠️ All of the commands below are **history-modifying operations that conflict with upstream**. Per the [Modification rule](#modification-rule-must-follow) at the top of this document, do not run any of them without first analyzing the impact, presenting the options, and getting explicit user confirmation.

Because the two histories share no ancestors, plain `git merge` and `git rebase` behave unusually. Choose the strategy that matches your intent.

### Strategy A — Replace local master with upstream tip (cleanest, loses local commits)

Use this if you have **no local customizations** to keep, or have already moved them to a separate branch.

```bash
git fetch upstream
git checkout master
git reset --hard upstream/master
git push origin master --force-with-lease
```

This makes `master` a direct copy of upstream's real history, ending the "1 ahead / N behind" divergence report. Future syncs become normal fast-forwards.

### Strategy B — Keep local commit, replay upstream on top (preserves local as a fork point)

Use this if you want to **keep the "Initial commit" as a base** and add upstream's full history on top of it, then layer your customizations above that.

```bash
git fetch upstream
git checkout -b sync/upstream-$(date +%Y%m%d)
git merge upstream/master --allow-unrelated-histories -m "Sync upstream CuteLeaf/Firefly"
git push origin sync/upstream-YYYYMMDD
# After review, fast-forward master and clean up
git checkout master
git merge --ff-only sync/upstream-YYYYMMDD
git push origin master
git branch -d sync/upstream-YYYYMMDD
```

This produces a merge commit on `master` that joins your squashed base with the full upstream history. The local tree is unchanged (since both sides agreed at the time of import), so no conflicts.

### Strategy C — Stay on the squashed base, treat upstream as a foreign source

Use this if you want to **periodically re-squash upstream** into a single new "Initial commit"-style snapshot, keeping history shallow.

```bash
git fetch upstream
git checkout -b sync/upstream-$(date +%Y%m%d)
git read-tree -u upstream/master
git commit -m "Sync upstream CuteLeaf/Firefly ($(git rev-parse --short upstream/master))"
# Then rebase your personal feature branches onto this new base.
```

### Recommended

**Strategy A** is the simplest and most aligned with how the upstream itself manages history. Migrate to it the first time you do a sync, unless there's a specific reason to preserve the current squashed-base model.

## Conflict / merge policy (once on Strategy A or B)

- **Upstream changes to configs (`src/config/*`, `astro.config.mjs`, `package.json`)** — prefer upstream's version, then re-apply any personal customizations.
- **Upstream changes to `src/content/posts/*`** — keep local content; the fork's blog posts should not be overwritten.
- **Upstream changes to `.github/`, CI, or build scripts** — take upstream as-is.
- **Any conflict you cannot resolve** — surface it before committing; do not silently drop upstream changes.

After any sync, run:

```bash
pnpm install
pnpm type-check
pnpm build
```

## Tracking upstream activity

- Upstream repo: <https://github.com/CuteLeaf/Firefly>
- Upstream commits: <https://github.com/CuteLeaf/Firefly/commits/master>
- Upstream releases: <https://github.com/CuteLeaf/Firefly/releases>

To see what's new upstream since the last sync:

```bash
git fetch upstream
git log --oneline upstream/master -20
```
