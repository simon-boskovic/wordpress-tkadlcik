# Agent readiness: https://radostvpohybu.cz/ (2026-11-23)

**Score: 80/100** (manual curl-based assessment; see "Tool limits").

## Tool limits
- Lighthouse Agentic Browsing: **unavailable**. The PSI call failed with `CERTIFICATE_VERIFY_FAILED` (Avast Web Shield TLS interception on this PC, not a site fault). No X/N fraction is reported.
- Agent-UX 0-100 heuristic: **unavailable** (same TLS error in `render_page.py`).
- `agentic_check.py` also failed on TLS, so its output was discarded and every check was redone with `curl`, which works. No accessibility-tree measurement was possible. Only raw-HTML structure was inspected.
- Form was NOT submitted.

## What works
- Server-rendered HTML: home is 137 KB with real content, 1 `h1`, `header`/`main`/`footer`, 3 `nav`. `/kurzy-a-lekce/` has an `h2`/`h3` hierarchy (kurzy, cena, misto, nedele, novy-kurz) with anchor ids.
- Real 404s: unknown URLs and `/llms-full.txt`/`/index.md` return 404 (no catch-all 200).
- robots.txt (200, text/plain) has explicit Allow groups for GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, plus a Sitemap line and a pointer to llms.txt.
- llms.txt (200, 6 KB, text/plain): H1, blockquote summary, a link list of all 11 pages with descriptions, and an updated date (2026-11-23). It covers the seminar date (28.-29. 11. 2026) and the new Monday course.
- Contact form is agent-usable: native `<form method=post>`, 10 `label`s, `name`/`email`/`phone`/`topic` select/`message`, with `autocomplete`, `required`, `minlength` and `maxlength`. The honeypot is `tabindex=-1`. Sign-up links are plain URLs (`/kontakt/?tema=4` from the seminar page).
- Also present: JSON-LD, a sitemap, and `X-Content-Type-Options: nosniff`.

## Access policy (robots.txt)
- Training (GPTBot, Google-Extended, Applebot-Extended): allowed.
- Search (OAI-SearchBot, Claude-SearchBot, PerplexityBot): allowed.
- User-triggered (ChatGPT-User, Claude-User, Perplexity-User): allowed.
- Content-Signal: not declared (it is a draft proposal, checked 2026-09-23 per vendor-matrix).

## Findings

### 1. No Content-Signal declaration - Low
Evidence: robots.txt has no `Content-Signal:` line and no `Content-Signal` response header. The explicit Allow groups already state intent, so the effect is clarity only.
Fix (optional, draft spec): add `Content-Signal: search=yes, ai-input=yes, ai-train=<owner's choice>` to the `*` group. The owner should decide the training value, since training is currently allowed.

### 2. No Markdown delivery - Info (opportunity)
Evidence: `Accept: text/markdown` returns `text/html`; `/index.md` is 404; no `rel=alternate type=text/markdown`. No consumer agent is confirmed to request it, and the site is small and already plain HTML, so the benefit is low.
Fix (optional): serve Markdown with `Vary: Accept`, or leave as is.

### 3. No ai-catalog.json, WebMCP, API catalog, agent card - Info
Evidence: all `/.well-known/*` agent documents are 404. WebMCP markup is absent (no `toolname` / `registerTool` / `modelContext` in the HTML). These are drafts or proposals (ARD, WebMCP; checked 2026-09-23). They are not applicable to a brochure site with no agent services.
Fix: none required. If an agent-facing contact or enrolment action is ever wanted, a WebMCP tool on the contact form would be the first candidate. Treat it as experimental.

### 4. `/.well-known/security.txt` is 404 on production - Low
Evidence: the project docs say `mu-plugins/tk-redirects.php` serves it, but production returns 404 (HTML, 193 bytes, an nginx/Apache-style page rather than WordPress).
Fix: check that the production rewrite passes `/.well-known/` to WordPress, or add a static file. Not agent-critical.

### 5. Form protection may block agent submissions - Info
Evidence: HMAC render token (`tk_t`, valid 3 s to 2 h), honeypot, throttling.
Fix: none. The form is valid for a browser-driving agent that waits 3 s or more. The e-mail alternative and sign-up links stay available. Confirm the page shows a clear Czech success or error message with text (not just colour) after submit.

### 6. Accessibility-tree and Lighthouse data missing - Info
Re-run from a machine or terminal without TLS interception (or with the Avast Web Shield CA exported to the Python trust store): `lighthouse_agentic.py`, `agent_ux_check.py`. Until then the score above is an estimate, not a Lighthouse fraction.

## Standards status
Content-Signal, ai-catalog.json (ARD), WebMCP and Web Bot Auth are drafts or proposals (vendor-matrix check date 2026-09-23). No ranking, citation or traffic effect is claimed.

## Structured findings (AI Search Readiness)
```json
[
 {"title":"No Content-Signal in robots.txt","severity":"Low","description":"Explicit Allow groups exist for all major AI user agents; Content-Signal (draft) is absent.","recommendation":"Optionally add a Content-Signal line after the owner decides on training."},
 {"title":"No Markdown/ai-catalog/WebMCP","severity":"Info","description":"Optional agent-delivery features are absent; not defects for a brochure site.","recommendation":"None required."},
 {"title":"security.txt 404 on production","severity":"Low","description":"/.well-known/security.txt returns 404.","recommendation":"Serve it via WordPress or a static file."},
 {"title":"Lighthouse Agentic and Agent-UX unavailable","severity":"Info","description":"TLS interception blocked the tools on the audit PC.","recommendation":"Re-run elsewhere."}
]
```
