---
name: teoria
description: Write or extend validated Spanish theory for an English tense. Use when the user invokes $teoria with a tense slug.
---

# Generate tense theory

1. Work from the repository root.
2. Treat the first positional argument after `$teoria` as `$1`, the tense slug. Ask for it when missing.
3. Read `.claude/commands/teoria.md`, ignore its YAML frontmatter, and use the Markdown body as the canonical workflow.
4. Replace every literal `$1` in that body with the parsed value.
5. Treat any `/name` command reference in the body as the matching `$name` repository skill when running in Codex.
6. Follow the resulting instructions completely, including their merge and validation steps.
