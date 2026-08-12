// Hand-rolled validation — deliberately dependency-free. Every admin
// write goes through validateScriptInput() before touching the
// datastore; nothing from the client is trusted beyond what's checked
// here (no client-supplied id, views, or timestamps are ever read).

function isNonEmptyString(v, maxLen) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= maxLen;
}

function validateScriptInput(body) {
  const errors = {};
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: { _: 'Invalid request body.' } };
  }

  if (!isNonEmptyString(body.title, 150)) errors.title = 'Title is required (max 150 chars).';
  if (!isNonEmptyString(body.game_name, 150)) errors.game_name = 'Game name is required (max 150 chars).';
  if (typeof body.description !== 'undefined' && (typeof body.description !== 'string' || body.description.length > 2000)) {
    errors.description = 'Description must be under 2000 characters.';
  }
  if (!isNonEmptyString(body.code, 200_000)) errors.code = 'Script code is required.';
  if (typeof body.author !== 'undefined' && (typeof body.author !== 'string' || body.author.length > 80)) {
    errors.author = 'Author name must be under 80 characters.';
  }
  if (typeof body.tags !== 'undefined') {
    if (!Array.isArray(body.tags) || body.tags.length > 15 || !body.tags.every((t) => typeof t === 'string' && t.length <= 30)) {
      errors.tags = 'Tags must be an array of short strings (max 15).';
    }
  }
  if (body.thumbnail_url) {
    try {
      const u = new URL(body.thumbnail_url);
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error('bad protocol');
    } catch {
      errors.thumbnail_url = 'Thumbnail URL must be a valid http(s) URL.';
    }
  }

  if (Object.keys(errors).length > 0) return { valid: false, errors };

  return {
    valid: true,
    data: {
      title: body.title.trim(),
      game_name: body.game_name.trim(),
      description: (body.description || '').trim(),
      code: body.code,
      author: (body.author || 'Owner').trim() || 'Owner',
      tags: (body.tags || []).map((t) => t.trim()).filter(Boolean),
      thumbnail_url: body.thumbnail_url ? body.thumbnail_url.trim() : null,
      featured: !!body.featured,
    },
  };
}

function validateLogin(body) {
  if (!body || typeof body !== 'object') return { valid: false };
  if (!isNonEmptyString(body.username, 100)) return { valid: false };
  if (!isNonEmptyString(body.password, 500)) return { valid: false };
  return { valid: true, data: { username: body.username.trim(), password: body.password } };
}

function validateReport(body) {
  if (!body || typeof body !== 'object') return { valid: false };
  if (!isNonEmptyString(body.reason, 1000)) return { valid: false };
  return { valid: true, data: { reason: body.reason.trim() } };
}

module.exports = { validateScriptInput, validateLogin, validateReport };
      
