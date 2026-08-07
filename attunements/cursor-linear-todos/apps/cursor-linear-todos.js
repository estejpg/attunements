(() => {
  const host = (role) => window.__attuneHost?.resolve?.(role) || null;
  const documentHost = () => host('document.body') || document.body;
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const readTodos = async () => {
    const state = window.__attuneWorkspaceBridge?.['linear-todos'] || null;
    return { issues: Array.isArray(state?.payload?.issues) ? state.payload.issues : [], updatedAt: state?.updatedAt || null };
  };
  const close = () => { const panel = document.getElementById('attune-codex-linear-todos-modal'); if (panel) { panel.dataset.expanded = 'false'; const expand = panel.querySelector('[data-expand]'); if (expand) { expand.textContent = '+'; expand.setAttribute('aria-expanded', 'false'); } } };
  const closeIssue = (returnToTasks = true) => { document.getElementById('attune-codex-linear-issue-modal')?.remove(); if (returnToTasks) document.documentElement.dataset.attuneLinearTodosAction = JSON.stringify({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), key: '', type: 'my-issues' }); };
  const complete = async (button, issue) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    button.disabled = true; button.textContent = 'Completing…';
    try {
      document.documentElement.dataset.attuneLinearTodosAction = JSON.stringify({ id, key: issue.key });
      for (let attempt = 0; attempt < 16; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const result = window.__attuneWorkspaceBridge?.['linear-todos-completion'];
        if (result?.payload?.id !== id) continue;
        if (result.payload.status === 'completed') {
          button.closest('li')?.classList.add('attune-linear-completed');
          button.textContent = 'Completed';
          button.setAttribute('aria-label', issue.key + ' is completed');
          return;
        }
        throw new Error(result.payload.message || 'Linear could not complete this issue.');
      }
      throw new Error('Timed out waiting for Linear. Keep Linear open and try again.');
    } catch (error) {
      button.disabled = false; button.textContent = 'Complete';
      const subtitle = button.closest('[role="document"]')?.querySelector('header span');
      if (subtitle) subtitle.textContent = error instanceof Error ? error.message : 'Unable to complete this issue.';
    }
  };
  const openIssue = async (issue) => {
    closeIssue(false);
    const modal = document.createElement('div');
    modal.id = 'attune-codex-linear-issue-modal';
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = '<section role="document"><div class="attune-linear-issue-copy"><p class="attune-linear-issue-key">' + escapeHtml(issue.key) + '</p><h2>' + escapeHtml(issue.title) + '</h2><p data-details>Loading issue details from Linear…</p><div data-priority></div></div><footer><button type="button" data-close>Close</button><button type="button" data-complete>Complete</button><button type="button" data-focus>Open in Linear</button></footer></section>';
    modal.addEventListener('click', (event) => { if (event.target === modal) closeIssue(); });
    modal.querySelector('[data-close]')?.addEventListener('click', closeIssue);
    modal.querySelector('[data-complete]')?.addEventListener('click', () => void complete(modal.querySelector('[data-complete]'), issue));
    modal.querySelector('[data-focus]')?.addEventListener('click', () => { document.documentElement.dataset.attuneLinearTodosAction = JSON.stringify({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), key: issue.key, type: 'focus' }); });
    documentHost().append(modal);
    modal.querySelector('[data-complete]')?.focus();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    document.documentElement.dataset.attuneLinearTodosAction = JSON.stringify({ id, key: issue.key, href: issue.href, type: 'details' });
    for (let attempt = 0; attempt < 18; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const result = window.__attuneWorkspaceBridge?.['linear-todos-details'];
      if (result?.payload?.id !== id) continue;
      const details = modal.querySelector('[data-details]');
      if (!details) return;
      details.textContent = result.payload.status === 'ready' ? result.payload.details : (result.payload.message || 'Unable to load the Linear issue.');
      details.style.whiteSpace = 'pre-wrap';
      const priority = modal.querySelector('[data-priority]');
      if (priority && result.payload.status === 'ready') {
        priority.innerHTML = '<p class="attune-linear-issue-key">Priority · ' + escapeHtml(result.payload.priority || 'No priority') + '</p><div>' + ['No priority', 'Urgent', 'High', 'Medium', 'Low'].map((value) => '<button type="button" data-priority="' + value + '"' + (value === (result.payload.priority || 'No priority') ? ' aria-pressed="true"' : '') + '>' + value + '</button>').join('') + '</div>';
        priority.querySelectorAll('[data-priority]').forEach((button) => button.addEventListener('click', async () => { const value = button.dataset.priority; const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7); button.disabled = true; document.documentElement.dataset.attuneLinearTodosAction = JSON.stringify({ id, key: issue.key, type: 'priority', value }); for (let attempt = 0; attempt < 16; attempt += 1) { await new Promise((resolve) => setTimeout(resolve, 500)); const response = window.__attuneWorkspaceBridge?.['linear-todos-details']; if (response?.payload?.id !== id) continue; button.disabled = false; if (response.payload.status === 'ready') { priority.querySelector('.attune-linear-issue-key').textContent = 'Priority · ' + (response.payload.priority || value); priority.querySelectorAll('[data-priority]').forEach((choice) => choice.setAttribute('aria-pressed', String(choice.dataset.priority === response.payload.priority))); } return; } button.disabled = false; }));
      }
      return;
    }
    const details = modal.querySelector('[data-details]');
    if (details) details.textContent = 'Timed out waiting for Linear. Keep Linear open and try again.';
  };
  const refresh = async () => {
    const modal = document.getElementById('attune-codex-linear-todos-modal');
    if (!modal) return;
    const { issues, updatedAt } = await readTodos();
    if (modal.dataset.updatedAt === (updatedAt || '')) return;
    modal.dataset.updatedAt = updatedAt || '';
    const list = modal.querySelector('#attune-codex-linear-todos-list');
    const listWrap = modal.querySelector('#attune-codex-linear-todos-list-wrap');
    list.innerHTML = issues.length
      ? issues.map((issue, index) => { const status = String(issue.workflowState || '').trim(); const statusKey = status.toLowerCase().replace(/\s+/g, '-'); const meta = '<strong>' + escapeHtml(issue.key) + (status ? '<em class="attune-linear-status" data-status="' + escapeHtml(statusKey) + '">' + escapeHtml(status) + '</em>' : '') + '</strong>'; return '<li><button type="button" data-index="' + index + '">' + meta + '<span>' + escapeHtml(issue.title) + '</span></button></li>'; }).join('')
      : '<li id="attune-codex-linear-todos-empty">No tasks yet. Open Linear on your to-do view to load tasks.</li>';
    const syncListScrollbar = () => {
      if (!list || !listWrap) return;
      const maximum = Math.max(0, list.scrollHeight - list.clientHeight);
      const scrollable = maximum > 1;
      listWrap.dataset.scrollable = String(scrollable);
      if (!scrollable) return;
      const thumb = Math.max(28, Math.round((list.clientHeight * list.clientHeight) / list.scrollHeight));
      const track = Math.max(0, list.clientHeight - thumb - 16);
      const offset = maximum ? Math.round((list.scrollTop / maximum) * track) : 0;
      listWrap.style.setProperty('--attune-linear-scroll-thumb-size', thumb + 'px');
      listWrap.style.setProperty('--attune-linear-scroll-thumb-offset', offset + 'px');
    };
    list.onscroll = syncListScrollbar;
    requestAnimationFrame(syncListScrollbar);
    list.querySelectorAll('button[data-index]').forEach((button) => button.addEventListener('click', () => openIssue(issues[Number(button.dataset.index)])));
  };
  const open = async () => {
    if (document.getElementById('attune-codex-linear-todos-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'attune-codex-linear-todos-modal';
    modal.setAttribute('aria-labelledby', 'attune-codex-linear-todos-title');
    modal.dataset.expanded = 'false';
    modal.innerHTML = '<section role="document"><header><h2 id="attune-codex-linear-todos-title"><img id="attune-codex-linear-todos-logo" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHBhdGggZmlsbD0iIzIyMjMyNiIgZD0iTTEuMjI1NDEgNjEuNTIyOGMtLjIyMjUtLjk0ODUuOTA3NDgtMS41NDU5IDEuNTk2MzgtLjg1N0wzOS4zMzQyIDk3LjE3ODJjLjY4ODkuNjg4OS4wOTE1IDEuODE4OS0uODU3IDEuNTk2NEMyMC4wNTE1IDk0LjQ1MjIgNS41NDc3OSA3OS45NDg1IDEuMjI1NDEgNjEuNTIyOFpNLjAwMTg5MTM1IDQ2Ljg4OTFjLS4wMTc2NDM3NS4yODMzLjA4ODg3MjE1LjU1OTkuMjg5NTcxNjUuNzYwNkw1Mi4zNTAzIDk5LjcwODVjLjIwMDcuMjAwNy40NzczLjMwNzUuNzYwNi4yODk2IDIuMzY5Mi0uMTQ3NiA0LjY5MzgtLjQ2IDYuOTYyNC0uOTI1OS43NjQ1LS4xNTcgMS4wMzAxLTEuMDk2My40NzgyLTEuNjQ4MUwyLjU3NTk1IDM5LjQ0ODVjLS41NTE4Ni0uNTUxOS0xLjQ5MTE3LS4yODYzLTEuNjQ4MTc0LjQ3ODItLjQ2NTkxNSAyLjI2ODYtLjc3ODMyIDQuNTkzMi0uOTI1ODg0NjUgNi45NjI0Wk00LjIxMDkzIDI5LjcwNTRjLS4xNjY0OS4zNzM4LS4wODE2OS44MTA2LjIwNzY1IDEuMWw2NC43NzYwMiA2NC43NzZjLjI4OTQuMjg5NC43MjYyLjM3NDIgMS4xLjIwNzcgMS43ODYxLS43OTU2IDMuNTE3MS0xLjY5MjcgNS4xODU1LTIuNjg0LjU1MjEtLjMyOC42MzczLTEuMDg2Ny4xODMyLTEuNTQwN0w4LjQzNTY2IDI0LjMzNjdjLS40NTQwOS0uNDU0MS0xLjIxMjcxLS4zNjg5LTEuNTQwNzQuMTgzMi0uOTkxMzIgMS42Njg0LTEuODg4NDMgMy4zOTk0LTIuNjgzOTkgNS4xODU1Wk0xMi42NTg3IDE4LjA3NGMtLjM3MDEtLjM3MDEtLjM5My0uOTYzNy0uMDQ0My0xLjM1NDFDMjEuNzc5NSA2LjQ1OTMxIDM1LjExMTQgMCA0OS45NTE5IDAgNzcuNTkyNyAwIDEwMCAyMi40MDczIDEwMCA1MC4wNDgxYzAgMTQuODQwNS02LjQ1OTMgMjguMTcyNC0xNi43MTk5IDM3LjMzNzUtLjM5MDMuMzQ4Ny0uOTg0LjMyNTgtMS4zNTQyLS4wNDQzTDEyLjY1ODcgMTguMDc0WiIvPjwvc3ZnPg==" alt="" />Tasks</h2><button type="button" data-expand aria-label="Show tasks" aria-expanded="false">+</button></header><div id="attune-codex-linear-todos-list-wrap"><ol id="attune-codex-linear-todos-list"></ol><i id="attune-codex-linear-todos-list-scrollbar" aria-hidden="true"></i></div></section>';
    modal.querySelector('[data-expand]')?.addEventListener('click', (event) => { const expanded = modal.dataset.expanded !== 'true'; modal.dataset.expanded = String(expanded); event.currentTarget.textContent = expanded ? '−' : '+'; event.currentTarget.setAttribute('aria-expanded', String(expanded)); });
    documentHost().append(modal);
    modal.querySelector('button')?.focus();
    await refresh();
  };
  const render = () => {
    void open();
  };
  const onKeydown = (event) => { if (event.key === 'Escape') { if (document.getElementById('attune-codex-linear-issue-modal')) closeIssue(); else close(); } };
  render(); document.addEventListener('keydown', onKeydown);
  clearInterval(window.__attuneCodexLinearTodosRefresh);
  window.__attuneCodexLinearTodosRefresh = setInterval(() => void refresh(), 1500);
  const cleanup = () => { document.removeEventListener('keydown', onKeydown); clearInterval(window.__attuneCodexLinearTodosRefresh); document.getElementById('attune-codex-linear-todos-modal')?.remove(); closeIssue(); };
  window.__attuneCodexLinearTodosCleanup = cleanup;
  window.__attuneRegisterCleanup?.(cleanup);
})();
