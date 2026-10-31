/**
 * console — no console errors, no uncaught exceptions, no HTTP ≥ 400 and no failed requests on any
 * device after a full scroll-through. Reuses the visual pass's loads when it ran; otherwise loads itself.
 * The reference is recorded too, so a failure caused by the prototype itself is visible as such.
 */
import { DEVICE_SETS, LOCAL_ENV_CONSOLE, THRESHOLDS } from '../config.mjs';
import { loadSettled, openDevice } from '../session.mjs';

const env = (x) => LOCAL_ENV_CONSOLE.some((re) => re.test(x));
const bad = (log) => [...log.errors, ...log.http, ...log.failed, ...(THRESHOLDS.consoleWarningsFail ? log.warnings : [])].filter((x) => !env(x));

export default {
  name: 'console',
  title: 'Console and network clean',
  async run(ctx) {
    const logs = ctx.shared.logs || {};
    const devices = ctx.opts.devices || DEVICE_SETS.console;
    for (const dev of devices) {
      if (logs[dev]) continue;
      const b = await openDevice(dev);
      try {
        const ref = await loadSettled(b, ctx.refUrl);
        const loc = await loadSettled(b, ctx.localUrl);
        logs[dev] = { ref: ref.log, local: loc.log };
      } finally { await b.close(); }
    }
    ctx.shared.logs = logs;
    const rows = devices.map((dev) => ({ dev, local: logs[dev].local, ref: logs[dev].ref, fails: bad(logs[dev].local) }));
    const pass = rows.every((r) => !r.fails.length);
    const list = (a) => (a.length ? a.map((x) => `  - \`${x}\``).join('\n') : '  - none');
    const md = rows.map((r) => [
      `**${r.dev}** local: ${r.local.errors.length} errors, ${r.local.warnings.length} warnings, ${r.local.http.length} HTTP ≥ 400, ${r.local.failed.length} failed (${r.local.canceled.length} canceled, not counted) · reference: ${r.ref.errors.length} errors, ${r.ref.warnings.length} warnings, ${r.ref.http.length} HTTP ≥ 400, ${r.ref.failed.length} failed`,
      '- local errors / HTTP / failed:', list([...r.local.errors, ...r.local.http, ...r.local.failed]),
      '- local warnings:', list(r.local.warnings),
      '- reference errors / HTTP / failed:', list([...r.ref.errors, ...r.ref.http, ...r.ref.failed]),
      '- reference warnings:', list(r.ref.warnings),
    ].join('\n')).join('\n\n');
    const n = rows.reduce((s, r) => s + r.fails.length, 0);
    const w = rows.reduce((s, r) => s + r.local.warnings.length, 0);
    return { status: pass ? 'PASS' : 'FAIL', summary: `${n} local error(s)/bad request(s), ${w} warning(s) over ${devices.join(',')}`, details: rows, md };
  },
};
