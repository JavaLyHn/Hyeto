# Architecture

Rainform is a client-only Vite application. No server runtime, database or secret environment variable is required.

## Startup lifecycle

1. `index.html` renders the application shell and mobile landscape gate.
2. `src/bootstrap.js` selects Chinese or English, prepares rain audio and delays the WebGL bundle while a phone is in portrait.
3. `src/main.js` creates the Three.js scene after the viewport is eligible.
4. Viewport and orientation events update layout without initializing a second scene.

## Rendering model

The 25 values from 00:00 through 24:00 are the single source of truth for visual rainfall. Derived systems include:

- axis geometry and selected-hour feedback;
- rain chains, ambient rain and downpour sampling;
- peak waterfall geometry and materials;
- water, glints, impacts and ripple fields;
- sound intensity and editor feedback.

Seeded random generators keep the composition stable across rebuilds. Avoid replacing seeded paths with `Math.random()` where deterministic layout matters.

## Interaction model

- Dragging the main view changes the orbit camera.
- Double-click resets the camera.
- The rainfall editor previews curve changes and rebuilds systems after input.
- Audio playback uses intent and source tokens to prevent overlapping sources during rapid toggles.
- Rainfall edits are session-only by design; refresh restores the built-in curve.

## Production boundary

`ENABLE_TUNING_CONSOLE` must remain bound to `import.meta.env.DEV`. Vite builds are minified without source maps. `scripts/check-dist.mjs` prevents publication when the tuning panel or source-map references are present.

## Change strategy

`src/main.js` is intentionally kept intact for the initial public-source release to avoid changing the validated visual result. Future modularization should proceed subsystem by subsystem with deterministic screenshot and interaction regression checks.
