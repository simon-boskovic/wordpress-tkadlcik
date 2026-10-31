/**
 * Check registry, in run order. A check is { name, title, serial?, run(ctx) → { status, summary, details, md } }
 * with status PASS | FAIL | N/A | BLOCKED | SKIP. ctx = { slug, path, localUrl, refUrl, base, proto, out, opts,
 * shared, variants, front, runId }. `shared` carries data between checks (visual stores its console logs for the
 * console check). To extend the harness: add a module here (and its devices/thresholds in ../config.mjs).
 */
import visual from './visual.mjs';
import consoleCheck from './console.mjs';
import overflow from './overflow.mjs';
import { reducedMotion, animations } from './motion.mjs';
import hover from './hover.mjs';
import press from './press.mjs';
import keyboard from './keyboard.mjs';
import targets from './targets.mjs';
import seo from './seo.mjs';
import contrast from './contrast.mjs';
import images from './images.mjs';
import nojs from './nojs.mjs';
import flash from './flash.mjs';
import crossbrowser from './crossbrowser.mjs';
import lighthouse from './lighthouse.mjs';

export const CHECKS = [visual, consoleCheck, overflow, reducedMotion, animations, hover, press, keyboard, targets, seo, contrast, images, nojs, flash, crossbrowser, lighthouse];
