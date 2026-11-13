import { test } from "node:test";
import assert from "node:assert/strict";
import { zigzagPath, parseCubics, samplePath, pointAt, VIEW_H } from "../src/path.js";
import { progress, lean, createPoseState, sweepHit, createLatch } from "../src/motion.js";

test("zigzagPath builds a parseable M/C path that starts at the top and ends at the bottom", () => {
  const d = zigzagPath({ swings: 5 });
  const segs = parseCubics(d);
  assert.ok(segs && segs.length >= 5);
  assert.equal(segs[0][0][1], 0);
  assert.equal(segs.at(-1)[3][1], VIEW_H);
});

test("zigzagPath alternates sides and respects edge", () => {
  const segs = parseCubics(zigzagPath({ swings: 4, edge: 10 }));
  const ends = segs.slice(0, 4).map((s) => s[3][0]);
  assert.deepEqual(ends, [90, 10, 90, 10]);
});

test("samplePath returns evenly spaced points from top to bottom", () => {
  const pts = samplePath(zigzagPath({ swings: 6 }), 200);
  assert.equal(pts.length, 402);
  assert.equal(pts[1], 0);
  assert.ok(Math.abs(pts[401] - VIEW_H) < 1e-6);
  const gaps = [];
  for (let i = 1; i <= 200; i++) gaps.push(Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]));
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  assert.ok(gaps.every((g) => Math.abs(g - mean) < mean * 0.15), "constant speed along the path");
});

test("pointAt clamps and interpolates", () => {
  const pts = samplePath(zigzagPath(), 100);
  assert.equal(pointAt(pts, -1).y, 0);
  assert.ok(Math.abs(pointAt(pts, 2).y - VIEW_H) < 1e-6);
  const mid = pointAt(pts, 0.5);
  assert.ok(mid.y > 300 && mid.y < 700);
});

test("samplePath rejects non-M/C paths without a DOM sampler", () => {
  assert.throws(() => samplePath("M 0 0 L 10 10"), /need a browser/);
  const pts = samplePath("M 0 0 L 10 10", 2, () => [0, 0, 5, 5, 10, 10]);
  assert.equal(pts.length, 6);
});

test("progress is clamped 0..1", () => {
  assert.equal(progress(-50, 3000, 800), 0);
  assert.equal(progress(1100, 3000, 800), 0.5);
  assert.equal(progress(99999, 3000, 800), 1);
  assert.equal(progress(10, 500, 800), 0);
});

test("lean is clamped", () => {
  assert.equal(lean(1000), 16);
  assert.equal(lean(-1000), -16);
  assert.equal(lean(10, 0.5), 5);
});

test("pose machine walks down, climbs up, waves when idle", () => {
  const s = createPoseState();
  assert.equal(s.move(0.1), "walk");
  assert.equal(s.move(0.2), "walk");
  assert.equal(s.move(0.15), "climb");
  assert.equal(s.move(0.15), "climb", "no movement keeps the pose");
  assert.equal(s.idle(), "wave");
  assert.equal(s.move(0.3), "walk");
});

test("sweepHit catches a fast flick through an element", () => {
  const rect = { top: 500, bottom: 600, left: 100, right: 300 };
  assert.equal(sweepHit({ x: 50, y: 100 }, { x: 60, y: 900 }, rect, 0, true), true);
  assert.equal(sweepHit({ x: 50, y: 100 }, { x: 60, y: 400 }, rect, 0, true), false);
  assert.equal(sweepHit({ x: 50, y: 100 }, { x: 60, y: 900 }, rect, 0, false), false, "x must overlap when xfree is false");
  assert.equal(sweepHit(null, { x: 150, y: 550 }, rect, 0, false), true);
  assert.equal(sweepHit(null, { x: 150, y: 610 }, rect, 20, true), true, "pad extends the reach");
});

test("latch fires once per pass and re-arms when clear", () => {
  const l = createLatch();
  assert.equal(l(true), true);
  assert.equal(l(true), false);
  assert.equal(l(false), false);
  assert.equal(l(true), true);
});
