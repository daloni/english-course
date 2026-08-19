---
name: clips
description: Generate validated learning clips from ingested sentence candidates. Use when the user invokes $clips with an optional candidate file or --all.
---

# Generate clips

1. Work from the repository root.
2. Treat the text after `$clips` as the value of `$ARGUMENTS`; use an empty string when no arguments follow the skill name.
3. Read `.claude/commands/clips.md`, ignore its YAML frontmatter, and use the Markdown body as the canonical workflow.
4. Replace every literal `$ARGUMENTS` in that body with the parsed value.
5. Treat any `/name` command reference in the body as the matching `$name` repository skill when running in Codex.
6. Follow the resulting instructions completely, including their merge and validation steps.
