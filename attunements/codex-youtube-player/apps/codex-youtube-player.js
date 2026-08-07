(() => {
  const validVideoId = (value) => /^[A-Za-z0-9_-]{6,}$/.test(value || '') ? value : null;
  const host = (role) => window.__attuneHost?.resolve?.(role) || null;
  let shownVideoId = null;

  const remove = () => document.getElementById('attune-codex-youtube-player')?.remove();
  const render = (state) => {
    const payload = state?.payload;
    const videoId = validVideoId(payload?.videoId);
    const updatedAt = Date.parse(state?.updatedAt || '');
    if (!videoId || !Number.isFinite(updatedAt) || Date.now() - updatedAt > 8000) { remove(); shownVideoId = null; return; }
    let root = document.getElementById('attune-codex-youtube-player');
    const seconds = Math.max(0, Math.floor(Number(payload.currentTime) || 0));
    const label = payload.isPlaying ? 'Playing in Chrome' : 'Paused in Chrome';
    if (!root || shownVideoId !== videoId) {
      root?.remove();
      root = document.createElement('aside');
      root.id = 'attune-codex-youtube-player';
      root.setAttribute('aria-label', 'YouTube player from Google Chrome');
      root.innerHTML = '<header><strong></strong><span class="attune-youtube-status"></span></header><iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="YouTube video"></iframe><footer><button type="button">Sync to Chrome</button><a target="_blank" rel="noreferrer">Open in YouTube</a></footer>';
      (host('document.body') || document.body).append(root);
      shownVideoId = videoId;
    }
    root.querySelector('strong').textContent = payload.title || 'YouTube video';
    root.querySelector('.attune-youtube-status').textContent = label;
    const iframe = root.querySelector('iframe');
    const embedUrl = 'https://www.youtube-nocookie.com/embed/' + videoId + '?rel=0&start=' + seconds;
    if (!iframe.getAttribute('src')) iframe.src = embedUrl;
    const link = root.querySelector('a');
    link.href = payload.videoUrl || 'https://www.youtube.com/watch?v=' + videoId;
    root.querySelector('button').onclick = () => { iframe.src = embedUrl; };
  };
  const refresh = () => {
    render(window.__attuneWorkspaceBridge?.['youtube-now-playing'] || null);
  };
  window.__attuneCodexYoutubeRefresh = refresh;
  clearInterval(window.__attuneCodexYoutubeInterval);
  window.__attuneCodexYoutubeInterval = setInterval(refresh, 1000);
  refresh();
  const cleanup = () => { clearInterval(window.__attuneCodexYoutubeInterval); remove(); };
  window.__attuneCodexYoutubeCleanup = cleanup;
  window.__attuneRegisterCleanup?.(cleanup);
})();
