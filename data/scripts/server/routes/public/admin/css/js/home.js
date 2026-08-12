document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('navbar-mount');
  renderFooter('footer-mount');

  document.getElementById('heroSearchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('heroSearchInput').value.trim();
    window.location.href = q ? `/search.html?q=${encodeURIComponent(q)}` : '/search.html';
  });

  const [featured, latest, popular] = await Promise.all([
    fetchScripts('featured', 3),
    fetchScripts('latest', 6),
    fetchScripts('popular', 6),
  ]);

  showSection('featuredSection', 'featuredGrid', featured);
  showSection('latestSection', 'latestGrid', latest);
  showSection('popularSection', 'popularGrid', popular);

  const total = new Set([...featured, ...latest, ...popular].map((s) => s.id)).size;
  document.getElementById('heroCount').textContent = `${latest.length ? 'scripts' : '0 scripts'}`;

  if (featured.length === 0 && latest.length === 0 && popular.length === 0) {
    document.getElementById('emptyState').style.display = 'block';
  }

  // Fetch a rough total count via the "latest" list length isn't accurate for the pill,
  // so ask search with no query for a full count instead.
  try {
    const res = await fetch('/api/search?q=');
    const data = await res.json();
    document.getElementById('heroCount').textContent = `${(data.scripts || []).length} scripts`;
  } catch {
    /* non-critical */
  }
});

async function fetchScripts(section, limit) {
  try {
    const res = await fetch(`/api/scripts?section=${section}&limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.scripts || [];
  } catch {
    return [];
  }
}

function showSection(sectionId, gridId, scripts) {
  if (!scripts || scripts.length === 0) return;
  document.getElementById(sectionId).style.display = '';
  renderScriptCards(document.getElementById(gridId), scripts);
}
  
