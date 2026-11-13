/* Built-in characters. All artwork is original and themed through CSS variables:
   --sb-main, --sb-accent, --sb-ink, --sb-bg, --sb-warn */
const svg = (inner, w = 100, h = 100, box = "0 0 100 100") =>
  `<svg viewBox="${box}" width="${w}" height="${h}" focusable="false" aria-hidden="true">${inner}</svg>`;

/* ---- Pip: a citrus slice ---- */
const pipBody = `
  <circle cx="50" cy="50" r="38" class="sb-fill-main sb-stroke-ink" stroke-width="4"/>
  <circle cx="50" cy="50" r="31" fill="#FFF1D2"/><circle cx="50" cy="50" r="27" class="sb-fill-main" opacity=".85"/>
  <g fill="#FFC38F" opacity=".9"><path d="M50 50 L50 25 A25 25 0 0 1 68 32 Z"/><path d="M50 50 L72 38 A25 25 0 0 1 75 56 Z"/><path d="M50 50 L72 66 A25 25 0 0 1 56 74 Z"/><path d="M50 50 L44 74 A25 25 0 0 1 28 64 Z"/><path d="M50 50 L26 58 A25 25 0 0 1 28 36 Z"/><path d="M50 50 L32 32 A25 25 0 0 1 46 25 Z"/></g>
  <circle cx="41" cy="46" r="3.6" class="sb-fill-ink"/><circle cx="59" cy="46" r="3.6" class="sb-fill-ink"/>
  <path d="M40 58 Q50 68 60 58" fill="none" class="sb-stroke-ink" stroke-width="3.4" stroke-linecap="round"/>`;
const limb = (d) => `<path d="${d}" class="sb-stroke-ink" stroke-width="5" stroke-linecap="round" fill="none"/>`;

export const pip = {
  size: 88,
  poses: {
    walk: svg(pipBody + limb("M38 86 L30 98 M62 86 L72 96") + limb("M12 54 L2 64 M88 54 L98 46"), 88, 88, "-2 -2 104 104"),
    climb: svg(pipBody + limb("M40 86 L36 98 M60 86 L68 94") + limb("M14 40 L6 22 M86 40 L96 24"), 88, 88, "-2 -2 104 104"),
    wave: svg(pipBody + limb("M40 86 L36 98 M60 86 L64 98") + limb("M12 58 L2 70") + `<g class="sb-arm">${limb("M88 46 L98 22")}</g>`, 88, 88, "-2 -2 104 104"),
  },
  wake: [
    svg(`<circle cx="12" cy="12" r="9" class="sb-fill-main sb-stroke-ink" stroke-width="2"/>`, 24, 24, "0 0 24 24"),
    svg(`<path d="M12 2l3 7 7 .6-5.4 4.6 1.7 7.2L12 17.8 5.7 21.4l1.7-7.2L2 9.6 9 9z" class="sb-fill-accent sb-stroke-ink" stroke-width="1.6" stroke-linejoin="round"/>`, 24, 24, "0 0 24 24"),
    svg(`<path d="M2 12c3-6 5 6 8 0s5 6 8 0" fill="none" class="sb-stroke-ink" stroke-width="2.6" stroke-linecap="round"/>`, 24, 24, "0 0 24 24"),
  ],
  spin: 720,
};

/* ---- Bit: a little server bot ---- */
const bitBody = `
  <line x1="44" y1="8" x2="40" y2="0" class="sb-stroke-main" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="40" cy="0" r="3" class="sb-fill-warn sb-blink"/>
  <rect x="20" y="8" width="48" height="52" rx="9" class="sb-fill-bg sb-stroke-main" stroke-width="3"/>
  <rect x="27" y="15" width="34" height="26" rx="5" class="sb-fill-ink sb-stroke-main" stroke-width="1.5"/>
  <rect x="33" y="22" width="5" height="8" rx="1" class="sb-fill-main"/><rect x="50" y="22" width="5" height="8" rx="1" class="sb-fill-main"/>
  <path d="M36 35 H52" class="sb-stroke-main" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  <rect x="28" y="46" width="6" height="3" rx="1.5" class="sb-fill-warn"/><rect x="38" y="46" width="6" height="3" rx="1.5" class="sb-fill-warn"/><rect x="48" y="46" width="6" height="3" rx="1.5" class="sb-fill-warn"/>`;
const bitLimb = (d) => `<path d="${d}" class="sb-stroke-main" stroke-width="4.5" stroke-linecap="round" fill="none"/>`;
const BOX = "-6 -6 100 90";
export const bit = {
  size: 92,
  poses: {
    walk: svg(bitBody + bitLimb("M32 60 L26 76 M56 60 L64 74") + bitLimb("M20 34 L8 44 M68 34 L82 28"), 92, 82, BOX),
    climb: svg(bitBody + bitLimb("M34 60 L30 76 M54 60 L58 74") + bitLimb("M22 30 L10 12 M66 30 L78 12") + `<circle cx="10" cy="12" r="3" class="sb-fill-warn"/><circle cx="78" cy="12" r="3" class="sb-fill-warn"/>`, 92, 82, BOX),
    wave: svg(bitBody + bitLimb("M34 60 L32 76 M54 60 L56 76") + bitLimb("M20 34 L8 46") + `<g class="sb-arm">${bitLimb("M68 32 L82 8")}</g>`, 92, 82, BOX),
  },
  wake: ["{ }", "</>", ";", "=>"],
  spin: "lean",
};

export const characters = { pip, bit };
