/** Scroll progress from 0 (top) to 1 (bottom). */
export function progress(scrollY, docHeight, viewportHeight) {
  if (docHeight <= viewportHeight) return 0;
  return Math.max(0, Math.min(1, scrollY / Math.max(1, docHeight - viewportHeight)));
}

/** Lean angle (degrees) from horizontal travel, clamped. */
export function lean(dx, strength = 0.6, max = 16) {
  return Math.max(-max, Math.min(max, dx * strength));
}

/**
 * Pose state machine. Scrolling down = "walk", scrolling up = "climb", standing still on screen for a while = "wave".
 * Pure, so it can be tested without a browser.
 */
export function createPoseState(eps = 0.0003) {
  let last = -1, pose = "walk";
  return {
    get pose() { return pose; },
    /** Feed the latest scroll progress. Returns the (possibly new) pose. */
    move(prog) {
      if (last >= 0) { if (prog > last + eps) pose = "walk"; else if (prog < last - eps) pose = "climb"; }
      last = prog;
      return pose;
    },
    /** Call when the idle timer fires and the character is on screen. */
    idle() { pose = "wave"; return pose; },
    force(p) { pose = p; return pose; },
  };
}

/**
 * Did the character's swept path since the last frame touch the rect? Testing the swept box (not just the current point)
 * means a fast flick still connects.
 * @param {{x:number,y:number}|null} prev
 * @param {{x:number,y:number}} cur
 * @param {{top:number,bottom:number,left:number,right:number}} rect  document coordinates
 * @param {number} pad
 * @param {boolean} xfree  when true only the vertical axis is tested
 */
export function sweepHit(prev, cur, rect, pad = 0, xfree = true) {
  const a = prev || cur;
  const x0 = Math.min(a.x, cur.x), x1 = Math.max(a.x, cur.x), y0 = Math.min(a.y, cur.y), y1 = Math.max(a.y, cur.y);
  return y1 > rect.top - pad && y0 < rect.bottom + pad && (xfree || (x1 > rect.left - pad && x0 < rect.right + pad));
}

/** One-shot-per-pass arming: fires when entering, re-arms once clear of the element. */
export function createLatch() {
  let armed = true;
  return (inside) => {
    if (inside && armed) { armed = false; return true; }
    if (!inside && !armed) armed = true;
    return false;
  };
}
