/**
 * Word-level diff (LCS) for comparing the visible text of reference and local pages.
 * Returns hunks of consecutive differences: { before: context words, ref: words only in a, local: words only in b }.
 */
export const words = (s) => s.replace(/[  ]/g, ' ').split(/\s+/).filter(Boolean);

export function wordDiff(a, b, { context = 4 } = {}) {
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const A = a.slice(pre, a.length - suf), B = b.slice(pre, b.length - suf);
  const n = A.length, m = B.length;
  if (n * m > 40e6) throw new Error(`text too different to diff (${n}×${m} words)`);
  // L[i][j] = LCS length of A[i..], B[j..]
  const L = new Uint32Array((n + 1) * (m + 1));
  const W = m + 1;
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i * W + j] = A[i] === B[j] ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1]);
  const ops = [];   // ['=', word] | ['-', word] | ['+', word]
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { ops.push(['=', A[i]]); i++; j++; }
    else if (L[(i + 1) * W + j] >= L[i * W + j + 1]) ops.push(['-', A[i++]]);
    else ops.push(['+', B[j++]]);
  }
  while (i < n) ops.push(['-', A[i++]]);
  while (j < m) ops.push(['+', B[j++]]);
  const all = [...a.slice(0, pre).map((w) => ['=', w]), ...ops, ...a.slice(a.length - suf).map((w) => ['=', w])];
  const hunks = [];
  let cur = null;
  all.forEach(([op, w], k) => {
    if (op === '=') { cur = null; return; }
    if (!cur) {
      const before = [];
      for (let p = k - 1; p >= 0 && before.length < context; p--) if (all[p][0] !== '+') before.unshift(all[p][1]);
      cur = { before: before.join(' '), ref: [], local: [] };
      hunks.push(cur);
    }
    (op === '-' ? cur.ref : cur.local).push(w);
  });
  return hunks.map((h) => ({ before: h.before, ref: h.ref.join(' '), local: h.local.join(' ') }));
}
