# Contributing to Rainform

Thanks for helping improve Rainform. This project treats visual behavior as product behavior: rendering, timing, composition, text and responsive layout changes require the same care as functional changes.

## Before starting

Open an issue before a substantial change. Explain the user problem, affected viewport and intended behavior. Purely subjective visual restyling may be declined to protect Rainform's art direction.

## Development

```bash
npm ci
npm run dev
npm run check
```

Keep the production tuning console development-only. Do not enable source maps, commit generated `dist/` files, add remote runtime dependencies or weaken the production security headers without a documented reason.

## Pull requests

- Keep each pull request focused.
- Describe user-visible impact and implementation risk.
- Include screenshots for 390×844, 844×390, 1366×768 and 1920×1080 when layout or rendering changes.
- Test portrait/landscape transitions, drag, double-click reset, editor, language, sound and refresh behavior when relevant.
- Preserve Chinese and English translation parity.
- Add or update documentation when behavior or integration contracts change.
- Confirm `npm run check` passes.

By submitting a contribution, you agree to license that contribution under the repository's PolyForm Noncommercial License 1.0.0 and to preserve the required notice. Do not submit code, media or data that you do not have permission to contribute.
