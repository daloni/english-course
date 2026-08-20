---
name: verb
description: Add or complete a validated English verb entry with its Spanish translation. Use when the user invokes $verb with an infinitive.
---

# Generate a verb entry

1. Work from the repository root.
2. Treat the first positional argument after `$verb` as `$1`, the infinitive. Ask for it when missing.
3. Read `.claude/commands/verbo.md`, ignore its YAML frontmatter, and use the Markdown body as the canonical workflow.
4. Replace every literal `$1` in that body with the parsed value.
5. When running in Codex, translate command references using this map: `/frases` → `$sentences`, `/teoria` → `$theory`, `/verbo` → `$verb`, `/clips` → `$clips`, and `/reading` → `$reading`.
6. Follow the resulting instructions completely, including their merge and validation steps.
