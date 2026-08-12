document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('navbar-mount');
  renderFooter('footer-mount');

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const content = document.getElementById('content');

  if (!id) {
    content.innerHTML = notFoundHTML();
    return;
  }

  try {
    const res = await fetch(`/api/scripts/${encodeURIComponent(id)}`);
    if (!res.ok) {
      content.innerHTML = notFoundHTML();
      return;
    }
    const data = await res.json();
    render(data.script);
  } catch {
    content.innerHTML = `<p class="muted-note">Something went wrong loading this script.</p>`;
  }
});

function notFoundHTML() {
  return `
    <div style="text-align:center;padding:64px 0">
      <p class="eyebrow">404</p>
      <h1 class="page-title" style="margin-top:8px">Script not found</h1>
      <p class="page-sub">It may have been removed, or the link is incorrect.</p>
      <a href="/" class="btn btn-primary" style="margin-top:24px">Back to homepage</a>
    </div>
  `;
}

function render(script) {
  document.title = `${script.title} — COREX SCRIPT`;
  document.getElementById('pageTitle').textContent = `${script.title} — COREX SCRIPT`;

  const tags = Array.isArray(script.tags) ? script.tags : [];
  const content = document.getElementById('content');

  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;font-family:var(--font-mono);font-size:12px;color:var(--signal-soft);margin-bottom:20px">
      <span>${escapeHTML(script.game_name)}</span>
      ${script.featured ? '<span class="badge-featured" style="position:static">Featured</span>' : ''}
    </div>
    <h1 class="page-title" style="font-size:32px">${escapeHTML(script.title)}</h1>
    <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px 14px;font-size:14px;color:var(--ink-500)">
      <span>by ${escapeHTML(script.author)}</span>
      <span>·</span>
      <span>Posted ${formatDate(script.created_at)}</span>
      <span>·</span>
      <span id="viewCount">${(Number(script.views) + 1).toLocaleString()} views</span>
    </div>
    ${tags.length ? `<div class="card-tags" style="margin-top:14px">${tags.map((t) => `<span class="tag">${escapeHTML(t)}</span>`).join('')}</div>` : ''}
    <p style="margin-top:22px;line-height:1.6;color:var(--ink-300)">${escapeHTML(script.description)}</p>

    <div class="code-block" style="margin-top:28px">
      <div class="code-header">
        <div class="code-dots">
          <span class="dot red"></span><span class="dot amber"></span><span class="dot green"></span>
          <span class="code-meta">script.lua · ${script.code.split('\n').length} lines</span>
        </div>
        <button class="btn btn-primary btn-sm copy-btn" id="copyBtn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" stroke-width="2"/></svg>
          Copy Script
        </button>
      </div>
      <div class="code-body"><pre><code>${highlightLua(script.code)}</code></pre></div>
    </div>

    <div style="margin-top:24px" id="reportMount"></div>
  `;

  document.getElementById('copyBtn').addEventListener('click', () => copyCode(script.code));
  renderReportBox(script.id);
}

async function copyCode(code) {
  const btn = document.getElementById('copyBtn');
  try {
    await navigator.clipboard.writeText(code);
    btn.classList.add('copied');
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied!`;
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" stroke-width="2"/></svg> Copy Script`;
    }, 1600);
  } catch {
    /* clipboard can fail silently (permissions/insecure context) */
  }
}

function renderReportBox(scriptId) {
  const mount = document.getElementById('reportMount');
  mount.innerHTML = `
    <button class="report-trigger" id="reportTrigger">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 15V4l16 5-16 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 21v-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      Report this script
    </button>
  `;
  document.getElementById('reportTrigger').addEventListener('click', () => {
    mount.innerHTML = `
      <div class="report-box">
        <label style="display:block;font-size:12px;color:var(--ink-500);margin-bottom:6px">What's wrong with this script?</label>
        <textarea id="reportReason" rows="2" maxlength="1000" style="width:100%;border-radius:8px;border:1px solid var(--base-700);background:var(--base-950);color:var(--ink-100);padding:8px" placeholder="e.g. doesn't work, broken, malicious…"></textarea>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-danger btn-sm" id="reportSubmit">Submit report</button>
          <button class="btn btn-ghost btn-sm" id="reportCancel">Cancel</button>
        </div>
        <p class="error-text" id="reportError" style="display:none"></p>
      </div>
    `;
    document.getElementById('reportCancel').addEventListener('click', () => renderReportBox(scriptId));
    document.getElementById('reportSubmit').addEventListener('click', async () => {
      const reason = document.getElementById('reportReason').value.trim();
      if (!reason) return;
      const errorEl = document.getElementById('reportError');
      try {
        const res = await fetch(`/api/scripts/${scriptId}/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });
        if (!res.ok) throw new Error();
        mount.innerHTML = `<p class="success-text">Thanks — the owner will take a look.</p>`;
      } catch {
        errorEl.textContent = "Couldn't send that — try again.";
        errorEl.style.display = 'block';
      }
    });
  });
    }
    
