import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

function setup(width = 1200) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><section class="card" style="height:400px"></section></body></html>', { pretendToBeVisual: true, url: "http://localhost/" });
  const w = dom.window;
  w.innerWidth = width; w.innerHeight = 800;
  w.matchMedia = (q) => ({ matches: q.includes("min-width") ? width >= parseInt(q.match(/(\d+)px/)[1], 10) : false, addEventListener() {}, removeEventListener() {} });
  Object.assign(globalThis, { window: w, document: w.document, getComputedStyle: w.getComputedStyle.bind(w), requestAnimationFrame: (cb) => setTimeout(cb, 16) });
  return dom;
}

test("mounts a trace and a rider with three poses, then cleans up on destroy", async () => {
  setup();
  const { createBuddy } = await import("../src/index.js");
  const b = createBuddy({ character: "bit" });
  assert.equal(b.enabled, true);
  assert.ok(document.querySelector(".sb-trace path"));
  assert.equal(document.querySelectorAll(".sb-pose").length, 3);
  assert.ok(document.getElementById("scroll-buddy-styles"));
  assert.ok(document.documentElement.classList.contains("sb-on"));
  b.destroy();
  assert.equal(document.querySelector(".sb-trace"), null);
  assert.equal(document.querySelector(".sb-layer"), null);
  assert.equal(document.documentElement.classList.contains("sb-on"), false);
});

test("stays off below minWidth", async () => {
  setup(500);
  const { createBuddy } = await import("../src/index.js?narrow");
  const b = createBuddy({ minWidth: 750 });
  assert.equal(b.enabled, false);
  b.destroy();
});

test("rejects unknown characters with a helpful error", async () => {
  setup();
  const { createBuddy } = await import("../src/index.js?err");
  assert.throws(() => createBuddy({ character: "nope" }), /unknown character/);
});

test("accepts a custom character and custom colors", async () => {
  setup();
  const { createBuddy } = await import("../src/index.js?custom");
  const b = createBuddy({ character: { poses: { walk: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>' } }, colors: { main: "#00f" }, injectStyles: false });
  assert.equal(document.querySelectorAll(".sb-pose").length, 3);
  assert.equal(document.getElementById("scroll-buddy-styles"), null);
  assert.equal(document.querySelector(".sb-layer").style.getPropertyValue("--sb-main"), "#00f");
  b.destroy();
});

test("follows scroll: moves along the trace, climbs when scrolling up, waves when idle, fires reactions", async () => {
  const dom = setup();
  const w = dom.window;
  Object.defineProperty(w.HTMLElement.prototype, "offsetWidth", { configurable: true, get() { return 1000; } });
  Object.defineProperty(w.HTMLElement.prototype, "offsetHeight", { configurable: true, get() { return 5000; } });
  Object.defineProperty(w.document.documentElement, "scrollHeight", { configurable: true, get() { return 5000; } });
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    const top = this.className.includes("card") ? 2400 - (w.pageYOffset || 0) : -(w.pageYOffset || 0);
    return { top, bottom: top + (this.className.includes("card") ? 400 : 5000), left: 0, right: 1000, width: 1000, height: 400 };
  };
  const { createBuddy } = await import("../src/index.js?scroll");
  const seen = [], reacted = [];
  const b = createBuddy({ character: "pip", idleWaveMs: 30, reactions: [{ selector: ".card", effect: (el) => reacted.push(el.className) }], onPose: (p) => seen.push(p) });
  const rider = document.querySelector(".sb-rider");
  const scrollTo = async (y) => { w.pageYOffset = y; w.dispatchEvent(new w.Event("scroll")); await new Promise((r) => setTimeout(r, 40)); };
  await scrollTo(100); const t1 = rider.style.transform;
  await scrollTo(2300); const t2 = rider.style.transform;
  assert.notEqual(t1, t2, "rider moved");
  assert.equal(reacted.length, 1, "card reaction fired once as the rider crossed it");
  await scrollTo(1500);
  assert.ok(seen.includes("climb"), "climbs when scrolling up");
  assert.equal(b.pose === "climb" || b.pose === "wave", true);
  b.destroy();
});

test("text glyph wakes such as </> render as text, SVG wakes as markup", async () => {
  setup();
  const { createBuddy } = await import("../src/index.js?wake");
  const b = createBuddy({ character: "bit" });
  const texts = [...document.querySelectorAll(".sb-wake")].map((n) => n.textContent);
  assert.ok(texts.includes("</>"), "glyph kept as text");
  b.destroy();
  const p = createBuddy({ character: "pip" });
  assert.ok(document.querySelector(".sb-wake svg"), "svg wake kept as markup");
  p.destroy();
});
