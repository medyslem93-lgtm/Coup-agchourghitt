(() => {
  'use strict';

  const main = document.getElementById('appMain');
  const cfg = window.AGCH_CONFIG || {};
  if (!main) return;

  const rootRoute = () => (location.hash.replace(/^#\/?/, '') || 'home').split('/').filter(Boolean)[0] || 'home';
  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeName = (value = 'video') => String(value || 'video').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 80) || 'video';
  const isVideoAsset = (asset) => asset && (asset.media_type === 'video' || String(asset.kind || '').toLowerCase().includes('video') || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(asset.public_url || ''));

  let db = null;
  if (window.supabase?.createClient && cfg.supabaseUrl && cfg.supabaseKey) {
    db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-client-info': 'aghchorguit-watch-center-v2' } },
    });
  }

  let videoAssets = [];
  let loadingAssets = null;
  let enhanceTimer = 0;

  const style = document.createElement('style');
  style.id = 'aghWatchCenterV2Styles';
  style.textContent = `
    .agh-watch-actions{display:flex;gap:8px;padding:0 12px 12px}.agh-watch-actions button{min-height:40px;border:0;border-radius:11px;padding:9px 12px;font:900 12px/1.2 Cairo,sans-serif;cursor:pointer}.agh-watch-actions [data-watch-open-url]{flex:1;background:var(--accent,#c7ff37);color:#071008}.agh-watch-actions [data-watch-download-url]{background:rgba(255,255,255,.07);color:inherit;border:1px solid rgba(255,255,255,.09)}
    .fan-media-card[data-watch-enhanced="1"] .fan-media-preview{cursor:pointer}.fan-media-card[data-watch-enhanced="1"] .fan-media-preview video{pointer-events:none}.fan-media-card[data-watch-enhanced="1"] .fan-play{width:50px;height:50px;font-size:18px;box-shadow:0 12px 30px rgba(0,0,0,.28)}
    .agh-watch-recap-ready{position:relative}.agh-watch-inline-play{display:inline-flex;align-items:center;gap:5px;margin-top:8px;padding:5px 8px;border-radius:999px;background:rgba(199,255,55,.1);color:var(--accent,#c7ff37);font-size:10px;font-weight:900}
    .agh-watch-modal[hidden]{display:none}.agh-watch-modal{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.88);backdrop-filter:blur(14px);display:grid;place-items:center;padding:max(14px,env(safe-area-inset-top)) 14px max(14px,env(safe-area-inset-bottom))}.agh-watch-dialog{width:min(960px,100%);max-height:94vh;background:#090b0a;border:1px solid rgba(255,255,255,.12);border-radius:22px;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.55);display:grid}.agh-watch-player{background:#000;position:relative}.agh-watch-player video{display:block;width:100%;max-height:72vh;aspect-ratio:16/9;background:#000;object-fit:contain}.agh-watch-close{position:absolute;top:10px;left:10px;z-index:2;width:42px;height:42px;border-radius:50%;border:0;background:rgba(0,0,0,.7);color:#fff;font-size:24px;cursor:pointer}.agh-watch-info{padding:14px 16px 16px;display:flex;align-items:center;justify-content:space-between;gap:14px}.agh-watch-info>div{display:grid;gap:4px;min-width:0}.agh-watch-info b{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.agh-watch-info small{color:var(--muted,#98a09c);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.agh-watch-download{min-height:44px;border:0;border-radius:12px;background:var(--accent,#c7ff37);color:#071008;padding:10px 15px;font-weight:900;cursor:pointer;white-space:nowrap}.agh-watch-download:disabled{opacity:.6;cursor:wait}.agh-watch-toast{position:fixed;left:50%;bottom:calc(86px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:100001;background:#111513;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:10px 14px;font-size:12px;font-weight:800;box-shadow:0 12px 30px rgba(0,0,0,.3)}
    @media(max-width:640px){.agh-watch-dialog{border-radius:18px}.agh-watch-info{align-items:stretch;flex-direction:column}.agh-watch-download{width:100%}.agh-watch-actions{padding:0 10px 10px}.agh-watch-actions button{padding-inline:9px}.agh-watch-player video{max-height:66vh}}
  `;
  document.head.appendChild(style);

  function toast(message) {
    document.querySelector('.agh-watch-toast')?.remove();
    const el = document.createElement('div');
    el.className = 'agh-watch-toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  function ensureModal() {
    let modal = document.getElementById('aghWatchModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'aghWatchModal';
    modal.className = 'agh-watch-modal';
    modal.hidden = true;
    modal.innerHTML = `<div class="agh-watch-dialog" role="dialog" aria-modal="true" aria-label="مشغل الفيديو"><div class="agh-watch-player"><button type="button" class="agh-watch-close" data-watch-close aria-label="إغلاق">×</button><video controls playsinline preload="metadata"></video></div><div class="agh-watch-info"><div><b data-watch-title>فيديو كأس أغشوركيت</b><small data-watch-subtitle>شاهد الفيديو دون مغادرة قسم شاهد</small></div><button type="button" class="agh-watch-download" data-watch-modal-download>⬇ تنزيل الفيديو</button></div></div>`;
    document.body.appendChild(modal);
    return modal;
  }

  function openPlayer(url, title = 'فيديو كأس أغشوركيت', subtitle = '') {
    if (!url) return;
    const modal = ensureModal();
    const video = modal.querySelector('video');
    modal.dataset.url = url;
    modal.dataset.title = title;
    modal.querySelector('[data-watch-title]').textContent = title || 'فيديو كأس أغشوركيت';
    modal.querySelector('[data-watch-subtitle]').textContent = subtitle || 'شاهد الفيديو دون مغادرة قسم شاهد';
    video.src = url;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    video.load();
    setTimeout(() => video.play().catch(() => {}), 40);
  }

  function closePlayer() {
    const modal = document.getElementById('aghWatchModal');
    if (!modal || modal.hidden) return;
    const video = modal.querySelector('video');
    video.pause();
    video.removeAttribute('src');
    video.load();
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  function extensionFrom(url, type = '') {
    const path = String(url || '').split('?')[0];
    const match = path.match(/\.([a-zA-Z0-9]{2,5})$/);
    if (match) return match[1].toLowerCase();
    if (type.includes('webm')) return 'webm';
    if (type.includes('quicktime')) return 'mov';
    return 'mp4';
  }

  async function downloadVideo(url, title, button) {
    if (!url) return;
    const original = button?.textContent || '⬇ تنزيل الفيديو';
    if (button) { button.disabled = true; button.textContent = 'جارٍ التحضير…'; }
    try {
      const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const ext = extensionFrom(url, blob.type || '');
      const filename = `${safeName(title || 'كأس-أغشوركيت')}.${ext}`;
      const file = new File([blob], filename, { type: blob.type || 'video/mp4' });
      const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isiOS && navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: title || 'فيديو كأس أغشوركيت' });
          toast('اختر «حفظ الفيديو» من قائمة المشاركة');
          return;
        } catch (error) {
          if (error?.name === 'AbortError') return;
        }
      }
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
      toast('بدأ تنزيل الفيديو');
    } catch (error) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.download = `${safeName(title || 'كأس-أغشوركيت')}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast('فُتح الفيديو مباشرة للحفظ');
    } finally {
      if (button) { button.disabled = false; button.textContent = original; }
    }
  }

  async function loadVideoAssets() {
    if (videoAssets.length || loadingAssets || !db) return loadingAssets;
    loadingAssets = db.from('media_assets').select('id,entity_id,kind,media_type,public_url,caption,created_at').eq('entity_type', 'match').order('created_at', { ascending: false }).limit(160)
      .then(({ data }) => { videoAssets = (data || []).filter(isVideoAsset); return videoAssets; })
      .catch(() => [])
      .finally(() => { loadingAssets = null; });
    return loadingAssets;
  }

  function firstVideoForMatch(matchId) {
    return videoAssets.find((asset) => asset.entity_id === matchId && asset.public_url);
  }

  function enhanceMediaCards() {
    if (rootRoute() !== 'watch') return;
    main.querySelectorAll('.fan-media-card:not([data-watch-enhanced="1"])').forEach((card) => {
      const preview = card.querySelector('.fan-media-preview');
      const video = preview?.querySelector('video');
      const url = video?.currentSrc || video?.getAttribute('src') || '';
      if (!preview || !video || !url) return;
      const title = card.querySelector('.fan-media-copy b')?.textContent?.trim() || 'فيديو كأس أغشوركيت';
      const subtitle = card.querySelector('.fan-media-copy small')?.textContent?.trim() || '';
      card.dataset.watchEnhanced = '1';
      preview.removeAttribute('data-fan-hash');
      preview.dataset.watchOpenUrl = url;
      preview.dataset.watchTitle = title;
      preview.dataset.watchSubtitle = subtitle;
      const actions = document.createElement('div');
      actions.className = 'agh-watch-actions';
      actions.innerHTML = `<button type="button" data-watch-open-url="${esc(url)}" data-watch-title="${esc(title)}" data-watch-subtitle="${esc(subtitle)}">▶ مشاهدة</button><button type="button" data-watch-download-url="${esc(url)}" data-watch-title="${esc(title)}">⬇ تنزيل</button>`;
      card.appendChild(actions);
    });
  }

  function enhanceRecaps() {
    if (rootRoute() !== 'watch' || !videoAssets.length) return;
    main.querySelectorAll('.fan-recap-strip .fan-match-mini:not([data-watch-recap-checked="1"])').forEach((button) => {
      button.dataset.watchRecapChecked = '1';
      const hash = button.getAttribute('data-fan-hash') || '';
      const match = hash.match(/^match\/([^/]+)/);
      if (!match) return;
      const asset = firstVideoForMatch(match[1]);
      if (!asset?.public_url) return;
      const title = asset.caption || button.querySelector('.fan-match-teams')?.textContent?.trim() || 'ملخص المباراة';
      button.removeAttribute('data-fan-hash');
      button.dataset.watchOpenUrl = asset.public_url;
      button.dataset.watchTitle = title;
      button.dataset.watchSubtitle = 'ملخص المباراة';
      button.classList.add('agh-watch-recap-ready');
      const badge = document.createElement('span');
      badge.className = 'agh-watch-inline-play';
      badge.textContent = '▶ مشاهدة الملخص هنا';
      button.appendChild(badge);
    });
  }

  async function enhanceWatch() {
    if (rootRoute() !== 'watch') return;
    enhanceMediaCards();
    await loadVideoAssets();
    if (rootRoute() !== 'watch') return;
    enhanceRecaps();
    enhanceMediaCards();
  }

  function scheduleEnhance(delay = 60) {
    clearTimeout(enhanceTimer);
    enhanceTimer = setTimeout(enhanceWatch, delay);
  }

  window.addEventListener('click', (event) => {
    if (rootRoute() !== 'watch') return;
    const open = event.target.closest('[data-watch-open-url]');
    if (open) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openPlayer(open.dataset.watchOpenUrl, open.dataset.watchTitle || 'فيديو كأس أغشوركيت', open.dataset.watchSubtitle || '');
      return;
    }
    const previewVideo = event.target.closest('.fan-media-preview')?.querySelector('video');
    if (previewVideo) {
      const preview = previewVideo.closest('.fan-media-preview');
      const card = preview.closest('.fan-media-card');
      const url = previewVideo.currentSrc || previewVideo.getAttribute('src') || '';
      if (url) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openPlayer(url, card?.querySelector('.fan-media-copy b')?.textContent?.trim() || 'فيديو كأس أغشوركيت', card?.querySelector('.fan-media-copy small')?.textContent?.trim() || '');
      }
    }
  }, true);

  document.addEventListener('click', (event) => {
    const close = event.target.closest('[data-watch-close]');
    if (close || event.target.id === 'aghWatchModal') { event.preventDefault(); closePlayer(); return; }
    const download = event.target.closest('[data-watch-download-url]');
    if (download) { event.preventDefault(); downloadVideo(download.dataset.watchDownloadUrl, download.dataset.watchTitle, download); return; }
    const modalDownload = event.target.closest('[data-watch-modal-download]');
    if (modalDownload) {
      const modal = document.getElementById('aghWatchModal');
      if (modal) downloadVideo(modal.dataset.url, modal.dataset.title, modalDownload);
    }
  }, true);

  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closePlayer(); });
  window.addEventListener('hashchange', () => { closePlayer(); scheduleEnhance(50); });
  new MutationObserver(() => scheduleEnhance(70)).observe(main, { childList: true, subtree: true });
  scheduleEnhance(0);
})();
