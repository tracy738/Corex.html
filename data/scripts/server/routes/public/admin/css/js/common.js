// Injected on every public page. Renders the navbar/footer so they only
// need to be maintained in one place, and provides small shared helpers.

function renderNavbar(mountId) {
  const el = document.getElementById(mountId);
  if (!el) return;
  el.innerHTML = `
    <div class="navbar">
      <div class="navbar-inner">
        <a href="/" class="logo">
          <span class="logo-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 17l6-10 6 10M8 13h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <span class="logo-text">COREX <span class="accent">SCRIPT</span></span>
        </a>
        <nav class="nav-links">
          <a href="/scripts.html">All Scripts</a>
          <a href="/search.html">Search</a>
        </nav>
        <div class="nav-search">
          <form class="search-form" id="navSearchForm">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
              <path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <input type="text" id="navSearchInput" class="search-input" placeholder="Search scripts…" aria-label="Search scripts">
          </form>
        </div>
      </div>
    </div>
  `;
  const form = document.getElementById('navSearchForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('navSearchInput').value.trim();
    window.location.href = q ? `/search.html?q=${encodeURIComponent(q)}` : '/search.html';
  });
}

function renderFooter(mountId) {
  const el = document.getElementById(mountId);
  if (!el) return;
  el.innerHTML = `
    <footer class="site-footer">
      <div class="wrap">
        <p>COREX SCRIPT — every script here is reviewed and posted by the site owner.</p>
        <p>Use scripts at your own risk. Respect game developers and platform rules.</p>
      </div>
    </footer>
  `;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Renders a grid of script cards into the given container element. */
function renderScriptCards(container, scripts) {
  if (!scripts || scripts.length === 0) {
    container.innerHTML = '<p class="muted-note">No scripts found.</p>';
    return;
  }
  container.className = 'script-grid';
  container.innerHTML = scripts.map(scriptCardHTML).join('');
}

function scriptCardHTML(s) {
  const tags = Array.isArray(s.tags) ? s.tags.slice(0, 3) : [];
  const initials = escapeHTML((s.game_name || '??').slice(0, 2).toUpperCase());
  return `
    <a href="/script.html?id=${s.id}" class="card">
      ${s.featured ? '<span class="badge-featured">Featured</span>' : ''}
      <div class="card-thumb"><span>${initials}</span></div>
      <div class="card-body">
        <div class="card-game">${escapeHTML(s.game_name)}</div>
        <div class="card-title">${escapeHTML(s.title)}</div>
        <div class="card-desc">${escapeHTML(s.description)}</div>
        ${tags.length ? `<div class="card-tags">${tags.map((t) => `<span class="tag">${escapeHTML(t)}</span>`).join('')}</div>` : ''}
        <div class="card-meta"><span>by ${escapeHTML(s.author)}</span><span>${timeAgo(s.created_at)}</span></div>
        <div class="card-footer">
          <span class="card-views">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>
            ${Number(s.views).toLocaleString()}
          </span>
          <span class="btn btn-ghost btn-sm">View Script</span>
        </div>
      </div>
    </a>
  `;
}
