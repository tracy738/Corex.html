// Every admin page calls initAdminShell(activeHref). It confirms the
// session is valid (the server already redirects unauthenticated page
// loads, but this also catches a session expiring mid-visit) and
// renders the shared sidebar.
async function initAdminShell(activeHref) {
  renderFooter('footer-mount');

  let admin;
  try {
    const res = await fetch('/api/admin/me');
    if (!res.ok) {
      window.location.href = '/admin/login.html';
      return null;
    }
    const data = await res.json();
    admin = data.admin;
  } catch {
    window.location.href = '/admin/login.html';
    return null;
  }

  const nav = [
    { href: '/admin/index.html', label: 'Dashboard' },
    { href: '/admin/scripts.html', label: 'Manage Scripts' },
    { href: '/admin/create.html', label: 'Add Script' },
  ];

  document.getElementById('navbar-mount').innerHTML = `
    <div class="navbar">
      <div class="navbar-inner">
        <a href="/" class="logo">
          <span class="logo-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 17l6-10 6 10M8 13h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span class="logo-text">COREX <span class="accent">SCRIPT</span></span>
        </a>
        <span style="margin-left:auto;font-size:13px;color:var(--ink-700)">Admin</span>
      </div>
    </div>
  `;

  const sidebarMount = document.getElementById('admin-sidebar-mount');
  if (sidebarMount) {
    sidebarMount.innerHTML = `
      <aside class="admin-sidebar">
        <p class="signed-in-label">Signed in</p>
        <p class="signed-in-name">${escapeHTML(admin.username)}</p>
        <nav class="admin-nav">
          ${nav.map((item) => `<a href="${item.href}" class="${item.href === activeHref ? 'active' : ''}">${item.label}</a>`).join('')}
        </nav>
        <div style="margin-top:24px">
          <button class="btn btn-ghost btn-sm" id="logoutBtn">Log out</button>
        </div>
      </aside>
    `;
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await fetch('/api/admin/logout', { method: 'POST' });
      window.location.href = '/admin/login.html';
    });
  }

  return admin;
}
