(() => {
  const bridgeUrl = 'http://127.0.0.1:47655/v1/linear-todos';
  const actionUrl = 'http://127.0.0.1:47655/v1/linear-todos-action';
  const completionUrl = 'http://127.0.0.1:47655/v1/linear-todos-completion';
  const host = (role) => window.__attuneHost?.resolve?.(role) || null;
  const issueListHost = () => host('linear.issueList') || host('linear.workspace') || document;
  const issueDetailHost = () => host('linear.issueDetail') || host('linear.workspace') || document;
  let lastSignature = '';
  let lastActionId = '';
  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  const collect = () => {
    const seen = new Set();
    const issues = [...issueListHost().querySelectorAll('a[href*="/issue/"], a[href*="/team/"]')]
      .map((node) => {
        const text = (node.innerText || node.textContent || node.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
        const href = node.href || '';
        const key = text.match(/\b[A-Z][A-Z0-9]+-\d+\b/)?.[0] || href.match(/\/issue\/([A-Z][A-Z0-9]+-\d+)/)?.[1] || '';
        const title = text.includes(key)
          ? text.slice(text.indexOf(key) + key.length).replace(/\s+Created\b.*$/i, '').trim()
          : decodeURIComponent(href.split('/').filter(Boolean).at(-1) || '').replace(/-/g, ' ');
        return { key, title, href };
      })
      .filter((issue) => issue.key && issue.title && issue.title.length > 2)
      .filter((issue) => !seen.has(issue.key) && seen.add(issue.key))
      .slice(0, 20);
    const signature = JSON.stringify(issues);
    if (signature === lastSignature) return;
    lastSignature = signature;
    fetch(bridgeUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ issues }),
    }).catch(() => {});
  };
  const complete = async (action) => {
    const key = String(action?.key || '');
    const links = [...issueListHost().querySelectorAll('a[href*="/issue/"], a[href*="/team/"]')];
    const issueLink = links.find((link) => (link.innerText || link.textContent || '').includes(key));
    if (!issueLink) throw new Error('Could not find this issue in the current Linear view.');
    issueLink.click();
    await wait(700);
    const button = [...issueDetailHost().querySelectorAll('button, [role="button"]')].find((element) => {
      const label = ((element.getAttribute('aria-label') || '') + ' ' + (element.innerText || element.textContent || '')).replace(/\s+/g, ' ').trim().toLowerCase();
      return !label.includes('incomplete') && (label.includes('mark as complete') || label === 'complete' || label === 'done');
    });
    if (!button) throw new Error('Linear did not expose a Complete button for this issue.');
    button.click();
  };
  const checkAction = async () => {
    try {
      const state = await fetch(actionUrl, { cache: 'no-store' }).then((response) => response.json());
      const action = state?.payload;
      if (!action?.id || action.id === lastActionId || action.type !== 'complete') return;
      lastActionId = action.id;
      try {
        await complete(action);
        await fetch(completionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: action.id, key: action.key, status: 'completed' }) });
        setTimeout(collect, 900);
      } catch (error) {
        await fetch(completionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: action.id, key: action.key, status: 'error', message: error instanceof Error ? error.message : 'Unable to complete this issue.' }) });
      }
    } catch {}
  };
  clearInterval(window.__attuneLinearTodosSource);
  window.__attuneLinearTodosSource = setInterval(collect, 1500);
  clearInterval(window.__attuneLinearTodosActions);
  window.__attuneLinearTodosActions = setInterval(checkAction, 700);
  collect();
  checkAction();
  const cleanup = () => { clearInterval(window.__attuneLinearTodosSource); clearInterval(window.__attuneLinearTodosActions); };
  window.__attuneLinearTodosSourceCleanup = cleanup;
  window.__attuneRegisterCleanup?.(cleanup);
})();
