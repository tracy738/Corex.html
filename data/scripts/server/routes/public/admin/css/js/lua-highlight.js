// Minimal Lua syntax highlighter — regex-based, no external library, so
// the page's Content-Security-Policy can stay locked to 'self' with no
// third-party script/style hosts.

const LUA_KEYWORDS = new Set([
  'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
  'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then',
  'true', 'until', 'while', 'goto',
]);

const LUA_GLOBALS = new Set([
  'game', 'workspace', 'script', 'Instance', 'Vector3', 'CFrame', 'Color3',
  'UDim2', 'UDim', 'Enum', 'wait', 'print', 'pairs', 'ipairs', 'pcall',
  'tostring', 'tonumber', 'require', 'task', 'string', 'table', 'math',
  'os', 'coroutine', 'Players', 'RunService', 'ReplicatedStorage',
]);

function highlightLua(code) {
  const lines = code.split('\n');
  return lines
    .map((line) => `<span class="code-line">${highlightLine(line)}</span>`)
    .join('\n');
}

function highlightLine(line) {
  // Tokenize on comments, strings, numbers, identifiers, and everything else.
  const tokenRe = /(--.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+\.?\d*\b)|([A-Za-z_][A-Za-z0-9_]*)/g;
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = tokenRe.exec(line)) !== null) {
    result += escapeHTML(line.slice(lastIndex, match.index));
    const [full, comment, string, number, word] = match;

    if (comment) {
      result += `<span class="tok-com">${escapeHTML(comment)}</span>`;
    } else if (string) {
      result += `<span class="tok-str">${escapeHTML(string)}</span>`;
    } else if (number) {
      result += `<span class="tok-num">${escapeHTML(number)}</span>`;
    } else if (word) {
      if (LUA_KEYWORDS.has(word)) {
        result += `<span class="tok-kw">${escapeHTML(word)}</span>`;
      } else if (LUA_GLOBALS.has(word)) {
        result += `<span class="tok-global">${escapeHTML(word)}</span>`;
      } else {
        result += escapeHTML(word);
      }
    }
    lastIndex = tokenRe.lastIndex;
  }
  result += escapeHTML(line.slice(lastIndex));
  return result || '&nbsp;';
}
