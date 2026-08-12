function renderScriptForm(mountId, { mode, id, initial }) {
  const mount = document.getElementById(mountId);
  const v = initial || {};
  const tagsStr = Array.isArray(v.tags) ? v.tags.join(', ') : '';

  mount.innerHTML = `
    <form id="scriptForm">
      <div class="field-row">
        <div class="field">
          <label for="f_title">Script Title</label>
          <input id="f_title" required maxlength="150" placeholder="e.g. Auto Farm" value="${escapeAttr(v.title)}">
        </div>
        <div class="field">
          <label for="f_game">Game Name</label>
          <input id="f_game" required maxlength="150" placeholder="e.g. Blox Fruits" value="${escapeAttr(v.game_name)}">
        </div>
      </div>

      <div class="field">
        <label for="f_desc">Description</label>
        <textarea id="f_desc" required maxlength="2000" rows="3" placeholder="What does this script do?">${escapeHTML(v.description || '')}</textarea>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="f_author">Author</label>
          <input id="f_author" value="${escapeAttr(v.author || 'Owner')}">
        </div>
        <div class="field">
          <label for="f_tags">Tags (comma separated)</label>
          <input id="f_tags" placeholder="farm, gui, free" value="${escapeAttr(tagsStr)}">
        </div>
      </div>

      <div class="field">
        <label for="f_thumb">Thumbnail URL (optional)</label>
        <input id="f_thumb" type="url" placeholder="https://…" value="${escapeAttr(v.thumbnail_url || '')}">
      </div>

      <div class="field">
        <label for="f_code">Lua Script Code</label>
        <textarea id="f_code" class="code" required rows="16" spellcheck="false" placeholder="-- paste your Lua code here">${escapeHTML(v.code || '')}</textarea>
      </div>

      <label class="checkbox-row">
        <input type="checkbox" id="f_featured" ${v.featured ? 'checked' : ''}>
        Feature this script on the homepage
      </label>

      <p class="error-text" id="formError" style="display:none"></p>

      <button type="submit" class="btn btn-primary" id="submitBtn">
        ${mode === 'create' ? 'Publish Script' : 'Save Changes'}
      </button>
    </form>
  `;

  document.getElementById('scriptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const errorEl = document.getElementById('formError');
    errorEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const payload = {
      title: document.getElementById('f_title').value,
      game_name: document.getElementById('f_game').value,
      description: document.getElementById('f_desc').value,
      code: document.getElementById('f_code').value,
      author: document.getElementById('f_author').value,
      tags: document
        .getElementById('f_tags')
        .value.split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      thumbnail_url: document.getElementById('f_thumb').value || undefined,
      featured: document.getElementById('f_featured').checked,
    };

    try {
      const url = mode === 'create' ? '/api/admin/scripts' : `/api/admin/scripts/${id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.error || 'Failed to save script.';
        errorEl.style.display = 'block';
        return;
      }
      window.location.href = '/admin/scripts.html';
    } catch {
      errorEl.textContent = 'Something went wrong. Try again.';
      errorEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = mode === 'create' ? 'Publish Script' : 'Save Changes';
    }
  });
}

function escapeAttr(str) {
  return escapeHTML(str || '').replace(/"/g, '&quot;');
        }
    
