# Quran Habit Codex Docs v2

Copy:

- `AGENTS.md` to the repository root.
- every file under `docs/` to the repository `docs/` directory.

Review paths if the repository currently uses `doc/` instead of `docs/`; choose one convention and update references consistently.

The main prompt to paste into Codex is:

```text
Read AGENTS.md and every Markdown file under docs/. Then execute docs/CODEX_NEXT_MILESTONE_PROMPT.md. Inspect the repository first, preserve T1–T15, and do not perform unrelated UI redesign.
```

Recommended first Codex action:

1. review the docs against the current repository;
2. report conflicts or stale file paths;
3. run the baseline test/validation suite;
4. only then begin T16.
