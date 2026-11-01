// Contact form (mu-plugins/tk-form.php).
// 1. Validation: the server's rules (mu-plugins/tk-form/rules.json) arrive in the form's data-rules; tkFormCheck()
//    below is the twin of tk_form_validate() in PHP (same order, same messages; build/test/form-cases.json is run
//    against both). Messages appear next to a field when it is left, are re-checked while typing once shown, and all
//    of them on submit, which then focuses the first invalid field. The server validates again in any case.
// 2. The page may come from the page cache, so on the first interaction the render token is replaced by a fresh one
//    (admin-ajax.php?action=tk_form_token); the server accepts tokens between 3 s and 2 h old.
// Without JS the form submits as is and the server answers with the same messages.
(function (root) {
  function len(v) { return Array.from(v).length; }
  function test(p, v) { return new RegExp(p, 'u').test(v); }
  // Errors per field: { field: message }. data = { field: trimmed value }.
  function tkFormCheck(rules, data) {
    var e = {};
    Object.keys(rules).forEach(function (f) {
      if (f === '_') return;
      var r = rules[f], v = String(data[f] || '');
      if (v === '') { if (r.required) e[f] = r.required; return; }
      var n = len(v);
      if ((r.min != null && n < r.min) || (r.max != null && n > r.max)) e[f] = r.lenMsg;
      else if (r.pattern && !test(r.pattern, v)) e[f] = r.patternMsg;
      else if (r.forbid && test(r.forbid, v)) e[f] = r.forbidMsg;
      else if (r.digits && (v.replace(/\D/g, '').length < r.digits[0] || v.replace(/\D/g, '').length > r.digits[1])) e[f] = r.digitsMsg;
      else if (r.maxLinks != null && (v.match(/https?:\/\/|www\./giu) || []).length > r.maxLinks) e[f] = r.linksMsg;
    });
    return e;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = tkFormCheck; return; }
  root.tkFormCheck = tkFormCheck;

  var form = document.querySelector('[data-tk-form]');
  if (!form) return;
  var rules = {};
  try { rules = JSON.parse(form.getAttribute('data-rules') || '{}'); } catch (x) { rules = {}; }
  var fields = Object.keys(rules).filter(function (f) { return f !== '_' && form.elements[f]; });
  var touched = {};

  function values() {
    var d = {};
    fields.forEach(function (f) { d[f] = form.elements[f].value.trim(); });
    return d;
  }
  function show(f, msg) {
    var el = form.elements[f], id = 'err-' + f, span = document.getElementById(id);
    if (msg) {
      if (!span) {
        span = document.createElement('span');
        span.className = 'field-err'; span.id = id;
        el.insertAdjacentElement('afterend', span);
      }
      span.textContent = msg;
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', id);
    } else {
      if (span) span.remove();
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    }
  }
  function check(f) { show(f, tkFormCheck(rules, values())[f]); }

  fields.forEach(function (f) {
    var el = form.elements[f];
    if (el.getAttribute('aria-invalid') === 'true') touched[f] = true; // server already showed a message
    el.addEventListener('blur', function () { if (el.value.trim() !== '' || touched[f]) { touched[f] = true; check(f); } });
    el.addEventListener('input', function () { if (touched[f]) check(f); });
  });

  // Characters left in the message, from the rules' max.
  var msg = form.elements.message, count = form.querySelector('[data-tk-count]');
  if (msg && count && rules.message && rules.message.max) {
    var upd = function () {
      var n = len(msg.value.trim());
      count.textContent = n + ' / ' + rules.message.max;
      count.classList.toggle('over', n > rules.message.max);
    };
    msg.addEventListener('input', upd); upd();
  }

  form.addEventListener('submit', function (ev) {
    var e = tkFormCheck(rules, values()), first = null;
    fields.forEach(function (f) { touched[f] = true; show(f, e[f]); if (e[f] && !first) first = form.elements[f]; });
    if (first) { ev.preventDefault(); first.focus(); }
  });

  var done = false;
  function refresh() {
    if (done) return;
    done = true;
    var body = new FormData(); body.append('action', 'tk_form_token');
    fetch((window.tkAjaxUrl || '/wp-admin/admin-ajax.php'), { method: 'POST', body: body, credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.t) form.querySelector('[name="tk_t"]').value = j.t; })
      .catch(function () {});
  }
  form.addEventListener('focusin', refresh, { once: true });
  form.addEventListener('pointerdown', refresh, { once: true });
})(typeof window !== 'undefined' ? window : this);
