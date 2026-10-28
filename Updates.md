# BarQ — Updates

This is the shared, chronological project change log. It follows the append-only approach used by Dhamantaha and NIO-Book.

## Rules

1. **Append only.** Never delete, overwrite, reorder, or silently edit an existing update. If something needs correction, append another entry.
2. Add an entry whenever implementation, documentation, testing, deployment, or project decisions change.
3. Use the actual local date and time in **Asia/Riyadh** (`YYYY-MM-DD HH:mm`). Do not guess a timestamp.
4. Record what changed, why (when relevant), validation/results, and anything not completed or verified.
5. Attribute the **tool** and **developer** responsible for the work. Never claim another developer's work as your own.
6. Do not put passwords, tokens, API keys, personal data, or other secrets in updates.
7. Keep this file synchronized across `main` and all active branches. `main` is the canonical copy; reconcile concurrent appended entries without dropping any.

## Entry template

```markdown
## YYYY-MM-DD HH:mm (Asia/Riyadh)

**Update:** Briefly describe the work, decisions, and files affected.

**Validation:** Tests or checks run, or "Not run" with a reason.

**Open items:** What remains, or "None".

Tool: <tool name> — Developer: <developer name>
```

## 2026-10-28 15:04 (Asia/Riyadh)

**Update:** Established the three root-level shared documentation files for BarQ: `Updates.md` (append-only change history), `Plan.md` (project roadmap and decisions), and `Part.md` (ownership and team handoffs). The format of this log was informed by the Dhamantaha and NIO-Book update logs. Published the starting documents to `main` for distribution to the existing branches.

**Validation:** Documentation-only initialization; no application tests run.

**Open items:** Confirm product requirements, technical implementation details, task owners, and milestone dates.

Tool: ChatGPT — Developer: Unassigned (documentation initialization requested by repository owner)
