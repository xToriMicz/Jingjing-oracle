# CLAUDE_safety.md — Critical Safety Rules

> **Navigation**: [Main](CLAUDE.md) | **Safety**

## Git Operations — FORBIDDEN
- NEVER `git push --force` or `git push -f`
- NEVER `git checkout -f`
- NEVER `git clean -f`
- NEVER `git commit --amend` (breaks multi-agent hash tracking)
- NEVER `git rebase -i` (rewrites history → orphans all agents)
- NEVER `git reset --hard` on agent worktrees
- NEVER push directly to main — always feature branch + PR
- NEVER merge PRs without human approval
- NEVER create issues/PRs on upstream repos

## Why --amend Breaks Everything

In multi-agent setup:
1. Main has commit `abc123`
2. All agents sync → they have `abc123`
3. You amend → Main now has `def456`
4. Agents still have `abc123` (different hash)
5. Future merges get confused forever

**Rule: ALWAYS create NEW commits, NEVER rewrite history**

## PR Workflow (Required)
1. Create feature branch: `git checkout -b feat/description`
2. Make changes and commit
3. Push branch: `git push -u origin feat/description`
4. Create PR: `gh pr create`
5. **WAIT** for human to review and approve
6. Human merges when ready

## File Operations
- NEVER `rm -rf` without backup
- NEVER create temp files outside repo — use `.tmp/` directory (gitignored)
- Always confirm before deleting files

## Multi-Agent Sync
- Use `maw sync` to sync agents safely
- Always `git status` before sync
- Respect other agents' uncommitted work
- To sync: `git fetch origin && git rebase origin/main`

## Deploy Safety
- ALWAYS check current state before deploying (fetch เว็บ, ดู git log)
- NEVER deploy over existing content without backup
- NEVER overwrite another Oracle's work without coordination

## Package Manager
- Never `install --force`
- Always review lockfile changes before committing
