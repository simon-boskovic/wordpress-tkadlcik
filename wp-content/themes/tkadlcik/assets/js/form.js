// Contact form (mu-plugins/tk-form.php): the page may come from the page cache, so on the first interaction the
// render token is replaced by a fresh one (admin-ajax.php?action=tk_form_token); the server accepts tokens between
// 3 s and 2 h old. The browser's own validation runs on submit (required, type=email, minlength), with the
// messages shown next to the fields by the server when it rejects something. Without JS the form still submits.
(function () {
  var form = document.querySelector('[data-tk-form]');
  if (!form) return;
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
  // Let the browser show its own messages (novalidate is there for the server fallback only).
  form.removeAttribute('novalidate');
})();
