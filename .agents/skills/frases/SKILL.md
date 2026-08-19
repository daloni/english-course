---
name: frases
description: Generate validated gap-fill sentences for an existing tense. Use when the user invokes $frases with a tense, learner level, and sentence count.
---

# Generate sentences

1. Work from the repository root.
2. Parse the text after `$frases` as three positional arguments, respecting quoted values: `$1` is the tense, `$2` is the level, and `$3` is the sentence count. Ask for any missing argument before continuing.
3. Read `.claude/commands/frases.md`, ignore its YAML frontmatter, and use the Markdown body as the canonical workflow.
4. Replace every literal `$1`, `$2`, and `$3` in that body with the corresponding parsed value.
5. Treat any `/name` command reference in the body as the matching `$name` repository skill when running in Codex.
6. Follow the resulting instructions completely, including their merge and validation steps.
