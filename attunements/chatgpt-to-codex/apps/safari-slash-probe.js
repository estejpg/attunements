(() => {
  if (typeof window.__attuneSafariChatGptToCodexCleanup === 'function') {
    window.__attuneSafariChatGptToCodexInsert?.();
    return 'connected';
  }
  const selector = '#prompt-textarea, form[data-type="unified-composer"] textarea, form[data-type="unified-composer"] [contenteditable="true"], textarea, [contenteditable="true"][role="textbox"], [contenteditable="true"][data-lexical-editor="true"]';
  const active = document.activeElement?.matches?.(selector) ? document.activeElement : document.activeElement?.closest?.(selector);
  const input = active || [...document.querySelectorAll(selector)].find((node) => node.getBoundingClientRect().width > 0);
  const value = input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement ? input.value : input?.innerText || input?.textContent || '';
  const source = String(value).trimEnd();
  const previous = source.charCodeAt(source.length - 2);
  const slashPending = source.endsWith('/') && (source.length === 1 || previous === 32 || previous === 9 || previous === 10 || previous === 13);
  return slashPending ? 'slash' : 'idle';
})()