(() => {
  const bridgeUrl = 'http://127.0.0.1:47655/v1/youtube-now-playing';
  const host = (role) => window.__attuneHost?.resolve?.(role) || null;
  let lastSignature = '';
  let lastPublishedAt = 0;

  const videoIdFromUrl = (url) => {
    try {
      const parsed = new URL(url);
      if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/i.test(parsed.hostname)) return null;
      if (parsed.hostname.endsWith('youtu.be')) return parsed.pathname.split('/').filter(Boolean)[0] || null;
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
      const parts = parsed.pathname.split('/').filter(Boolean);
      return ['shorts', 'live', 'embed'].includes(parts[0]) ? parts[1] || null : null;
    } catch { return null; }
  };
  const publish = (payload) => fetch(bridgeUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }).catch(() => {});
  const collect = () => {
    const videoId = videoIdFromUrl(location.href);
    if (!videoId) return;
    const video = host('youtube.player') || document.querySelector('video');
    const currentTime = Number.isFinite(video?.currentTime) ? video.currentTime : 0;
    const payload = {
      videoUrl: location.href,
      videoId,
      title: (document.querySelector('h1 yt-formatted-string')?.textContent || document.title || 'YouTube video').trim(),
      currentTime,
      isPlaying: Boolean(video && !video.paused && !video.ended),
    };
    const signature = videoId + ':' + Math.floor(currentTime) + ':' + payload.isPlaying;
    if (signature !== lastSignature || Date.now() - lastPublishedAt > 3000) {
      publish(payload);
      lastPublishedAt = Date.now();
    }
    lastSignature = signature;
  };
  clearInterval(window.__attuneYoutubeSourceInterval);
  window.__attuneYoutubeSourceInterval = setInterval(collect, 1000);
  collect();
  const cleanup = () => {
    clearInterval(window.__attuneYoutubeSourceInterval);
  };
  window.__attuneYoutubeSourceCleanup = cleanup;
  window.__attuneRegisterCleanup?.(cleanup);
})();
