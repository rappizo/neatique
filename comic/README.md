# Comic Workspace

This folder is the local comic-production workspace for Neatique.

- `characters/` stores stable character reference notes and fixed visual folders.
- `scenes/` stores reusable location notes and master scene definitions.
- `story-bible/` stores the long-form canon, season plans, and world rules.
- `seasons/` stores the working folders for every season, chapter, and episode.
- `templates/` stores starter files for future comic planning.

## Scene-reference rule

- Character model sheets stay in `characters/<slug>/refs/`.
- Reusable location rules can stay in `scenes/<slug>/`.
- Chapter-specific scene artwork should be stored inside the chapter folder under `scene-refs/`.

Example:

`seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/`

The website reads comic publishing data from the database. This workspace exists so Codex and your local repo can keep the long-form creative materials organized.
