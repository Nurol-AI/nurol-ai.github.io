/* NuroChat Data Browser – file explorer for audit logs and context documents */

(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  let currentRoot = 'logs';
  let currentPath = '';

  const dataApiUrl = () => $('#data-api-url').value.replace(/\/+$/, '');
  const adminToken = () => $('#admin-token').value.trim();

  // ── Tab switching ──────────────────────────────────────────────────────

  $$('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      $('#chat-view').style.display = target === 'chat' ? '' : 'none';
      $('#chat-controls').style.display = target === 'chat' ? '' : 'none';
      $('#data-view').style.display = target === 'data' ? '' : 'none';
      $('#data-controls').style.display = target === 'data' ? '' : 'none';
      if (target === 'data') syncApiUrl();
    });
  });

  function syncApiUrl() {
    const chatUrl = $('#api-url').value;
    const dataUrl = $('#data-api-url');
    if (!dataUrl.value || dataUrl.value === 'http://localhost:8000') {
      dataUrl.value = chatUrl;
    }
  }

  // ── Token visibility toggle ────────────────────────────────────────────

  $('#token-toggle').addEventListener('click', () => {
    const inp = $('#admin-token');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  // ── Sidebar root switching ─────────────────────────────────────────────

  $$('.data-root').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.data-root').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentRoot = btn.dataset.root;
      navigateTo('');
    });
  });

  // ── API helpers ────────────────────────────────────────────────────────

  async function apiFetch(path) {
    const token = adminToken();
    if (!token) {
      showStatus('Enter an admin token above', true);
      return null;
    }
    const url = `${dataApiUrl()}/data/${currentRoot}/${path}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      const detail = await res.json().then((d) => d.detail).catch(() => res.statusText);
      throw new Error(`${res.status}: ${detail}`);
    }
    return res;
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  async function navigateTo(path) {
    currentPath = path;
    hidePreview();
    updateBreadcrumbs();
    showStatus('Loading...');

    try {
      const res = await apiFetch(path);
      if (!res) return;

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const entries = await res.json();
        renderFileList(entries);
        showStatus(`${entries.length} item${entries.length !== 1 ? 's' : ''}`);
      } else {
        const text = await res.text();
        showPreview(path.split('/').pop() || path, text, path);
        showStatus('');
      }
    } catch (err) {
      showStatus(err.message, true);
      renderFileList([]);
    }
  }

  // ── Breadcrumbs ────────────────────────────────────────────────────────

  function updateBreadcrumbs() {
    const nav = $('#breadcrumbs');
    nav.innerHTML = '';

    const rootCrumb = makeCrumb(currentRoot, '');
    nav.appendChild(rootCrumb);

    if (currentPath) {
      const parts = currentPath.split('/').filter(Boolean);
      let accumulated = '';
      for (let i = 0; i < parts.length; i++) {
        accumulated += (accumulated ? '/' : '') + parts[i];
        nav.appendChild(makeSep());
        const isLast = i === parts.length - 1;
        const crumb = makeCrumb(parts[i], accumulated);
        if (isLast) crumb.classList.add('current');
        nav.appendChild(crumb);
      }
    }
  }

  function makeCrumb(label, path) {
    const span = document.createElement('span');
    span.className = 'crumb';
    span.textContent = label;
    span.addEventListener('click', () => navigateTo(path));
    return span;
  }

  function makeSep() {
    const span = document.createElement('span');
    span.className = 'crumb-sep';
    span.textContent = '/';
    return span;
  }

  // ── File list rendering ────────────────────────────────────────────────

  function renderFileList(entries) {
    const tbody = $('#file-list tbody');
    const empty = $('#file-empty');
    const container = $('#file-list-container');
    const table = $('#file-list');

    tbody.innerHTML = '';

    if (currentPath) {
      const parentPath = currentPath.split('/').filter(Boolean).slice(0, -1).join('/');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-name"><span class="file-icon">&#x1F519;</span><span class="file-name-text is-dir">..</span></td>
        <td class="col-size"></td>
        <td class="col-modified"></td>
      `;
      tr.addEventListener('click', () => navigateTo(parentPath));
      tbody.appendChild(tr);
    }

    if (entries.length === 0 && !currentPath) {
      table.style.display = 'none';
      empty.style.display = '';
      return;
    }

    table.style.display = '';
    empty.style.display = 'none';

    for (const entry of entries) {
      const tr = document.createElement('tr');
      const icon = entry.is_dir ? '\uD83D\uDCC1' : fileIcon(entry.name);
      const nameClass = entry.is_dir ? 'file-name-text is-dir' : 'file-name-text';
      tr.innerHTML = `
        <td class="col-name"><span class="file-icon">${icon}</span><span class="${nameClass}">${escHtml(entry.name)}</span></td>
        <td class="col-size">${entry.is_dir ? '' : formatSize(entry.size)}</td>
        <td class="col-modified">${formatDate(entry.modified)}</td>
      `;
      tr.addEventListener('click', () => {
        const childPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        if (entry.is_dir) {
          navigateTo(childPath);
        } else {
          openFile(childPath, entry.name);
        }
      });
      tbody.appendChild(tr);
    }
  }

  // ── File preview ───────────────────────────────────────────────────────

  let previewFilePath = '';

  async function openFile(path, filename) {
    showStatus('Loading file...');
    try {
      const res = await apiFetch(path);
      if (!res) return;
      const text = await res.text();
      showPreview(filename, text, path);
      showStatus('');
    } catch (err) {
      showStatus(err.message, true);
    }
  }

  function showPreview(filename, content, path) {
    previewFilePath = path;
    $('#file-list-container').style.display = 'none';
    $('#file-preview').style.display = '';
    $('#preview-filename').textContent = filename;
    $('#preview-content').textContent = content;
  }

  function hidePreview() {
    $('#file-preview').style.display = 'none';
    $('#file-list-container').style.display = '';
    previewFilePath = '';
  }

  $('#preview-close').addEventListener('click', () => {
    hidePreview();
  });

  $('#preview-download').addEventListener('click', async () => {
    if (!previewFilePath) return;
    try {
      const res = await apiFetch(previewFilePath);
      if (!res) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = previewFilePath.split('/').pop();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showStatus(err.message, true);
    }
  });

  // ── Status bar ─────────────────────────────────────────────────────────

  function showStatus(text, isError) {
    const el = $('#data-status');
    el.textContent = text;
    el.className = isError ? 'data-status error' : 'data-status';
  }

  // ── Utilities ──────────────────────────────────────────────────────────

  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return iso;
    }
  }

  function fileIcon(name) {
    if (name.endsWith('.jsonl') || name.endsWith('.json')) return '\uD83D\uDCCB';
    if (name.endsWith('.md')) return '\uD83D\uDCC4';
    if (name.endsWith('.yaml') || name.endsWith('.yml')) return '\u2699\uFE0F';
    if (name.endsWith('.txt')) return '\uD83D\uDCC4';
    return '\uD83D\uDCC4';
  }

  function escHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
