---
name: verbo
description: Add or complete a validated English verb entry with its Spanish translation. Use when the user invokes $verbo with an infinitive.
---

# Generate a verb entry

1. Work from the repository root.
2. Treat the first positional argument after `$verbo` as `$1`, the infinitive. Ask for it when missing.
3. Read `.claude/commands/verbo.md`, ignore its YAML frontmatter, and use the Markdown body as the canonical workflow.
4. Replace every literal `$1` in that body with the parsed value.
5. Treat any `/name` command reference in the body as the matching `$name` repository skill when running in Codex.
6. Follow the resulting instructions completely, including their merge and validation steps.
