# Maintainer scripts

## Repository validation

- `check-project.mjs` validates licensing metadata, required notices, translation parity and production safeguards.
- `check-dist.mjs` validates the generated `dist/` directory and rejects source maps or development tuning controls.

These scripts run through `npm run check` and GitHub Actions.

## Social media utilities

- `inspect_video.swift` creates a contact sheet and metadata summary from a source video.
- `edit_social_video.swift` creates the maintained Rainform social edit.

The Swift utilities require macOS with AVFoundation and AppKit. They are maintainer tools, are not imported by the website and do not affect the production bundle.
