# scroll-buddy

A tiny mascot that **crawls down a zig-zag trace as you scroll**. It walks down, climbs back up, waves when you stop, leaves a wake behind it and pokes your page as it passes: cards tilt, inputs jitter, headings wobble.

- **Zero dependencies**, framework-free (works in React, Vue, Svelte, Astro or plain HTML)
- **Two built-in characters**: Pip (a citrus slice) and Bit (a little server bot). Bring your own with a few SVG strings
- **Reactions** for any element, using built-in effects or your own function
- **Accessible by default**: off for `prefers-reduced-motion` and on small screens, purely decorative (`aria-hidden`, never intercepts clicks)
- **Cheap per frame**: the path is sampled once, layout is measured off the scroll path, one `requestAnimationFrame` per scroll event
- **SSR safe**, ~17 KB minified, TypeScript types included

## Install

```bash
npm install scroll-buddy
```

```js
import { createBuddy } from "scroll-buddy";

const buddy = createBuddy({ character: "pip" });
// later: buddy.destroy()
```

Without a bundler:

```html
<script src="https://unpkg.com/scroll-buddy"></script>
<script>ScrollBuddy.createBuddy({ character: "bit" });</script>
```

## Make it yours

```js
createBuddy({
  character: "bit",                       // "pip" | "bit" | your own (see below)
  colors: { main: "#0F4D3A", bg: "#fff", ink: "#0B1511", warn: "#B3361A" },
  swings: 7,                              // how many times the trace crosses the page
  glowOver: ".dark-section",              // glow while over dark backgrounds
  reactions: [
    { selector: ".card", effect: "tilt" },
    { selector: "input", effect: "jitter", pad: 30 },
    { selector: "h2", effect: (el) => el.classList.add("seen") },   // or your own function
  ],
  sound: true,                            // soft blip (only after a user gesture)
});
```

Built-in effects: `pop`, `tilt`, `bump`, `nudge`, `wobble`, `jitter`, `swing`, `flash`.

### Options

| Option | Default | What it does |
|---|---|---|
| `character` | `"pip"` | `"pip"`, `"bit"` or a custom [character](#custom-characters) |
| `swings`, `edge`, `bend` | `9`, `6`, `0.55` | Shape of the generated zig-zag |
| `path` | generated | Your own path in a `100 x 1000` viewBox. Absolute `M`/`C` paths work anywhere |
| `trace`, `traceColor`, `traceWidth`, `traceDash`, `traceOpacity` | on | The dashed line itself |
| `colors` | theme | `main`, `accent`, `ink`, `bg`, `warn`, `trace` (CSS variables `--sb-*`) |
| `size`, `spin` | per character | Pixel size. `spin` is total degrees over the page, or `"lean"` to tilt with travel |
| `idleWaveMs` | `3000` | Stand still this long on screen and the buddy waves |
| `wake`, `wakeDistance` | per character | What gets dropped behind it (`"none"` to disable) |
| `reactions` | `[]` | Elements that react as the buddy passes |
| `minWidth` | `750` | Only runs at or above this viewport width |
| `respectReducedMotion` | `true` | Off for `prefers-reduced-motion: reduce` (please keep this on) |
| `container`, `zIndex` | `body`, `60` | Where it mounts and how it stacks |
| `injectStyles` | `true` | Set `false` if your CSP forbids injected `<style>` and import `scroll-buddy/style.css` instead |
| `onPose`, `onReact` | none | Callbacks |

`createBuddy()` returns `{ enabled, pose, refresh(), destroy() }`. Call `refresh()` after big layout changes.

## Custom characters

A character is three SVG strings (walk, climb, wave). Only `walk` is required.

```js
createBuddy({
  character: {
    size: 80,
    spin: 720,                      // a rolling character; omit for "lean"
    poses: {
      walk: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" class="sb-fill-main"/></svg>`,
      climb: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" class="sb-fill-accent"/></svg>`,
      wave:  `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" class="sb-fill-ink"/></svg>`,
    },
    wake: ["✦", "·"],               // glyphs, or SVG markup starting with <svg
  },
});
```

Colour your SVG with the helper classes `sb-fill-main|accent|ink|bg|warn` and `sb-stroke-main|ink` so it follows the `colors` option. Pose markup is inserted as HTML, so only pass markup you trust.

## Content Security Policy

The library sets styles through the CSSOM and never writes inline `style` attributes into markup. The one thing a strict `style-src` can block is the stylesheet it injects, so use:

```js
import "scroll-buddy/style.css";
createBuddy({ injectStyles: false });
```

## Accessibility notes

- The trace and character are `aria-hidden` and `pointer-events: none`, so they never get in the way of the page.
- Motion is disabled for visitors who prefer reduced motion.
- Reaction effects only add and remove classes, so you stay in control of what changes.

## Develop

```bash
npm install
npm test        # pure-logic tests plus jsdom integration tests
npm run build   # dist/: cjs, iife and css
open examples/index.html   # demo with a character switcher
```

## License

MIT
