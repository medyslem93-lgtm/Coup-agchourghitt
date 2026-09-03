(() => {
  'use strict';
  const cfg = window.AGCH_CONFIG || {};
  const main = document.getElementById('appMain');
  if (!main || !window.supabase?.createClient) return;
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
  let stories = [];
  let timer = null;
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const live = s => s && s.status === 'published' && s.is_story === true && (s.story_pinned || !s.story_expires_at || new Date(s.story_expires_at) > new Date());

  function ensureLayer() {
    let layer = document.getElementById('storyHotfixLayer');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = 'storyHotfixLayer';
    layer.hidden = true;
    layer.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:#050505;display:flex;align-items:center;justify-content:center;padding:0;';
    document.body.appendChild(layer);
    return layer;
  }

  function closeStory() {
    clearTimeout(timer);
    const layer = document.getElementById('storyHotfixLayer');
    if (layer) layer.hidden = true;
    document.body.style.overflow = '';
  }

  function openStory(index) {
    const s = stories[index];
    if (!s) return;
    const layer = ensureLayer();
    layer.hidden = false;
    document.body.style.overflow = 'hidden';
    clearTimeout(timer);
    const media = s.video_url
      ? `<video src="${esc(s.video_url)}" autoplay muted playsinline style="width:100%;height:100%;object-fit:contain;background:#000"></video>`
      : `<img src="${esc(s.image_url || (Array.isArray(s.gallery_urls) ? s.gallery_urls[0] : ''))}" alt="${esc(s.title)}" style="width:100%;height:100%;object-fit:contain;background:#000">`;
    layer.innerHTML = `<div style="position:relative;width:min(100vw,540px);height:100vh;background:#000;overflow:hidden">
      <div style="position:absolute;top:max(16px,env(safe-area-inset-top));left:16px;right:16px;z-index:4;height:3px;background:rgba(255,255,255,.25);border-radius:999px;overflow:hidden"><i id="storyHotfixProgress" style="display:block;height:100%;width:0;background:#fff;animation:storyHotfixProgress 10s linear forwards"></i></div>
      <button data-story-hotfix-close aria-label="إغلاق" style="position:absolute;top:max(28px,calc(env(safe-area-inset-top) + 12px));right:18px;z-index:5;width:44px;height:44px;border:0;border-radius:50%;background:rgba(0,0,0,.45);color:#fff;font-size:30px">×</button>
      ${media}
      <div style="position:absolute;right:18px;left:18px;bottom:max(34px,env(safe-area-inset-bottom));z-index:4;color:#fff;text-align:right;text-shadow:0 2px 12px #000"><b style="font:800 22px Cairo,sans-serif;display:block">${esc(s.title || '')}</b>${s.description ? `<p style="font:500 14px/1.8 Cairo,sans-serif;margin:8px 0 0">${esc(s.description)}</p>` : ''}</div>
    </div>`;
    layer.querySelector('[data-story-hotfix-close]').onclick = closeStory;
    timer = setTimeout(closeStory, 10000);
  }

  function injectStyles() {
    if (document.getElementById('storyHotfixStyles')) return;
    const style = document.createElement('style');
    style.id = 'storyHotfixStyles';
    style.textContent = `@keyframes storyHotfixProgress{from{width:0}to{width:100%}}.story-hotfix-strip{display:flex;gap:14px;overflow-x:auto;padding:8px 2px 18px;scrollbar-width:none}.story-hotfix-strip::-webkit-scrollbar{display:none}.story-hotfix-item{flex:0 0 78px;background:none;border:0;color:inherit;padding:0;text-align:center}.story-hotfix-ring{width:70px;height:70px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#9b5cff,#d7ff3f);display:block;margin:auto}.story-hotfix-ring>span{display:block;width:100%;height:100%;border-radius:50%;overflow:hidden;border:3px solid #0b0d0b;background:#111}.story-hotfix-ring img{width:100%;height:100%;object-fit:cover}.story-hotfix-item b{display:block;margin-top:7px;font:700 11px/1.45 Cairo,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`;
    document.head.appendChild(style);
  }

  async function refresh() {
    if (location.hash !== '#news') return;
    const { data, error } = await sb.from('news').select('id,title,description,image_url,video_url,gallery_urls,is_story,story_pinned,story_expires_at,status,story_duration_seconds,created_at').eq('is_story', true).eq('status', 'published').order('story_pinned', { ascending:false }).order('created_at', { ascending:false });
    if (error) return;
    stories = (data || []).filter(live);
    injectStyles();
    const page = main.querySelector('.page-shell');
    if (!page) return;
    page.querySelectorAll('.news-card').forEach(card => {
      const id = card.dataset.route?.split('/')[1];
      if (id && stories.some(s => s.id === id)) card.remove();
    });
    let strip = page.querySelector('.story-hotfix-strip');
    if (!strip) {
      strip = document.createElement('div');
      strip.className = 'story-hotfix-strip';
      const heading = page.querySelector('.page-heading');
      if (heading?.nextSibling) page.insertBefore(strip, heading.nextSibling); else page.prepend(strip);
    }
    strip.innerHTML = stories.map((s,i) => `<button class="story-hotfix-item" data-story-hotfix="${i}"><span class="story-hotfix-ring"><span><img src="${esc(s.image_url || (Array.isArray(s.gallery_urls) ? s.gallery_urls[0] : '') || 'assets/tournament.jpg')}" alt="${esc(s.title)}"></span></span><b>${esc(s.title)}</b></button>`).join('');
    strip.hidden = stories.length === 0;
    strip.querySelectorAll('[data-story-hotfix]').forEach(btn => btn.onclick = () => openStory(Number(btn.dataset.storyHotfix)));
  }

  document.addEventListener('click', e => {
    if (e.target.closest('[data-route="news"]')) setTimeout(refresh, 350);
  }, true);
  window.addEventListener('hashchange', () => setTimeout(refresh, 350));
  window.addEventListener('load', () => setTimeout(refresh, 600));
  const obs = new MutationObserver(() => { if (location.hash === '#news') setTimeout(refresh, 120); });
  obs.observe(main, { childList:true, subtree:true });
})();