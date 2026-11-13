export type PoseName = "walk" | "climb" | "wave";
export type BuiltInEffect = "pop" | "tilt" | "bump" | "nudge" | "wobble" | "jitter" | "swing" | "flash";

export interface Character {
  /** Pixel size of the character (default 88). */
  size?: number;
  /** SVG (or HTML) markup per pose. `walk` is required, missing poses fall back to it. */
  poses: { walk: string; climb?: string; wave?: string };
  /** Things dropped behind the character: plain text/glyphs, or markup if it starts with `<`. Max 4. */
  wake?: string[];
  /** Total rotation in degrees over the whole page (e.g. 720 for a rolling character) or "lean" to tilt with the direction of travel. */
  spin?: number | "lean";
}

export interface Reaction {
  /** CSS selector of elements that should react as the character passes. */
  selector: string;
  /** A built-in effect, or your own function. Default "pop". */
  effect?: BuiltInEffect | ((el: Element) => void);
  /** Extra px of reach around the element. */
  pad?: number;
  /** Test only the vertical axis (default true). Set false to require a real overlap. */
  xfree?: boolean;
  /** Milliseconds the effect class stays applied (default 900). */
  duration?: number;
  /** Play the blip sound for this reaction (needs `sound: true`). */
  sound?: boolean;
}

export interface BuddyColors { main?: string; accent?: string; ink?: string; bg?: string; warn?: string; trace?: string }

export interface BuddyOptions {
  /** Built-in character name or your own definition. Default "pip". */
  character?: "pip" | "bit" | Character;
  /** Custom path in a 100 x 1000 viewBox. Absolute M/C paths work anywhere; other commands need a browser. Default: generated zig-zag. */
  path?: string | null;
  /** Number of edge-to-edge crossings of the generated path (default 9). */
  swings?: number;
  /** How close to the page edges the path runs, in viewBox units 0-50 (default 6). */
  edge?: number;
  /** Curve tension 0.1-0.95 (default 0.55). */
  bend?: number;
  /** Draw the dashed trace (default true). */
  trace?: boolean;
  traceColor?: string | null;
  traceWidth?: number;
  traceDash?: string;
  traceOpacity?: number;
  /** Override the theme colours (maps to --sb-* CSS variables). */
  colors?: BuddyColors | null;
  /** Override the character size in px. */
  size?: number | null;
  spin?: number | "lean" | null;
  zIndex?: number;
  /** Only run at or above this viewport width (default 750). */
  minWidth?: number;
  /** Switch off for prefers-reduced-motion (default true, strongly recommended). */
  respectReducedMotion?: boolean;
  /** How long to stand still on screen before waving (default 3000 ms). */
  idleWaveMs?: number;
  /** Replace the character's wake, or "none". */
  wake?: string[] | "none" | null;
  /** Distance in px between wake drops (default 42). */
  wakeDistance?: number;
  reactions?: Reaction[];
  /** Enable the soft blip (only starts after a real user gesture). */
  sound?: boolean;
  /** Element the trace is mounted in (default document.body). It should span the page height. */
  container?: HTMLElement | null;
  /** Inject the default stylesheet. Turn off if your CSP forbids it and import "scroll-buddy/style.css" yourself. */
  injectStyles?: boolean;
  /** Selector of dark sections: the character gets a glow while over them. */
  glowOver?: string | null;
  onPose?: (pose: PoseName) => void;
  onReact?: (el: Element, reaction: Reaction) => void;
}

export interface Buddy {
  readonly enabled: boolean;
  readonly pose: PoseName;
  /** Re-measure and re-collect reaction targets (call after big layout changes). */
  refresh(): void;
  /** Remove everything and all listeners. */
  destroy(): void;
}

export function createBuddy(options?: BuddyOptions): Buddy;
export default createBuddy;

export const characters: { pip: Character; bit: Character };
export const css: string;
export function zigzagPath(o?: { swings?: number; edge?: number; bend?: number }): string;
export function samplePath(d: string, steps?: number, domSampler?: (d: string, steps: number) => ArrayLike<number>): Float64Array;
export function pointAt(pts: ArrayLike<number>, prog: number): { x: number; y: number };
export function progress(scrollY: number, docHeight: number, viewportHeight: number): number;
export function lean(dx: number, strength?: number, max?: number): number;
export function createPoseState(eps?: number): { readonly pose: PoseName; move(prog: number): PoseName; idle(): PoseName; force(p: PoseName): PoseName };
export function sweepHit(prev: { x: number; y: number } | null, cur: { x: number; y: number }, rect: { top: number; bottom: number; left: number; right: number }, pad?: number, xfree?: boolean): boolean;
export function createLatch(): (inside: boolean) => boolean;
