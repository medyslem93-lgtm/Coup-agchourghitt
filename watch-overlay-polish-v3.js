(() => {
  'use strict';

  const cfg = window.AGCH_CONFIG || {};
  if (!window.supabase?.createClient || !cfg.supabaseUrl || !cfg.supabaseKey) return;

  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'aghchorguit-watch-overlay-polish-v3' } },
  });

  let assetCache = null;
  let activeUrl = '';
  let goalTimer = 0;

  const cleanUrl = (value = '') => {
    try {
      const u = new URL(value, location.href);
      u.hash = '';
      return u.href;
    } catch {
      return String(value || '').split('#')[0];
    }
  };

  const isGoal = (event) => {
    const type = String(event?.type ?? event?.event_type ?? '').trim().toLowerCase();
    return /هدف|goal|ركلة جزاء مسجلة|penalty[_ ]?goal/.test(type);
  };

  function installStyles() {
    if (document.getElementById('aghWatchOverlayPolishV3')) return;
    const style = document.createElement('style');
    style.id = 'aghWatchOverlayPolishV3';
    style.textContent = `
      .agh-watch-match-overlay{
        justify-content:flex-start!important;
        padding:10px 10px 54px!important;
        gap:7px;
      }
      .agh-watch-overlay-top{
        order:1;
        width:100%;
        padding-left:48px!important;
        min-height:34px;
      }
      .agh-watch-overlay-bottom{
        order:2;
        width:min(650px,96%)!important;
        margin:0 auto!important;
        padding:8px 10px!important;
        border-radius:14px!important;
        background:linear-gradient(180deg,rgba(6,8,7,.88),rgba(5,7,6,.95))!important;
        border-color:rgba(255,255,255,.18)!important;
        box-shadow:0 10px 28px rgba(0,0,0,.34)!important;
      }
      .agh-watch-overlay-event{
        order:3;
        position:relative!important;
        left:auto!important;
        bottom:auto!important;
        transform:none!important;
        width:min(470px,90%)!important;
        margin:1px auto 0!important;
        background:linear-gradient(135deg,rgba(8,11,9,.97),rgba(18,25,20,.97))!important;
        border:1px solid rgba(199,255,55,.48)!important;
        box-shadow:0 12px 34px rgba(0,0,0,.38)!important;
        animation:aghGoalTopIn .32s cubic-bezier(.2,.8,.2,1) both!important;
      }
      .agh-watch-overlay-event[data-event-kind="goal"]{
        border-color:rgba(199,255,55,.72)!important;
      }
      .agh-watch-overlay-event[data-event-kind="goal"] .agh-watch-overlay-event-copy b{
        color:#c7ff37!important;
      }
      @keyframes aghGoalTopIn{
        from{opacity:0;transform:translateY(-10px) scale(.97)}
        to{opacity:1;transform:translateY(0) scale(1)}
      }
      .agh-watch-overlay-score{
        min-width:72px!important;
        border-color:rgba(199,255,55,.38)!important;
        background:rgba(3,6,4,.94)!important;
      }
      .agh-watch-overlay-chip{
        background:rgba(5,7,6,.82)!important;
        box-shadow:0 6px 18px rgba(0,0,0,.18);
      }
      .agh-watch-info{
        padding:11px 14px 13px!important;
      }
      .agh-watch-info small{
        opacity:.72;
      }
      @media(max-width:640px){
        .agh-watch-match-overlay{padding:8px 8px 50px!important;gap:5px}
        .agh-watch-overlay-top{padding-left:42px!important;min-height:29px}
        .agh-watch-overlay-bottom{width:98%!important;padding:7px 8px!important;border-radius:12px!important}
        .agh-watch-overlay-event{width:92%!important;margin-top:0!important;padding:8px 9px!important}
        .agh-watch-overlay-score{min-width:58px!important;font-size:16px!important}
        .agh-watch-overlay-team{font-size:9.5px!important}
        .agh-watch-overlay-team img{width:24px!important;height:24px!important;flex-basis:24px!important}
        .agh-watch-info{padding:10px 12px 12px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function arrangeOverlay() {
    const overlay = document.querySelector('#aghWatchModal .agh-watch-match-overlay');
    if (!overlay) return null;
    const top = overlay.querySelector('.agh-watch-overlay-top');
    const score = overlay.querySelector('.agh-watch-overlay-bottom');
    const event = overlay.querySelector('.agh-watch-overlay-event');
    if (top && score && top.nextElementSibling !== score) top.insertAdjacentElement('afterend', score);
    if (score && event && score.nextElementSibling !== event) score.insertAdjacentElement('afterend', event);
    return overlay;
  }

  async function loadAssets() {
    if (assetCache) return assetCache;
    try {
      const { data, error } = await db.from('media_assets')
        .select('id,entity_id,public_url,caption,kind,captured_minute,score_a,score_b')
        .eq('entity_type', 'match')
        .order('created_at', { ascending: false })
        .limit(220);
      assetCache = error ? [] : (data || []);
    } catch {
      assetCache = [];
    }
    return assetCache;
  }

  async function assetForUrl(url) {
    const assets = await loadAssets();
    const target = cleanUrl(url);
    return assets.find((asset) => cleanUrl(asset.public_url || '') === target) ||
      assets.find((asset) => String(asset.public_url || '').split('?')[0] === String(url || '').split('?')[0]) || null;
  }

  function setClipScore(asset) {
    const overlay = arrangeOverlay();
    if (!overlay || !asset) return;
    const score = overlay.querySelector('[data-ov-score]');
    const minute = overlay.querySelector('[data-ov-minute]');
    if (score && (asset.score_a != null || asset.score_b != null)) {
      score.textContent = `${Number(asset.score_a || 0)} - ${Number(asset.score_b || 0)}`;
    }
    if (minute && asset.captured_minute != null) minute.textContent = `${Number(asset.captured_minute)}'`;
  }

  function showGoalFallback(event, asset) {
    const overlay = arrangeOverlay();
    if (!overlay) return;
    const box = overlay.querySelector('[data-ov-event]');
    if (!box || !box.hidden) return;

    const player = String(event?.player_name || event?.note || '').trim() || 'هدف';
    const minute = Number(event?.minute ?? asset?.captured_minute ?? 0);
    const a = Number(asset?.score_a ?? 0);
    const b = Number(asset?.score_b ?? 0);
    const teamA = overlay.querySelector('[data-ov-a-name]')?.textContent?.trim() || 'الفريق الأول';
    const teamB = overlay.querySelector('[data-ov-b-name]')?.textContent?.trim() || 'الفريق الثاني';

    box.dataset.eventKind = 'goal';
    const icon = box.querySelector('[data-ov-event-icon]');
    const title = box.querySelector('[data-ov-event-title]');
    const text = box.querySelector('[data-ov-event-text]');
    const time = box.querySelector('[data-ov-event-minute]');
    if (icon) icon.textContent = '⚽';
    if (title) title.textContent = 'هدف!';
    if (text) text.textContent = `${player} · ${teamA} ${a} - ${b} ${teamB}`;
    if (time) time.textContent = minute ? `${minute}'` : '';

    box.hidden = false;
    box.style.animation = 'none';
    void box.offsetHeight;
    box.style.animation = '';
    clearTimeout(goalTimer);
    goalTimer = setTimeout(() => { box.hidden = true; }, 3400);
  }

  async function primeGoalClip(url) {
    if (!url) return;
    const thisUrl = cleanUrl(url);
    if (activeUrl === thisUrl) return;
    activeUrl = thisUrl;

    const asset = await assetForUrl(url);
    if (!asset || activeUrl !== thisUrl) return;

    setTimeout(() => setClipScore(asset), 90);

    const minute = Number(asset.captured_minute || 0);
    if (!asset.entity_id || !minute) return;

    try {
      const { data, error } = await db.from('match_events')
        .select('id,type,team_id,player_id,player_name,minute,note')
        .eq('match_id', asset.entity_id)
        .eq('minute', minute)
        .order('created_at', { ascending: true });
      if (error || activeUrl !== thisUrl) return;
      const goal = (data || []).find(isGoal);
      if (!goal) return;

      const modal = document.getElementById('aghWatchModal');
      const video = modal?.querySelector('video');
      const reveal = () => {
        if (activeUrl !== thisUrl || modal?.hidden) return;
        setClipScore(asset);
        showGoalFallback(goal, asset);
      };

      if (video) {
        const onTime = () => {
          if ((video.currentTime || 0) < 0.65) return;
          video.removeEventListener('timeupdate', onTime);
          setTimeout(reveal, 80);
        };
        video.addEventListener('timeupdate', onTime);
        setTimeout(() => {
          video.removeEventListener('timeupdate', onTime);
          if (!modal?.hidden) reveal();
        }, 1800);
      } else {
        setTimeout(reveal, 900);
      }
    } catch {}
  }

  function observe() {
    installStyles();

    const refresh = () => {
      installStyles();
      arrangeOverlay();
      const modal = document.getElementById('aghWatchModal');
      if (!modal || modal.hidden) {
        activeUrl = '';
        return;
      }
      const url = modal.dataset.url || modal.querySelector('video')?.currentSrc || modal.querySelector('video')?.src || '';
      if (url) primeGoalClip(url);
    };

    const observer = new MutationObserver(() => setTimeout(refresh, 25));
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'data-url'] });
    document.addEventListener('play', (event) => {
      if (event.target?.closest?.('#aghWatchModal')) setTimeout(refresh, 20);
    }, true);
    refresh();
  }

  observe();
})();