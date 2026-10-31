// Port of martinadamus build/test/finalize.test.mjs (image, font-swap and CTA-arrow cases dropped: this
// prototype has no images, one font and SVG arrows; prototype-link and DC-syntax cases adapted).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFinalizer, isImageSrc, parseDeclarations, uploadUrl } from '../lib/finalize.mjs';

test('style-hover becomes a mouse-only class rule with !important', () => {
  const f = createFinalizer();
  const out = f.finalize('<a href="#x" style="color:#5F625D" style-hover="color:#0E0F0E;border-color:#5F625D">x</a>');
  const cls = /class="(tk-h-[0-9a-f]{6}) tk-s-[0-9a-f]{8}"/.exec(out)[1];
  assert.ok(!out.includes('style-hover'));
  assert.equal(f.statesCss().trim(), `@media (hover:hover) and (pointer:fine){.${cls}:hover{color:#0E0F0E !important;border-color:#5F625D !important}}`);
});

test('identical state css is deduplicated; active and focus are not hover-guarded', () => {
  const f = createFinalizer();
  const a = f.finalize('<button style="x:1" style-active="transform:scale(.97)">a</button>');
  const b = f.finalize('<button style="x:1" style-active="transform:scale(.97)">b</button>');
  const clsA = /tk-a-[0-9a-f]{6}/.exec(a)[0];
  assert.equal(clsA, /tk-a-[0-9a-f]{6}/.exec(b)[0]);
  f.finalize('<input style-focus="border-color:var(--jade)">');
  const css = f.statesCss();
  assert.match(css, new RegExp(`^\\.${clsA}:active\\{transform:scale\\(\\.97\\) !important\\}$`, 'm'));
  assert.match(css, /^\.tk-f-[0-9a-f]{6}:focus\{border-color:var\(--jade\) !important\}$/m);
  assert.equal(css.trim().split('\n').length, 2);
});

test('empty style-hover is dropped without a class; no states -> empty states.css body', () => {
  const f = createFinalizer();
  assert.equal(f.finalize('<button type="button" style-hover="">x</button>'), '<button type="button">x</button>');
  assert.equal(f.statesCss(), '');
});

test('prototype links become site paths (with or without ./), anchors and other links are kept', () => {
  const f = createFinalizer();
  const out = f.finalize('<a href="Main.dc.html">a</a><a href="./Cviceni.dc.html#videa">b</a><a href="Rozvrh.dc.html">c</a><a href="Seminare.dc.html#hory">d</a><a href="OMne.dc.html">e</a><a href="Clanky.dc.html">f</a><a href="Kontakt.dc.html">g</a><a href="#brokat">h</a><a href="tel:+420">i</a><a href="https://www.gstaichi.org/">j</a>');
  assert.deepEqual([...out.matchAll(/href="([^"]*)"/g)].map((m) => m[1]), ['/', '/cviceni/#videa', '/kurzy-a-lekce/', '/akce/#hory', '/o-mne/', '/clanky/', '/kontakt/', '#brokat', 'tel:+420', 'https://www.gstaichi.org/']);
  assert.throws(() => f.finalize('<a href="Nope.dc.html">x</a>'), /No route/);
});

test('target="_blank" links get rel="noopener"; existing rel tokens (nofollow) stay, other links are untouched', () => {
  const f = createFinalizer();
  assert.equal(f.finalize('<a href="https://x.cz/" target="_blank">a</a>'), '<a href="https://x.cz/" target="_blank" rel="noopener">a</a>');
  assert.equal(f.finalize('<a href="https://x.cz/" rel="nofollow" target="_blank">a</a>'), '<a href="https://x.cz/" rel="nofollow noopener" target="_blank">a</a>');
  assert.equal(f.finalize('<a href="https://x.cz/" target="_blank" rel="noopener">a</a>'), '<a href="https://x.cz/" target="_blank" rel="noopener">a</a>');
  assert.equal(f.finalize('<a href="/x/">a</a>'), '<a href="/x/">a</a>');
});

test('React attribute names are normalised', () => {
  const f = createFinalizer();
  assert.equal(f.finalize('<form noValidate="true"><input tabIndex="-1" inputMode="tel" maxLength="20"></form>'), '<form novalidate><input tabindex="-1" inputmode="tel" maxlength="20"></form>');
});

test('a state attribute the tag rewriter could not convert is rejected, not shipped', () => {
  const f = createFinalizer();
  for (const bad of [`<a href='#' style-hover="color:red">x</a>`, `<button data-x='1' style-active="transform:scale(.97)">x</button>`, `<input name='q' style-focus="border-color:red">`]) {
    assert.throws(() => f.finalize(bad), /Unconverted/, bad);
  }
  assert.doesNotThrow(() => f.finalize('<a href="#" style-hover="color:red">x</a>'));
});

test('unconverted prototype syntax is rejected', () => {
  const f = createFinalizer();
  for (const bad of ['<p>{{ note }}</p>', '<div data-tab="{{tab}}"></div>', '<sc-if value="x"></sc-if>', '<button onClick="{{ go }}">x</button>', '<div ref="{{ r }}"></div>', '<x-dc></x-dc>', '<helmet></helmet>', '<div class="site" data-font="Geist"></div>', '<div class="font-picker"></div>', '<p>see Main.dc.html</p>']) {
    assert.throws(() => f.finalize(bad), /Unconverted|No route/, bad);
  }
});

// ---- R36: inline style attributes become generated classes --------------------------------------

const styleOf = (f, html) => {
  const out = f.finalize(html);
  const cls = /\b(tk-s-[0-9a-f]{8})\b/.exec(out)?.[1];
  return { out, cls, css: f.styleCss(out) };
};

test('a style attribute becomes one tk-s class whose rule holds exactly its declarations', () => {
  const f = createFinalizer();
  const { out, cls, css } = styleOf(f, '<div class="x" data-a="1" style="display:flex; gap: 12px ;COLOR:#0E0F0E;">t</div>');
  assert.equal(out, `<div data-a="1" class="x ${cls}">t</div>`);
  assert.equal(css, `.${cls}{display:flex;gap:12px;color:#0E0F0E}\n`);
});

test('identical declaration sets share a class; the CSS lists each used class once, sorted', () => {
  const f = createFinalizer();
  const a = styleOf(f, '<p style="margin:0;font-size:15px">a</p>');
  const b = styleOf(f, '<span style="margin: 0; font-size: 15px">b</span>');
  const c = styleOf(f, '<p style="font-size:15px;margin:0">c</p>');   // other order = other cascade inside the rule
  assert.equal(a.cls, b.cls);
  assert.notEqual(a.cls, c.cls);
  const css = f.styleCss(a.out + b.out + c.out + a.out);
  assert.equal(css.trim().split('\n').length, 2);
  assert.deepEqual(css.trim().split('\n').map((l) => l.slice(1, 14)), [a.cls, c.cls].sort());
});

test('styleCss only emits the classes the given markup uses', () => {
  const f = createFinalizer();
  const a = styleOf(f, '<p style="color:red">a</p>');
  const b = styleOf(f, '<p style="color:blue">b</p>');
  assert.equal(f.styleCss(a.out), `.${a.cls}{color:red}\n`);
  assert.equal(f.styleCss(JSON.stringify({ html: b.out })), `.${b.cls}{color:blue}\n`);
  assert.equal(f.styleCss('<p class="tk-s-00000000">unknown</p>'), '');
});

test('style attributes on SVG elements become classes too', () => {
  const f = createFinalizer();
  const { out, cls, css } = styleOf(f, '<svg class="arr" style="margin-top: auto; color: var(--jade-ink)" width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"></svg>');
  assert.equal(out, `<svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" class="arr ${cls}"></svg>`);
  assert.equal(css, `.${cls}{margin-top:auto;color:var(--jade-ink)}\n`);
});

test('entities are decoded; semicolons inside strings and url() do not split declarations', () => {
  const f = createFinalizer();
  const { css } = styleOf(f, `<div style="font-family:&quot;Geist&quot;,sans-serif;content:&#39;a;b&#39;;background:url(data:image/svg+xml;utf8,x) no-repeat">x</div>`);
  assert.match(css, /\{font-family:"Geist",sans-serif;content:'a;b';background:url\(data:image\/svg\+xml;utf8,x\) no-repeat\}/);
});

test('custom properties survive with their case, and var()/clamp() uses stay intact', () => {
  const f = createFinalizer();
  const { css } = styleOf(f, '<div style="--min: 320px; --Mixed-Case:1; padding: clamp(36px, 6vw, 88px); color: var(--on-dark-muted)"></div>');
  assert.match(css, /\{--min:320px;--Mixed-Case:1;padding:clamp\(36px, 6vw, 88px\);color:var\(--on-dark-muted\)\}/);
});

test('!important declarations go into @layer tk-important (beats every other !important, like inline did)', () => {
  const f = createFinalizer();
  const { cls, css } = styleOf(f, '<div style="color:red;display:flex!important;gap:4px ! IMPORTANT">x</div>');
  assert.equal(css, `.${cls}{color:red}\n@layer tk-important{\n.${cls}{display:flex !important;gap:4px !important}\n}\n`);
  const only = styleOf(f, '<div style="opacity:.5 !important">y</div>');
  assert.equal(f.styleCss(only.out), `@layer tk-important{\n.${only.cls}{opacity:.5 !important}\n}\n`);
});

test('empty or whitespace-only style attributes are dropped without a class', () => {
  const f = createFinalizer();
  assert.equal(f.finalize('<p style="">a</p><p style=" ; ">b</p><p style>c</p>'), '<p>a</p><p>b</p><p>c</p>');
});

test('no style attribute can leave the finalizer: leftovers throw, template syntax inside a style is caught', () => {
  const f = createFinalizer();
  for (const bad of [`<a href='#' style="color:red">x</a>`, `<div data-x='1' style='color:red'>x</div>`, `<p class='a' STYLE="color:red">x</p>`]) {
    assert.throws(() => f.finalize(bad), /Unconverted/, bad);
  }
  assert.throws(() => f.finalize('<div style="color:{{ c }}">x</div>'), /Unconverted/);
  assert.throws(() => f.finalize('<div style="color:red;</style><script>">x</div>'), /style/);
  assert.throws(() => f.finalize('<div style="color">x</div>'), /Malformed/);
  assert.doesNotThrow(() => f.finalize('<p data-style="x">a style=b</p>'));
});

test('leftover-style guard is quote-aware: a ">" inside a quoted attribute before style= cannot hide it', () => {
  const f = createFinalizer();
  for (const bad of [`<a title='a>b' style='color:red'>x</a>`, `<a title="a>b" href='#' style="color:red">x</a>`, `<div data-x='1' title="x>y" STYLE = 'color:red'>x</div>`]) {
    assert.throws(() => f.finalize(bad), /Unconverted/, bad);
  }
  for (const ok of [`<p title='a>b' data-style="x">a</p>`, `<p title="a>b" data-style='x'>a</p>`, `<p data-style="x">a style=b</p>`]) {
    assert.doesNotThrow(() => f.finalize(ok), ok);
  }
});

test('parseDeclarations normalises property case (not custom properties) and whitespace outside strings', () => {
  assert.deepEqual(parseDeclarations(` Font-Size : 15px ;  --X : a  b ; content : "a   b" ; margin:0 !important`), [
    { prop: 'font-size', value: '15px', important: false },
    { prop: '--X', value: 'a b', important: false },
    { prop: 'content', value: '"a   b"', important: false },
    { prop: 'margin', value: '0', important: true },
  ]);
});

test('images: ./img/ and ./client-img/ <img src> and CSS url() become the WebP upload; media() collects them', () => {
  const fin = createFinalizer();
  const out = fin.finalize('<img src="./client-img/Daniel Foto.JPG" alt="Daniel Tkadlčík"><img src="./img/hory.png" alt=""><div style="background-image:url(&quot;./img/hory.png&quot;)"></div><img src="https://example.com/x.jpg" alt="">');
  assert.match(out, /<img src="\/wp-content\/uploads\/Daniel Foto\.webp" alt="Daniel Tkadlčík">/);
  assert.match(out, /<img src="\/wp-content\/uploads\/hory\.webp" alt="">/);
  assert.match(out, /src="https:\/\/example\.com\/x\.jpg"/);
  assert.match(fin.styleCss(out), /background-image:url\("\/wp-content\/uploads\/hory\.webp"\)/);
  assert.deepEqual(fin.media(), [{ file: 'Daniel Foto.JPG', alt: 'Daniel Tkadlčík' }, { file: 'hory.png', alt: '' }]);
  // A later non-empty alt fills an empty one; addMedia registers an image outside the markup.
  fin.finalize('<img src="./img/hory.png" alt="Krkonoše">');
  assert.equal(fin.addMedia('./client-img/og.jpg'), '/wp-content/uploads/og.webp');
  assert.deepEqual(fin.media().map((m) => m.alt), ['Daniel Tkadlčík', 'Krkonoše', '']);
});

test('uploadUrl / isImageSrc', () => {
  assert.equal(uploadUrl('./client-img/a.jpeg'), '/wp-content/uploads/a.webp');
  assert.equal(uploadUrl('b.webp'), '/wp-content/uploads/b.webp');
  assert.ok(isImageSrc('./img/x.png') && isImageSrc('./client-img/x.png'));
  assert.ok(!isImageSrc('/wp-content/uploads/x.webp') && !isImageSrc('./other/x.png'));
});
