# Maintainer scripts

## Repository validation

- `check-project.mjs` validates licensing metadata, required notices, translation parity and production safeguards.
- `check-dist.mjs` validates the generated `dist/` directory and rejects source maps, development tuning controls or uncompressed `.wav` audio.

These scripts run through `npm run check`.

## Rain audio

`npm run audio:generate` synthesises the rain loop deterministically and writes an uncompressed WAV to `.audio-work/` (gitignored). That WAV is a build input; the site ships the AAC file at `public/audio/rain-loop.m4a`, which is about seven times smaller and is the only audio asset in `dist/`. The script prints the `afconvert` and `ffmpeg` commands needed to re-encode it.

## Social media utilities

- `inspect_video.swift` creates a contact sheet and metadata summary from a source video.
- `edit_social_video.swift` creates the maintained Hyeto social edit.

The Swift utilities require macOS with AVFoundation and AppKit. They are maintainer tools, are not imported by the website and do not affect the production bundle.
