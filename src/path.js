/** The trace lives in a 100 x 1000 viewBox that is stretched over the whole page. */
export const VIEW_W = 100;
export const VIEW_H = 1000;

/**
 * Generates a smooth zig-zag: S-curves that sweep from one edge to the other and back.
 * @param {{swings?: number, edge?: number, bend?: number}} [o]
 *   swings: number of crossings, edge: how close to the sides (0-50), bend: curve tension (0.2-0.9)
 * @returns {string} an SVG path using only M and C commands
 */
export function zigzagPath({ swings = 9, edge = 6, bend = 0.55 } = {}) {
  const n = Math.max(1, Math.round(swings));
  const e = Math.min(49, Math.max(0, edge));
  const b = Math.min(0.95, Math.max(0.1, bend));
  const stepY = VIEW_H / (n + 0.4);
  let x0 = e, y0 = 0;
  let d = `M ${x0} ${y0}`;
  for (let i = 0; i < n; i++) {
    const x1 = i % 2 === 0 ? VIEW_W - e : e;
    const y1 = Math.min(VIEW_H, (i + 1) * stepY);
    const dy = y1 - y0;
    d += ` C ${x0} ${r(y0 + dy * b)}, ${x1} ${r(y1 - dy * b)}, ${x1} ${r(y1)}`;
    x0 = x1; y0 = y1;
  }
  d += ` C ${x0} ${r(y0 + (VIEW_H - y0) * 0.5)}, ${x0} ${r(VIEW_H - (VIEW_H - y0) * 0.1)}, ${x0} ${VIEW_H}`;
  return d;
}
const r = (v) => Math.round(v * 100) / 100;

const SIMPLE = /^[\sMCmc\d.,eE+-]+$/;

/** Parses absolute M/C-only paths. Returns an array of cubic segments, or null if the path is not that simple. */
export function parseCubics(d) {
  if (!SIMPLE.test(d) || /[mc]/.test(d)) return null;
  const tokens = d.match(/[MC]|-?\d*\.?\d+(?:e[+-]?\d+)?/gi);
  if (!tokens) return null;
  const segs = [];
  let i = 0, cur = null;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === "M") { cur = [+tokens[i + 1], +tokens[i + 2]]; i += 3; }
    else if (t === "C") {
      i++;
      while (i < tokens.length && tokens[i] !== "M" && tokens[i] !== "C") {
        const v = tokens.slice(i, i + 6).map(Number);
        if (v.length < 6 || v.some(Number.isNaN) || !cur) return null;
        segs.push([cur, [v[0], v[1]], [v[2], v[3]], [v[4], v[5]]]);
        cur = [v[4], v[5]]; i += 6;
      }
    } else return null;
  }
  return segs.length ? segs : null;
}

const cubic = (s, t) => {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * s[0][0] + b * s[1][0] + c * s[2][0] + d * s[3][0], a * s[0][1] + b * s[1][1] + c * s[2][1] + d * s[3][1]];
};

/**
 * Samples a path into `steps + 1` points evenly spaced by arc length, so the character moves at a constant speed along the line.
 * Uses pure maths for M/C paths; any other path needs a DOM `getPointAtLength` (pass `domSampler`).
 * @param {string} d
 * @param {number} [steps]
 * @param {(d: string, steps: number) => Float64Array | number[]} [domSampler]
 * @returns {Float64Array} flat [x0, y0, x1, y1, ...]
 */
export function samplePath(d, steps = 400, domSampler) {
  const segs = parseCubics(d);
  if (!segs) {
    if (!domSampler) throw new Error("scroll-buddy: custom paths other than absolute M/C need a browser (SVGPathElement).");
    return Float64Array.from(domSampler(d, steps));
  }
  const dense = [], cum = [0];
  const PER = 40;
  segs.forEach((s, si) => {
    for (let k = si === 0 ? 0 : 1; k <= PER; k++) {
      const p = cubic(s, k / PER);
      if (dense.length) { const q = dense[dense.length - 1]; cum.push(cum[cum.length - 1] + Math.hypot(p[0] - q[0], p[1] - q[1])); }
      dense.push(p);
    }
  });
  const total = cum[cum.length - 1];
  const out = new Float64Array((steps + 1) * 2);
  let j = 0;
  for (let i = 0; i <= steps; i++) {
    const target = total * i / steps;
    while (j < cum.length - 2 && cum[j + 1] < target) j++;
    const span = cum[j + 1] - cum[j] || 1, t = Math.min(1, Math.max(0, (target - cum[j]) / span));
    out[i * 2] = dense[j][0] + (dense[j + 1][0] - dense[j][0]) * t;
    out[i * 2 + 1] = dense[j][1] + (dense[j + 1][1] - dense[j][1]) * t;
  }
  return out;
}

/** Linear lookup into a sampled path. `prog` is 0 to 1. */
export function pointAt(pts, prog) {
  const steps = pts.length / 2 - 1;
  const f = Math.min(1, Math.max(0, prog)) * steps;
  const i = Math.min(steps - 1, Math.floor(f)), t = f - i;
  return { x: pts[i * 2] + (pts[i * 2 + 2] - pts[i * 2]) * t, y: pts[i * 2 + 1] + (pts[i * 2 + 3] - pts[i * 2 + 1]) * t };
}
