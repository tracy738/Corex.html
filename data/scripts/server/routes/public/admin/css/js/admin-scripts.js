let rows = [];

document.addEventListener('DOMContentLoaded', async () => {
  const admin = await initAdminShell('/admin/scripts.html');
  if (!admin) return;
  await loadRows();
});

async function loadRows() {
  const mount = document.getElementById('tableMount');
  try {
    const res = await fetch('/api/admin/scripts');
    const data = await res.json();
    rows = data.scripts || [];
    renderTable();
  } catch {
    mount.innerHTML = '<p class="error-text">Failed to load scripts.</p>';
  }
}

function renderTable() {
  const mount = document.getElementById('tableMount');

  if (rows.length === 0) {
    mount.innerHTML = `
      <div class="empty-state">
        No scripts yet. <a href="/admin/create.html" style="color:var(--signal-soft)">Add your first one.</a>
      </div>
    `;
    return;
  }

  mount.innerHTML = `
    <div class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>Title</th><th>Game</th><th>Views</th><th>Featured</th><th></th></tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
  `;

  const tbody = document.getElementById('tbody');
  tbody.innerHTML = rows
    .map(
      (r) => `
      <tr data-id="${r.id}">
        <td>${escapeHTML(r.title)}</td>
        <td style="color:var(--ink-500)">${escapeHTML(r.game_name)}</td>
        <td style="color:var(--ink-500)">${Number(r.views).toLocaleString()}</td>
        <td><button class="pill-toggle ${r.featured ? 'on' : 'off'}" data-action="feature" data-id="${r.id}">${r.featured ? 'Featured' : 'Feature it'}</button></td>
        <td>
          <div class="actions-cell">
            <a href="/script.html?id=${r.id}" target="_blank" class="btn btn-ghost btn-sm">View</a>
            <a href="/admin/edit.html?id=${r.id}" class="btn btn-ghost btn-sm">Edit</a>
            <button class="btn btn-danger btn-sm" data-action="delete" data-id="${r.id}" data-title="${escapeHTML(r.title)}">Delete</button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');

  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id, btn.dataset.title));
  });
  tbody.querySelectorAll('[data-action="feature"]').forEach((btn) => {
    btn.addEventListener('click', () => toggleFeatured(btn.dataset.id));
  });
}

async function handleDelete(id, title) {
  if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
  const res = await fetch(`/api/admin/scripts/${id}`, { method: 'DELETE' });
  if (res.ok) {
    rows = rows.filter((r) => String(r.id) !== String(id));
    renderTable();
  }
}

async function toggleFeatured(id) {
  const full = await (await fetch(`/api/admin/scripts/${id}`)).json();
  const script = full.script;
  const row = rows.find((r) => String(r.id) === String(id));
  const res = await fetch(`/api/admin/scripts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: script.title,
      game_name: script.game_name,
      description: script.description,
      code: script.code,
      author: script.author,
      tags: script.tags || [],
      thumbnail_url: script.thumbnail_url || undefined,
      featured: !row.featured,
    }),
  });
  if (res.ok) {
    row.featured = !row.featured;
    renderTable();
  }
               }
                       
