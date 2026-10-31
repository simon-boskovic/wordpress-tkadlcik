/**
 * crossbrowser — DoD §8 browsers (controller ruling R24): a smoke pass in Playwright Firefox (desktop
 * 1440×900 and 1000×800, the width where the hamburger takes over) and WebKit (iPhone emulation) —
 * the page renders (visible h1, text), no console errors or page errors, no failed requests (≥ 400),
 * no horizontal overflow, the menu opens and closes (Escape), forms render; screenshots are recorded.
 * Playwright is not a dependency: it is loaded from TK_PLAYWRIGHT or the gitignored .tools/pw install;
 * without it the check reports SKIP. Firefox cannot start inside Claude Code's sandbox: when CLAUDECODE is set
 * (and TK_CROSSBROWSER is not 1) the check reports SKIP without launching anything — run it from a normal terminal.
 * A browser Playwright has not downloaded (e.g. WebKit) is reported as a skipped run, not a page defect.
 */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { playwrightDir } from '../tools.mjs';
import { LOCAL_ENV_CONSOLE } from '../config.mjs';
import { consentScript } from '../../cdp.mjs';

async function smoke(pw, browserName, ctxOpts, url, out, tag, menu) {
  const res = { browser: browserName, tag };
  let browser;
  try { browser = await pw[browserName].launch(); } catch (e) {
    // An environment problem (e.g. a sandbox that stops Firefox from opening its profile), not a page defect.
    res.skipped = e.message.split('\n').filter((l) => /err\]|Error|error/.test(l)).slice(0, 2).join(' ').slice(0, 200) || e.message.split('\n')[0];
    return res;
  }
  try {
    const context = await browser.newContext(ctxOpts);
    // Same start state as every CDP session (cookie consent, build/lib/cdp.mjs): consent dismissed, banner hidden.
    if ((process.env.TK_CONSENT || 'dismissed') === 'dismissed') await context.addInitScript({ content: consentScript() });
    const page = await context.newPage();
    const errors = [], bad = [];
    const envNotes = [];
    page.on('console', (m) => { if (m.type() !== 'error') return; const t = m.text().slice(0, 200); (LOCAL_ENV_CONSOLE.some((re) => re.test(t)) ? envNotes : errors).push(t); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.message || e).slice(0, 200)));
    page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
    page.on('requestfailed', (r) => { const f = r.failure(); if (f && !/aborted|cancel/i.test(f.errorText)) bad.push(`${f.errorText} ${r.url()}`); });
    await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(1200);
    await page.evaluate(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms)); for (let y = 0; y <= document.documentElement.scrollHeight; y += innerHeight * 0.7) { scrollTo(0, y); await w(200); } scrollTo(0, 0); await w(500); });
    res.state = await page.evaluate(() => {
      const h1 = document.querySelector('h1'); const r = h1 && h1.getBoundingClientRect();
      const forms = [...document.querySelectorAll('main form')].map((f) => ({ fields: [...f.querySelectorAll('input:not([type=hidden]), select, textarea')].filter((i) => i.getClientRects().length).length, visible: f.getClientRects().length > 0 }));
      return { h1: h1 ? h1.textContent.trim().slice(0, 60) : null, h1Visible: !!r && r.width > 0 && r.height > 0 && parseFloat(getComputedStyle(h1).opacity) > 0.5, words: (document.body.innerText || '').split(/\s+/).length,
        scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, forms };
    });
    res.shot = join(out, `xb-${tag}.png`);
    await page.screenshot({ path: res.shot, fullPage: true });
    if (menu) {
      const btn = page.locator('header .menu-btn[aria-expanded]').first();
      if (await btn.count() && await btn.isVisible()) {
        if (ctxOpts.hasTouch) await btn.tap(); else await btn.click();
        await page.waitForTimeout(600);
        res.menuOpen = await page.evaluate(() => { const p = document.getElementById('mnav'); return !!p && p.getClientRects().length > 0 && getComputedStyle(p).visibility !== 'hidden' && parseFloat(getComputedStyle(p).opacity) > 0.5; });
        await page.screenshot({ path: join(out, `xb-${tag}-menu.png`) });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        res.menuClosed = await page.evaluate(() => document.querySelector('.top').getAttribute('data-open') !== 'true' && !document.querySelector('main[inert], .foot[inert]'));
      } else res.menuOpen = null;
    }
    res.errors = errors; res.bad = bad; res.envNotes = [...new Set(envNotes)];
    await context.close();
  } catch (e) { res.error = e.message.split('\n')[0]; } finally { await browser.close(); }
  return res;
}

export default {
  name: 'crossbrowser',
  title: 'Cross-browser smoke (Playwright Firefox + WebKit iPhone): renders, no errors, no overflow, menu',
  async run(ctx) {
    const dir = playwrightDir();
    if (process.env.CLAUDECODE && process.env.TK_CROSSBROWSER !== '1') return { status: 'SKIP', summary: 'Claude Code sandbox: Firefox cannot start here — run `node build/dod.mjs --checks=crossbrowser` from a normal terminal', details: {}, md: 'SKIP: inside the Claude Code sandbox (CLAUDECODE set). Never bypass the sandbox for this; run it from a normal terminal (TK_CROSSBROWSER=1 forces an attempt).' };
    if (!dir) return { status: 'SKIP', summary: 'Playwright not available (set TK_PLAYWRIGHT or install into .tools/pw)', details: {}, md: 'SKIP: no Playwright.' };
    const pw = await import(pathToFileURL(join(dir, 'index.mjs')).href);
    const iphone = pw.devices['iPhone 13'] || pw.devices['iPhone 12'];
    const runs = [
      await smoke(pw, 'firefox', { viewport: { width: 1440, height: 900 } }, ctx.localUrl, ctx.out, 'firefox-1440', false),
      await smoke(pw, 'firefox', { viewport: { width: 1000, height: 800 } }, ctx.localUrl, ctx.out, 'firefox-1000', !ctx.front),
      await smoke(pw, 'webkit', { ...iphone }, ctx.localUrl, ctx.out, 'webkit-iphone', !ctx.front),
    ];
    const problems = [];
    const skipped = runs.filter((r) => r.skipped);
    for (const r of runs) {
      if (r.skipped) continue;
      if (r.error) { problems.push(`${r.tag}: ${r.error}`); continue; }
      if (!r.state.h1Visible) problems.push(`${r.tag}: h1 not visible`);
      if (r.errors.length) problems.push(`${r.tag}: ${r.errors.length} console error(s): ${r.errors.slice(0, 2).join(' | ')}`);
      if (r.bad.length) problems.push(`${r.tag}: ${r.bad.length} failed request(s): ${r.bad.slice(0, 2).join(' | ')}`);
      if (r.state.scrollWidth > r.state.clientWidth) problems.push(`${r.tag}: horizontal overflow ${r.state.scrollWidth} > ${r.state.clientWidth}`);
      if (r.menuOpen === false) problems.push(`${r.tag}: menu did not open`);
      if (r.menuOpen && r.menuClosed === false) problems.push(`${r.tag}: menu did not close cleanly on Escape`);
      if (r.state.forms.some((f) => !f.visible || !f.fields)) problems.push(`${r.tag}: form not rendered`);
    }
    const md = ['| Run | h1 | words | scrollWidth/clientWidth | menu open/closed | forms | console errors | failed requests | screenshot |', '|---|---|---|---|---|---|---|---|---|',
      ...runs.map((r) => r.skipped ? `| ${r.tag} | SKIPPED: browser did not launch (${r.skipped}) | | | | | | | |` : r.error ? `| ${r.tag} | ${r.error} | | | | | | | |` : `| ${r.tag} | ${r.state.h1Visible ? '✓' : '✗'} ${r.state.h1 || ''} | ${r.state.words} | ${r.state.scrollWidth}/${r.state.clientWidth} | ${r.menuOpen == null ? '—' : `${r.menuOpen}/${r.menuClosed}`} | ${r.state.forms.map((f) => f.fields + ' fields').join(', ') || '—'} | ${r.errors.length ? r.errors.slice(0, 3).join('<br>') : 0} | ${r.bad.length ? r.bad.slice(0, 3).join('<br>') : 0} | \`${r.shot}\` |`),
      '', problems.length ? 'Problems:\n' + problems.map((p) => `- ${p}`).join('\n') : 'Firefox and WebKit render the page cleanly; menu works.'].join('\n');
    const ran = runs.filter((r) => !r.skipped).map((r) => r.tag);
    const skipNote = skipped.length ? ` — SKIPPED ${skipped.map((r) => r.tag).join(', ')} (browser did not launch here)` : '';
    const status = problems.length ? 'FAIL' : ran.length ? 'PASS' : 'SKIP';
    const env = [...new Set(runs.flatMap((r) => r.envNotes || []))];
    return { status, summary: (problems.length ? problems[0] + (problems.length > 1 ? ` (+${problems.length - 1} more)` : '') : ran.length ? `${ran.join(', ')}: renders, 0 errors, no overflow, menu OK` : 'no browser could be launched') + skipNote, details: { runs, problems, skipped: skipped.map((r) => ({ tag: r.tag, reason: r.skipped })) }, md: md + (env.length ? `\n\nLocal-environment messages (http:// only, not counted): ${env.join('; ')}` : '') + (skipped.length ? `\n\nSkipped runs: ${skipped.map((r) => `${r.tag} (${r.skipped})`).join('; ')} — run the harness outside a sandbox to cover them.` : '') };
  },
};
