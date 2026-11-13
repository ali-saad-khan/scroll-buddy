import { characters } from "./characters.js";
import { zigzagPath, samplePath, pointAt } from "./path.js";
import { progress, lean, createPoseState, sweepHit, createLatch } from "./motion.js";
import { injectStyles, css } from "./styles.js";

export { zigzagPath, samplePath, pointAt, progress, lean, createPoseState, sweepHit, createLatch, characters, css };

const NS = "http://www.w3.org/2000/svg";
const NOOP = Object.freeze({ destroy() {}, refresh() {}, enabled: false, pose: "walk" });
const isMarkup = (s) => typeof s === "string" && /^\s*<[a-z]/i.test(s);

/**
 * @typedef {Object} Reaction
 * @property {string} selector            CSS selector of elements to react
 * @property {string|((el: Element) => void)} [effect]  built-in effect (pop, tilt, bump, nudge, wobble, jitter, swing, flash) or your own function
 * @property {number} [pad]               extra px of reach around the element
 * @property {boolean} [xfree]            only test the vertical axis (default true)
 * @property {number} [duration]          ms the effect class stays on (default 900)
 */

/**
 * Creates a mascot that follows a zig-zag trace down the page as the user scrolls.
 * Safe to call during SSR (returns a no-op controller). Returns `{ destroy, refresh, enabled, pose }`.
 * @param {Object} [options]
 */
export function createBuddy(options = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return NOOP;
  const o = {
    character: "pip", path: null, swings: 9, edge: 6, bend: 0.55,
    trace: true, traceColor: null, traceWidth: 2, traceDash: "3 9", traceOpacity: 0.6,
    colors: null, size: null, spin: null, zIndex: 60, minWidth: 750,
    respectReducedMotion: true, idleWaveMs: 3000, wake: null, wakeDistance: 42,
    reactions: [], sound: false, container: null, injectStyles: true, glowOver: null,
    onPose: null, onReact: null, ...options,
  };
  const container = o.container || document.body;
  const def = typeof o.character === "string" ? characters[o.character] : o.character;
  if (!def || !def.poses || !def.poses.walk) throw new Error("scroll-buddy: unknown character. Use 'pip', 'bit' or { poses: { walk, climb?, wave? } }.");
  const size = o.size || def.size || 88;
  const spin = o.spin != null ? o.spin : def.spin != null ? def.spin : "lean";
  const wakeList = o.wake === "none" ? [] : (o.wake || def.wake || []).slice(0, 4);

  if (o.injectStyles) injectStyles();

  const mqWide = window.matchMedia(`(min-width: ${o.minWidth}px)`);
  const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => o.respectReducedMotion && mqMotion.matches;

  /* ---- DOM ---- */
  const thread = document.createElement("div");
  thread.className = "sb-trace"; thread.setAttribute("aria-hidden", "true"); thread.style.zIndex = String(o.zIndex - 58 > 0 ? o.zIndex - 58 : 2);
  const tsvg = document.createElementNS(NS, "svg");
  tsvg.setAttribute("viewBox", "0 0 100 1000"); tsvg.setAttribute("preserveAspectRatio", "none");
  const pathEl = document.createElementNS(NS, "path");
  const d = o.path || zigzagPath({ swings: o.swings, edge: o.edge, bend: o.bend });
  pathEl.setAttribute("d", d);
  pathEl.style.strokeWidth = String(o.traceWidth); pathEl.style.strokeDasharray = o.traceDash; pathEl.style.opacity = String(o.traceOpacity);
  if (o.traceColor) pathEl.style.stroke = o.traceColor;
  tsvg.appendChild(pathEl); thread.appendChild(tsvg);
  if (!o.trace) thread.style.visibility = "hidden";

  const layer = document.createElement("div");
  layer.className = "sb-layer"; layer.setAttribute("aria-hidden", "true"); layer.style.zIndex = String(o.zIndex);
  const rider = document.createElement("span");
  rider.className = "sb-rider"; rider.dataset.pose = "walk";
  ["walk", "climb", "wave"].forEach((p) => {
    const holder = document.createElement("span");
    holder.className = "sb-pose"; holder.dataset.for = p;
    holder.style.left = `${-size / 2}px`; holder.style.top = `${-size / 2}px`; holder.style.width = `${size}px`; holder.style.height = `${size}px`;
    holder.innerHTML = def.poses[p] || def.poses.walk;
    const svgEl = holder.querySelector("svg"); if (svgEl) { svgEl.setAttribute("width", String(size)); svgEl.setAttribute("height", String(size)); }
    rider.appendChild(holder);
  });
  layer.appendChild(rider);
  const wakes = wakeList.map((w) => {
    const s = document.createElement("span"); s.className = "sb-wake";
    if (isMarkup(w)) { s.innerHTML = w; s.style.margin = "-12px 0 0 -12px"; } else { s.textContent = w; s.style.margin = "-10px 0 0 -14px"; }
    layer.appendChild(s); return s;
  });
  if (o.colors) for (const k in o.colors) layer.style.setProperty(`--sb-${k}`, o.colors[k]);
  if (o.colors) for (const k in o.colors) thread.style.setProperty(`--sb-${k}`, o.colors[k]);
  if (o.colors && o.colors.main && !o.traceColor) thread.style.setProperty("--sb-trace", o.colors.main);

  /* ---- sampling ---- */
  const domSampler = (dd, steps) => {
    const tmp = document.createElementNS(NS, "path"); tmp.setAttribute("d", dd);
    const total = tmp.getTotalLength(), out = new Array((steps + 1) * 2);
    for (let i = 0; i <= steps; i++) { const p = tmp.getPointAtLength(total * i / steps); out[i * 2] = p.x; out[i * 2 + 1] = p.y; }
    return out;
  };
  const pts = samplePath(d, 400, domSampler);

  /* ---- audio (only after a real gesture) ---- */
  let actx = null;
  const arm = () => { if (actx) return; try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); } catch (e) { actx = null; } };
  const armEvents = ["pointerdown", "keydown", "touchstart"];
  if (o.sound) armEvents.forEach((ev) => window.addEventListener(ev, arm, { once: true, passive: true }));
  const blip = () => {
    if (!actx) return;
    try { if (actx.state === "suspended") actx.resume(); const t = actx.currentTime, os = actx.createOscillator(), g = actx.createGain(); os.type = "sine"; os.frequency.setValueAtTime(700, t); os.frequency.exponentialRampToValueAtTime(1050, t + 0.08); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.04, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); os.connect(g); g.connect(actx.destination); os.start(t); os.stop(t + 0.35); } catch (e) { /* silent */ }
  };

  /* ---- reactions ---- */
  const timers = new Set();
  const pulse = (el, cls, ms) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); const t = setTimeout(() => { el.classList.remove(cls); timers.delete(t); }, ms); timers.add(t); };
  let hits = [];
  const collect = () => {
    hits = [];
    o.reactions.forEach((r) => document.querySelectorAll(r.selector).forEach((el) => hits.push({ el, r, pad: r.pad || 0, xfree: r.xfree !== false, latch: createLatch(), rect: null })));
  };

  /* ---- measuring ---- */
  let docH = 1, vh = 1, tW = 1, tH = 1, tTop = 0, tLeft = 0, measured = 0;
  const glowZones = () => (o.glowOver ? [].slice.call(document.querySelectorAll(o.glowOver)) : []);
  let glow = [], glowRects = [];
  const measure = () => {
    const sy = window.pageYOffset || 0, sx = window.pageXOffset || 0;
    docH = Math.max(document.documentElement.scrollHeight, container.scrollHeight); vh = window.innerHeight;
    tW = thread.offsetWidth; tH = thread.offsetHeight;
    const tr = thread.getBoundingClientRect(); tTop = tr.top + sy; tLeft = tr.left + sx;
    hits.forEach((h) => { if (!h.el.isConnected) { h.rect = null; return; } const r = h.el.getBoundingClientRect(); h.rect = { top: r.top + sy, bottom: r.bottom + sy, left: r.left + sx, right: r.right + sx }; });
    glowRects = glow.map((g) => { const r = g.getBoundingClientRect(); return { top: r.top + sy, bottom: r.bottom + sy }; });
    measured = performance.now();
  };

  /* ---- frame ---- */
  const poseState = createPoseState();
  let prev = null, prevL = null, wi = 0, idle = null, lastX = 0, raf = false, active = false, currentPose = "walk";
  const setPose = (p) => { if (p !== currentPose) { currentPose = p; rider.dataset.pose = p; if (o.onPose) o.onPose(p); } };

  const place = () => {
    if (!active) return;
    if (performance.now() - measured > 1000) measure();
    const sy = window.pageYOffset || 0, prog = progress(sy, docH, vh), pt = pointAt(pts, prog);
    const lx = pt.x / 100 * tW, ly = pt.y / 1000 * tH;
    const rot = typeof spin === "number" ? prog * spin : lean(lx - lastX); lastX = lx;
    rider.style.transform = `translate3d(${lx.toFixed(1)}px,${ly.toFixed(1)}px,0) rotate(${rot.toFixed(1)}deg)`;
    const cur = { x: tLeft + lx, y: tTop + ly }, viewY = cur.y - sy;
    setPose(poseState.move(prog));
    clearTimeout(idle);
    idle = setTimeout(() => { if (viewY > 0 && viewY < vh) setPose(poseState.idle()); }, o.idleWaveMs);
    if (glowRects.length) layer.classList.toggle("sb-glow", glowRects.some((z) => cur.y > z.top && cur.y < z.bottom));
    if (prevL && wakes.length && Math.hypot(lx - prevL.x, ly - prevL.y) > o.wakeDistance) {
      const w = wakes[wi]; wi = (wi + 1) % wakes.length;
      w.style.transform = `translate3d(${prevL.x.toFixed(1)}px,${prevL.y.toFixed(1)}px,0)`; w.classList.remove("is-puff"); void w.offsetWidth; w.classList.add("is-puff");
    }
    prevL = { x: lx, y: ly };
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i]; if (!h.rect || !h.el.isConnected) continue;
      if (h.latch(sweepHit(prev, cur, h.rect, h.pad, h.xfree))) {
        const eff = h.r.effect;
        if (typeof eff === "function") eff(h.el); else pulse(h.el, `sb-fx-${eff || "pop"}`, h.r.duration || 900);
        if (o.sound && h.r.sound) blip();
        if (o.onReact) o.onReact(h.el, h.r);
      }
    }
    prev = cur;
  };
  const onScroll = () => { if (!raf) { raf = true; requestAnimationFrame(() => { place(); raf = false; }); } };
  const onResize = () => { evaluate(); if (active) { measure(); place(); } };
  const refresh = () => { collect(); glow = glowZones(); measure(); place(); };

  let restorePosition = null;
  const start = () => {
    if (active) return;
    active = true;
    if (!container.contains(thread)) { container.appendChild(thread); container.appendChild(layer); }
    if (getComputedStyle(container).position === "static") { container.style.position = "relative"; restorePosition = true; }
    document.documentElement.classList.add("sb-on");
    collect(); glow = glowZones(); measure(); place();
    window.addEventListener("scroll", onScroll, { passive: true });
  };
  const stop = () => {
    if (!active) return;
    active = false; window.removeEventListener("scroll", onScroll); clearTimeout(idle);
    document.documentElement.classList.remove("sb-on");
  };
  const evaluate = () => { (mqWide.matches && !reduced()) ? start() : stop(); };

  window.addEventListener("resize", onResize);
  window.addEventListener("load", refresh);
  mqMotion.addEventListener && mqMotion.addEventListener("change", evaluate);
  let ro = null;
  if ("ResizeObserver" in window) { ro = new ResizeObserver(() => { if (active) measure(); }); ro.observe(document.body); }
  evaluate();

  return {
    get enabled() { return active; },
    get pose() { return currentPose; },
    refresh,
    destroy() {
      stop();
      window.removeEventListener("resize", onResize); window.removeEventListener("load", refresh);
      mqMotion.removeEventListener && mqMotion.removeEventListener("change", evaluate);
      armEvents.forEach((ev) => window.removeEventListener(ev, arm));
      if (ro) ro.disconnect();
      timers.forEach(clearTimeout); timers.clear();
      thread.remove(); layer.remove();
      if (restorePosition) container.style.position = "";
    },
  };
}

export default createBuddy;
