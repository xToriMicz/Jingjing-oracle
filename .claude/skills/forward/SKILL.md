---
installer: oracle-skills-cli v2.0.8
origin: Nat Weerawan's brain, digitized — how one human works with AI, captured as code — Soul Brews Studio
name: forward
description: v2.0.8 G-SKLL | Create handoff + enter plan mode for next session. Use when user says "forward", "handoff", "wrap up", or before ending session.
---

# /forward - Handoff to Next Session

Create context for next session, then enter plan mode to define next steps.

## Usage

```
/forward              # Create handoff, show plan, wait for approval
/forward asap         # Create handoff + commit immediately (no approval needed)
/forward --only       # Create handoff only, skip plan mode
```

## Steps

1. **Git status**: Check uncommitted work
2. **Session summary**: What we did (from memory)
3. **Pending items**: What's left
4. **Next steps**: Specific actions

## Output

Resolve vault path first:
```bash
PSI=$(readlink -f ψ 2>/dev/null || echo "ψ")
```

Write to: `$PSI/inbox/handoff/YYYY-MM-DD_HH-MM_slug.md`

**IMPORTANT**: Always use the resolved `$PSI` path, never the `ψ/` symlink directly.
This ensures handoffs go to the project's vault (wherever ψ points).
Do NOT `git add` vault files — they are shared state, not committed to repos.

```markdown
# Handoff: [Session Focus]

**Date**: YYYY-MM-DD HH:MM
**Context**: [%]

## What We Did
- [Accomplishment 1]
- [Accomplishment 2]

## Pending
- [ ] Item 1
- [ ] Item 2

## Next Session
- [ ] Specific action 1
- [ ] Specific action 2

## Key Files
- [Important file 1]
- [Important file 2]
```

## Then: Plan Mode for Approval

**Do NOT commit the handoff file** — it lives in the vault, not the repo.
After writing the handoff:

1. **Call `EnterPlanMode`** tool
3. In plan mode, write a plan file with:
   - What we accomplished this session
   - Pending items carried forward
   - Next session goals and scope
   - Reference to handoff file path
4. **Call `ExitPlanMode`** — user sees the built-in plan approval UI

The user gets the standard plan approval screen with options to approve, modify, or reject. This is the proper way to show plans.

If user calls `/forward` again — just show the existing plan, do not re-create the handoff file.

## ASAP Mode

If user says `/forward asap` or `/forward now`:
- Write handoff file
- **Immediately commit and push** — no approval needed
- Skip plan mode
- User wants to close fast

## Skip Plan Mode

If user says `/forward --only`:
- Skip plan mode after commit
- Just tell user: "💡 Run /plan to plan next session"

ARGUMENTS: $ARGUMENTS
