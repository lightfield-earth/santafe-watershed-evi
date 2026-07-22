// Single source of truth for the EVI color pipeline: transfer function -> isoluminant palette.
//
// Both composite modes (MapLibre multiply, Oklab shader) sample the SAME 4096-entry lookup table
// built here, so any difference Chris sees between them is the compositing and nothing else.
// The whole value->color mapping lives in JS rather than in GLSL for exactly that reason: one
// implementation, readable, and the classed/continuous switch is a two-line change instead of a
// second shader.

// ---- Oklab <-> sRGB ---------------------------------------------------------------------
const srgbToLinear = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const linearToSrgb = (c) => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

export function oklabToLinearRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  return [ 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
          -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
}

const inGamut = ([r, g, b]) => r >= -1e-4 && g >= -1e-4 && b >= -1e-4 &&
                               r <= 1 + 1e-4 && g <= 1 + 1e-4 && b <= 1 + 1e-4;

/** Largest in-gamut chroma at this L* and hue, by binary search. `ceil` bounds the search: pass
 *  the chroma you actually want and you get back min(want, gamut), which is the clamp; pass a
 *  generous bound and you get the true ceiling, which is what the slider max needs. */
export function maxChromaAt(L, hDeg, ceil = 0.4) {
  const h = hDeg * Math.PI / 180;
  const fits = (c) => inGamut(oklabToLinearRgb(L, c * Math.cos(h), c * Math.sin(h)));
  if (fits(ceil)) return ceil;
  let lo = 0, hi = ceil;
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
  return lo;
}

/** LCh in Oklab -> 8-bit sRGB, reducing chroma (never lightness) until the hue fits in sRGB.
 *  Clamping C rather than clipping RGB is what keeps the ramp's lightness *exactly* as specified:
 *  RGB clipping silently moves L*, which would quietly destroy the property under test. */
export function oklchToSrgb8(L, C, hDeg) {
  const h = hDeg * Math.PI / 180;
  const c = maxChromaAt(L, hDeg, C);
  return oklabToLinearRgb(L, c * Math.cos(h), c * Math.sin(h))
    .map((v) => Math.round(Math.min(1, Math.max(0, linearToSrgb(Math.min(1, Math.max(0, v))))) * 255));
}

// ---- the palette ------------------------------------------------------------------------
// HUE carries the sequence, sweeping warm (low EVI: bare rock, dry grass) -> green (high EVI:
// closed conifer canopy), at constant chroma. Lightness is NOT constant: `dL` tilts it, see below.
// The palette started strictly isoluminant and that turned out to be the wrong premise — the
// history is in docs/FINDINGS.md §4 and is the main result of this experiment.
//
// L* = 0.785 is the measured optimum FOR THIS TILT: scanning candidate centers and taking the
// worst-case in-gamut chroma anywhere along the ramp (not just at its ends, which is what produced
// an earlier wrong rule), +0.25 peaks at 0.785 and holds C = 0.1565 there. The optimum moves with
// the tilt's SIGN — under negative tilt it is 0.655, because then the warm end is the light one
// and warm hues run out of chroma high while green does not. Re-scan if you change either.
export const PALETTE = { L: 0.785, C: 0.132, h0: 38, h1: 148, dL: 0.25 };

/** The chroma ceiling for a palette: the largest C that is in gamut *everywhere* along the ramp.
 *  Above it the per-hue clamp bites somewhere and the ramp stops being iso-CHROMA — the arc goes
 *  lumpy, which reads as a stripe of dullness rather than as a smooth sequence.
 *
 *  This has to be computed, not written down. The ceiling is set by whichever point on the arc is
 *  worst, and BOTH the tilt and its sign move which point that is: at dL = +0.25 the binding
 *  constraint is one place, at -0.25 another, because the tilt decides whether the warm end or the
 *  green end is the light one. A hardcoded constant was wrong every time either slider moved.
 *  The sampling is deliberately dense-ish — the worst point is often mid-arc, not at an endpoint. */
export const maxChroma = (p = PALETTE, samples = 64) => {
  let worst = Infinity;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    worst = Math.min(worst, maxChromaAt(p.L + (p.dL ?? 0) * (t - 0.5), p.h0 + (p.h1 - p.h0) * t));
  }
  return worst;
};
// (There is deliberately no exported MAX_C constant any more. It existed, it went stale the moment
//  either lightness knob moved, and re-introducing one would just re-open that bug — call
//  maxChroma() with the palette you are actually rendering.)

// `dL` deliberately BREAKS isoluminance: it tilts L* across the ramp by dL total, because strict
// isoluminance removes the one channel human vision uses to find edges — see docs/FINDINGS.md.
// dL = 0 restores the pure isoluminant ramp. SIGN: positive tilts dark at low EVI -> light at
// high, negative is the reverse. Positive is the default, and the reason is mechanical rather
// than aesthetic: both terrain composites are multiplicative in lightness, so the excursion the
// hillshade produces scales with the pixel's base L*. All the relief in this watershed is at high
// EVI (the forested headwaters), so seating that end LIGHT is what buys terrain its swing —
// tilting the other way spends the shading budget on the flat lower corridor that has no relief.
export const rampColor = (t, p = PALETTE) =>
  oklchToSrgb8(p.L + (p.dL ?? 0) * (t - 0.5), p.C, p.h0 + (p.h1 - p.h0) * t);

/** N discrete colors, sampled at bin centers off the same hue arc the continuous ramp uses —
 *  so "classed vs continuous" really is only about quantization, not about two different palettes. */
export const classedColors = (n, p = PALETTE) =>
  Array.from({ length: n }, (_, i) => rampColor((i + 0.5) / n, p));

// ---- transfer functions -----------------------------------------------------------------
/** `tfs` is out/transfer_functions.json. Returns value -> [0,1]. */
export function makeTransfer(tfs, name, upperPct) {
  const knots = tfs.rank.knots;                       // in-mask empirical CDF, 256 evenly-spaced ranks
  const atPct = (p) => knots[Math.max(0, Math.min(255, Math.round(p / 100 * 255)))];
  if (name === "rank") {
    return (v) => {                                    // invert the CDF: value -> rank
      if (v <= knots[0]) return 0;
      if (v >= knots[255]) return 1;
      let lo = 0, hi = 255;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (knots[m] <= v) lo = m; else hi = m; }
      const span = knots[hi] - knots[lo];
      return (lo + (span > 0 ? (v - knots[lo]) / span : 0)) / 255;
    };
  }
  // `upper_clip` is the live one: its top is driven by the slider, reusing the same CDF knots
  // so the percentile is exact rather than interpolated off two stored numbers.
  const { lo, hi } = name === "upper_clip" ? { lo: tfs.upper_clip.lo, hi: atPct(upperPct) }
                                           : { lo: tfs[name].lo, hi: tfs[name].hi };
  const d = hi - lo || 1;
  return (v) => Math.min(1, Math.max(0, (v - lo) / d));
}

// ---- the lookup table both renderers sample ---------------------------------------------
export const LUT_N = 4096;

/** Uint8Array(LUT_N*4): index = EVI quantized over [eviMin,eviMax], value = sRGB color.
 *  Transfer function AND palette are already applied — the shaders only index this. */
export function buildLut({ tfs, tf, upperPct, classed, bins, eviMin, eviMax, chroma, dL, L }) {
  const f = makeTransfer(tfs, tf, upperPct);
  const p = { ...PALETTE, C: chroma ?? PALETTE.C, dL: dL ?? PALETTE.dL, L: L ?? PALETTE.L };
  const cls = classed ? classedColors(bins, p) : null;
  const out = new Uint8Array(LUT_N * 4);
  for (let i = 0; i < LUT_N; i++) {
    const t = f(eviMin + (eviMax - eviMin) * (i / (LUT_N - 1)));
    const [r, g, b] = cls ? cls[Math.min(bins - 1, Math.floor(t * bins))] : rampColor(t, p);
    out.set([r, g, b, 255], i * 4);
  }
  return out;
}
