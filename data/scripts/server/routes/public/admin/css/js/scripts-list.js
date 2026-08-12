document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('navbar-mount');
  renderFooter('footer-mount');

  const params = new URLSearchParams(window.location.search);
  const filter = params.get('filter') || '';
  const section = filter === 'featured' ? 'featured' : filter === 'popular' ? 'popular' : 'latest';

  try {
    const res = await fetch(`/api/scripts?section=${section}&limit=100`);
    const data = await res.json();
    const scripts = data.scripts || [];
    document.getElementById('countLabel').textContent = `${scripts.length} script${scripts.length === 1 ? '' : 's'} available`;
    renderScriptCards(document.getElementById('grid'), scripts);
  } catch {
    document.getElementById('countLabel').textContent = 'Something went wrong loading scripts.';
  }
});
