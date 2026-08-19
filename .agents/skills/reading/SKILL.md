---
name: reading
description: Generate a validated English reading with learner-facing Spanish support. Use when the user invokes $reading with a topic and learner level.
---

# Generate a reading

1. Work from the repository root.
2. Parse the text after `$reading` as two positional arguments, respecting quoted values: `$1` is the topic and `$2` is the level. Ask for any missing argument before continuing.
3. Read `.claude/commands/reading.md`, ignore its YAML frontmatter, and use the Markdown body as the canonical workflow.
4. Replace every literal `$1` and `$2` in that body with the corresponding parsed value.
5. Treat any `/name` command reference in the body as the matching `$name` repository skill when running in Codex.
6. Follow the resulting instructions completely, including their merge and validation steps.
