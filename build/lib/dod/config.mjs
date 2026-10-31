/**
 * Definition-of-Done harness configuration (docs/definition-of-done.md): devices, widths, design tokens,
 * motion rules and thresholds in ONE place. Checks live in build/lib/dod/checks/ (registry: index.mjs).
 */

/** DoD §8 device keys (same set as martinadamus). DPR is always 1 here (pixel diffs must be comparable). */
export const DEVICES = {
  M: { width: 390, height: 844, touch: true, label: 'phone 390×844 (touch)' },
  ML: { width: 844, height: 390, touch: true, label: 'phone landscape 844×390 (touch)' },
  T: { width: 820, height: 1180, touch: true, label: 'tablet 820×1180 (touch)' },
  TL: { width: 1180, height: 820, touch: true, label: 'tablet landscape 1180×820 (touch)' },
  D: { width: 1440, height: 900, touch: false, label: 'desktop 1440×900 (mouse)' },
  XL: { width: 1920, height: 1080, touch: false, label: 'monitor 1920×1080 (mouse)' },
};

/** Devices per check (override the visual set with --devices=M,T,…). */
export const DEVICE_SETS = {
  visual: ['M', 'T', 'TL', 'D'],       // gated: DoD §2 checks 390, 820, 1180, 1440
  visualRecorded: ['ML', 'XL'],        // captured and diffed, reported, not gated
  console: ['M', 'ML', 'T', 'TL', 'D', 'XL'],   // taken from the visual pass when it ran
  reducedMotion: ['M', 'D'],
  animations: ['D'],
  hoverTap: ['T'],                     // TD1 (tap leaves no hover styling) on a touch tablet
  press: ['D'],
  faqTouch: ['M'],
  keyboard: ['D'],
  targets: ['M', 'T'],                 // K7
  flash: ['D', 'M'],
  contrast: ['D', 'M'],
};

/** Overflow viewports (DoD §2 "od 320 px žádný vodorovný posuvník"); touch up to 1180 px plus ML. */
export const OVERFLOW_VIEWPORTS = [
  ...[320, 360, 390, 414, 600, 768, 820, 1024, 1180].map((w) => ({ w, touch: true })),
  { w: 844, h: 390, touch: true },
  ...[1280, 1440, 1920].map((w) => ({ w, touch: false })),
];

/** DoD §2 palette, dark-only (site.css :root): Tuš background, off-white ink, Jade accent, light-jade focus (computed-style rgb strings). */
export const PALETTE = {
  bg: 'rgb(14, 15, 14)',           // --bg Tuš #0E0F0E
  ink: 'rgb(242, 242, 238)',       // --ink #F2F2EE
  jade: 'rgb(15, 118, 110)',       // --accent Jade #0F766E (white text 5.4:1)
  focus: 'rgb(143, 214, 204)',     // --focus #8FD6CC (11.6:1 on --bg)
  themeColor: '#0e0f0e',
};

/** DoD §2 dimensions. */
export const DIMENSIONS = { cardRadius: 24, pill: 999 };

/** DoD §3 motion (canvas.json notes.tone "POHYB"). */
export const MOTION = {
  easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
  pressScale: 0.97,
  pressMs: 160,
  /** Scroll reveal: keyframes `revealUp` (fade + translate 14 px), once, stagger 60 ms per IntersectionObserver batch (max 4 steps). */
  revealAnimation: 'revealUp',
  revealOffsetPx: 14,
  staggerStep: 60,
  staggerMaxSteps: 4,
  /** Breathing circle: one 10 s cycle = 5 s in + 5 s out. */
  breathMs: 10000,
  /** Under prefers-reduced-motion only these keyframes may run (opacity only). */
  reducedAllowedAnimations: ['fade'],
  /** Transitions that are not motion (allowed under reduced motion). */
  nonMotionProperties: /^(opacity|color|background-color|border-color|border-top-color|border-right-color|border-bottom-color|border-left-color|outline-color|text-decoration-color|fill|stroke|visibility|box-shadow)$/,
};

export const THRESHOLDS = {
  /** Share of differing pixels over the larger canvas (DoD §2: at most 1 %). */
  visualMaxRatio: 0.01,
  /** pixelmatch YIQ threshold (0..1); 0.1 is pixelmatch's default. */
  pixelThreshold: 0.1,
  /** DoD §4: no errors AND no warnings in the console. */
  consoleWarningsFail: true,
  /** Focus ring: exactly this wide (px), DoD §4. */
  focusOutline: 2,
  /** Focus ring colour (site.css --focus, light jade #8FD6CC). */
  focusColors: ['rgb(143, 214, 204)'],
  /** K7: minimum touch target (px). */
  touchTarget: 44,
  /** Text contrast (DoD §4: at least 4.5:1 for text). */
  contrast: 4.5,
  /** Flash: a screencast frame mostly pure white (luma > flashWhiteLuma) is a white flash. The site is dark-only
   *  (Tuš #0E0F0E, luma 15), so any blank white frame between two dark pages stands out. */
  flashWhiteLuma: 252,
  flashWhiteShare: 0.6,
  /** Press state: |scale(ref) − scale(local)| tolerated. */
  pressScaleTolerance: 0.01,
  /** Images (DoD §4): max bytes per photo. */
  imageMaxBytes: 300 * 1024,
  /** Lighthouse gates per form factor (min scores; max for the metrics); null = recorded, not gated. */
  lighthouse: {
    mobile: { accessibility: 100, seo: 100, 'best-practices': 95, performance: 90, lcpMs: 2500, cls: 0.05, tbtMs: 200 },
    desktop: { accessibility: 100, seo: 100, 'best-practices': 95, performance: null, lcpMs: null, cls: 0.05, tbtMs: 200 },
  },
};

/**
 * Console messages caused only by the local http:// environment (production runs on HTTPS, DoD §8):
 * reported as notes, not failures.
 */
export const LOCAL_ENV_CONSOLE = [/must be secure \(HTTPS\)/i];

/** Pages that are noindex by design (none on this site; kept for the Lighthouse SEO exception). */
export const NOINDEX = [];
