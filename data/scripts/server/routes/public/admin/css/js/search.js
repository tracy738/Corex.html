let currentSort = 'newest';
let debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('navbar-mount');
  renderFooter('footer-mount');

  const params = new URLSearchParams(window.location.search);
  const q = params.get('q') || '';
  currentSort = params.get('sort') || 'newest';

  document.getElementById('searchInput').value = q;
  updateSortPills();

  document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    runSearch();
  });
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runSearch, 250);
  });
  document.querySelectorAll('.sort-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentSort = btn.dataset.sort;
      updateSortPills();
      runSearch();
    });
  });

  if (q) runSearch();
});

function updateSortPills() {
  document.querySelectorAll('.sort-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.sort === currentSort);
  });
}

async function runSearch() {
  const q = document.getElementById('searchInput').value.trim();
  const url = new URL(window.location.href);
  url.searchParams.set('q', q);
  url.searchParams.set('sort', currentSort);
  window.history.replaceState({}, '', url);

  const msg = document.getElementById('resultsMsg');
  const grid = document.getElementById('grid');

  if (!q) {
    msg.textContent = 'Type something to search.';
    msg.style.display = 'block';
    grid.innerHTML = '';
    return;
  }

  msg.textContent = 'Searching…';
  msg.style.display = 'block';
  grid.innerHTML = '';

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&sort=${currentSort}`);
    const data = await res.json();
    const scripts = data.scripts || [];
    if (scripts.length === 0) {
      msg.textContent = `No scripts found for "${q}".`;
      msg.style.display = 'block';
    } else {
      msg.style.display = 'none';
      renderScriptCards(grid, scripts);
    }
  } catch {
    msg.textContent = 'Something went wrong. Try again.';
    msg.style.display = 'block';
  }
      }
        
