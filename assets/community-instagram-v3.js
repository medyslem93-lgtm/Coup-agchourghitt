(() => {
  'use strict';
  if (window.__aghCommunityInstagramV3) return;
  window.__aghCommunityInstagramV3 = true;
  window.__aghOfficialCommunityV2 = true;

  const cfg = window.AGCH_CONFIG || {};
  const main = document.getElementById('appMain');
  if (!main || !window.supabase?.createClient || !cfg.supabaseUrl || !cfg.supabaseKey) return;

  const db = window.AGCH_SUPABASE_CLIENT || window.aghDb || window.supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabaseKey,
    { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { 'x-client-info': 'agh-community-instagram-v3' } } }
  );

  const state = { posts: [], loading: false, loadedAt: 0 };
  let timer = 0;
  const route = () => decodeURIComponent(location.hash || '').replace(/^#\/?/, '').split(/[/?]/)[0] || 'home';
  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (v) => { try { return new Intl.DateTimeFormat('ar-MR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(v)); } catch { return ''; } };
  const logo = () => document.getElementById('brandLogo')?.src || 'assets/tournament.jpg';

  const style = document.createElement('style');
  style.id = 'aghCommunityInstagramV3Style';
  style.textContent = `
    body:has(.agh-ci-page){background:#050705!important}
    .agh-ci-page{width:min(680px,100%);margin:0 auto;padding:0 0 118px;color:#fff;min-height:72vh}
    .agh-ci-top{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:11px;padding:12px 14px;background:rgba(5,7,5,.92);backdrop-filter:blur(18px);border-bottom:1px solid #ffffff10}
    .agh-ci-top-logo{width:42px;height:42px;border-radius:13px;overflow:hidden;background:#fff;border:1px solid #ffffff22;flex:none}.agh-ci-top-logo img{width:100%;height:100%;object-fit:contain}
    .agh-ci-top-copy{min-width:0;flex:1}.agh-ci-top-copy b{display:block;font:1000 16px/1.2 Cairo,sans-serif}.agh-ci-top-copy small{display:block;color:#8f9a92;font:700 9px/1.5 Cairo,sans-serif;margin-top:3px}
    .agh-ci-top-actions{display:flex;gap:7px}.agh-ci-icon{width:38px;height:38px;border:1px solid #ffffff12;background:#101511;color:#fff;border-radius:12px;display:grid;place-items:center;font-size:18px;cursor:pointer}
    .agh-ci-stories{display:flex;gap:12px;overflow:auto;padding:13px 12px 15px;border-bottom:1px solid #ffffff0c;scrollbar-width:none}.agh-ci-stories::-webkit-scrollbar{display:none}
    .agh-ci-story{border:0;background:none;color:#fff;min-width:72px;display:grid;justify-items:center;gap:6px;font:800 9px Cairo,sans-serif;cursor:pointer}.agh-ci-ring{width:66px;height:66px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#f7d247,#e9427a,#8a4dff);box-shadow:0 0 0 1px #ffffff18}.agh-ci-ring>span{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;overflow:hidden;background:#0b0e0c;border:3px solid #050705}.agh-ci-ring img,.agh-ci-ring video{width:100%;height:100%;object-fit:cover}.agh-ci-story.empty .agh-ci-ring{background:#273028}.agh-ci-story small{max-width:74px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#dbe1dc}
    .agh-ci-tabs{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #ffffff0c}.agh-ci-tabs button{border:0;background:transparent;color:#6f7972;padding:11px;font:900 10px Cairo,sans-serif}.agh-ci-tabs button.on{color:#fff;border-bottom:2px solid #dfff00}
    .agh-ci-feed{display:grid;gap:14px;padding:13px 10px}.agh-ci-post{background:#0a0d0b;border:1px solid #ffffff0d;border-radius:18px;overflow:hidden;box-shadow:0 14px 34px #0003}
    .agh-ci-post-head{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:9px;align-items:center;padding:11px 12px}.agh-ci-avatar{width:42px;height:42px;border-radius:50%;padding:2px;background:linear-gradient(135deg,#dfff00,#25d78b);overflow:hidden}.agh-ci-avatar span{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;background:#fff;overflow:hidden}.agh-ci-avatar img{width:100%;height:100%;object-fit:contain}.agh-ci-author b{display:block;font:1000 11px Cairo,sans-serif}.agh-ci-author small{display:block;color:#7f8982;font:700 8px Cairo,sans-serif;margin-top:2px}.agh-ci-badge{border:1px solid #dfff0030;background:#dfff0012;color:#dfff00;border-radius:999px;padding:5px 8px;font:1000 8px Cairo,sans-serif}
    .agh-ci-media{display:block;width:100%;max-height:72dvh;object-fit:cover;background:#000}.agh-ci-post video.agh-ci-media{object-fit:contain}
    .agh-ci-actions{display:flex;align-items:center;gap:2px;padding:9px 9px 5px}.agh-ci-actions button{border:0;background:transparent;color:#fff;min-width:40px;height:38px;border-radius:10px;font:900 10px Cairo,sans-serif;cursor:pointer}.agh-ci-actions button:first-child{font-size:18px}.agh-ci-actions button.on{color:#ff5364}.agh-ci-actions .agh-ci-save{margin-inline-start:auto}
    .agh-ci-body{padding:3px 13px 10px;color:#edf1ee;font:700 11px/1.85 Cairo,sans-serif;white-space:pre-wrap}.agh-ci-body b{font-weight:1000;margin-inline-end:4px}.agh-ci-meta{padding:0 13px 10px;color:#707b73;font:700 8px Cairo,sans-serif}.agh-ci-meta .agh-comment-count{margin-inline-start:8px}
    .agh-comments{border-top:1px solid #ffffff0b;padding:9px 12px 12px}.agh-comment-list{display:grid;gap:8px}.agh-comment{display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:8px}.agh-comment-avatar{width:32px;height:32px;border-radius:50%;background:#1a211b;display:grid;place-items:center;color:#dfff00;font:900 9px Cairo,sans-serif}.agh-comment-bubble{background:#111612;border-radius:12px;padding:7px 9px}.agh-comment-bubble b{font:900 9px Cairo,sans-serif}.agh-comment-bubble p{margin:2px 0 0;font:700 9px/1.7 Cairo,sans-serif}.agh-comment-bubble small{display:block;color:#68736b;font:600 7px Cairo,sans-serif;margin-top:3px}.agh-comment-delete{border:0;background:none;color:#7f8982}
    .agh-comment-list>.agh-ci-empty-comment{color:#6f7972;font:700 8px Cairo,sans-serif;padding:2px}.agh-comment-count{color:#747f77;font:700 8px Cairo,sans-serif}.agh-comment-login{display:none!important}
    .agh-ci-empty{margin:34px 12px;padding:34px 18px;text-align:center;border:1px dashed #ffffff16;border-radius:18px;color:#849087}.agh-ci-empty b{display:block;color:#fff;font:1000 15px Cairo,sans-serif;margin-bottom:5px}.agh-ci-empty span{font:700 9px/1.8 Cairo,sans-serif}
    .agh-ci-story-view{position:fixed;z-index:110000;inset:0;background:#000e;backdrop-filter:blur(12px);display:grid;place-items:center;padding:10px}.agh-ci-story-view[hidden]{display:none!important}.agh-ci-story-card{position:relative;width:min(460px,100%);height:min(84dvh,760px);border-radius:22px;overflow:hidden;background:#030403;border:1px solid #ffffff1b}.agh-ci-story-card>img,.agh-ci-story-card>video{width:100%;height:100%;object-fit:contain}.agh-ci-story-card .agh-ci-story-text{position:absolute;right:12px;left:12px;bottom:16px;padding:10px 12px;border-radius:13px;background:#000a;font:800 11px/1.7 Cairo,sans-serif}.agh-ci-story-close{position:absolute;z-index:3;top:12px;left:12px;width:38px;height:38px;border:0;border-radius:50%;background:#000a;color:#fff;font-size:22px}
    .mobile-navigation [data-route="community"],.desktop-navigation [data-route="community"]{position:relative}.mobile-navigation [data-route="community"].active,.desktop-navigation [data-route="community"].active{color:#dfff00}
    @media(max-width:600px){.agh-ci-page{width:100%}.agh-ci-feed{padding-inline:0;gap:8px}.agh-ci-post{border-radius:0;border-inline:0}.agh-ci-top{padding-top:10px}.agh-ci-media{max-height:68dvh}}
  `;
  document.head.appendChild(style);

  function installNav() {
    const desktop = document.querySelector('.desktop-navigation');
    const desktopSig = desktop ? [...desktop.querySelectorAll(':scope > button')].map(b => b.dataset.route || '').join('|') : '';
    if (desktop && desktopSig !== 'home|matches|tournaments|watch|community|directory') {
      desktop.innerHTML = '<button data-route="home">الرئيسية</button><button data-route="matches">المباريات</button><button data-route="tournaments">البطولات</button><button data-route="watch">شاهد</button><button data-route="community">المجتمع</button><button data-route="directory">المزيد</button>';
    }
    const mobile = document.querySelector('.mobile-navigation');
    const mobileSig = mobile ? [...mobile.querySelectorAll(':scope > button')].map(b => b.dataset.route || '').join('|') : '';
    if (mobile && mobileSig !== 'home|matches|tournaments|watch|community') {
      mobile.innerHTML = '<button data-route="home"><span>الرئيسية</span></button><button data-route="matches"><span>المباريات</span></button><button class="nav-primary" data-route="tournaments"><span>البطولات</span></button><button data-route="watch"><span>شاهد</span></button><button data-route="community"><span>المجتمع</span></button>';
    }
    const active = route();
    document.querySelectorAll('.desktop-navigation button,.mobile-navigation button').forEach(b => b.classList.toggle('active', b.dataset.route === active));
  }

  async function load(force = false) {
    if (state.loading) return;
    if (!force && Date.now() - state.loadedAt < 12000 && state.posts.length) return;
    state.loading = true;
    try {
      const { data, error } = await db.from('fan_posts')
        .select('id,kind,author_name,author_badge,body,media_url,media_type,created_at,expires_at,is_published')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      state.posts = data || [];
      state.loadedAt = Date.now();
    } catch (e) {
      console.warn('[community-v3]', e);
    } finally {
      state.loading = false;
    }
  }

  function storyHtml(p) {
    const thumb = p.media_url
      ? (p.media_type === 'video'
          ? `<video src="${esc(p.media_url)}" muted playsinline preload="metadata"></video>`
          : `<img src="${esc(p.media_url)}" alt="قصة كأس أغشوركيت" loading="lazy">`)
      : `<img src="${esc(logo())}" alt="كأس أغشوركيت">`;
    return `<button type="button" class="agh-ci-story" data-ci-story="${esc(p.id)}"><span class="agh-ci-ring"><span>${thumb}</span></span><small>${esc(p.author_name || 'كأس أغشوركيت')}</small></button>`;
  }

  function postHtml(p) {
    const media = p.media_url
      ? (p.media_type === 'video'
        ? `<video class="agh-ci-media" src="${esc(p.media_url)}" controls playsinline preload="metadata"></video>`
        : `<img class="agh-ci-media" src="${esc(p.media_url)}" alt="منشور كأس أغشوركيت" loading="lazy" decoding="async">`)
      : '';
    return `<article class="agh-ci-post" data-official-post="${esc(p.id)}">
      <header class="agh-ci-post-head">
        <span class="agh-ci-avatar"><span><img src="${esc(logo())}" alt="كأس أغشوركيت"></span></span>
        <span class="agh-ci-author"><b>${esc(p.author_name || 'إدارة كأس أغشوركيت')}</b><small>${esc(fmt(p.created_at))}</small></span>
        <span class="agh-ci-badge">${esc(p.author_badge || 'رسمي')}</span>
      </header>
      ${media}
      <div class="agh-ci-actions">
        <button type="button" data-official-like="${esc(p.id)}" aria-label="إعجاب">♡ 0</button>
        <button type="button" data-official-focus-comment="${esc(p.id)}" aria-label="تعليق">💬</button>
        <button type="button" data-ci-share="${esc(p.id)}" aria-label="مشاركة">↗</button>
        <button type="button" class="agh-ci-save" data-ci-save="${esc(p.id)}" aria-label="حفظ">☆</button>
      </div>
      ${p.body ? `<div class="agh-ci-body"><b>${esc(p.author_name || 'كأس أغشوركيت')}</b>${esc(p.body)}</div>` : ''}
      <div class="agh-ci-meta"><span class="agh-comment-count">0 تعليق</span></div>
      <div class="agh-comments"><div class="agh-comment-list"><div class="agh-ci-empty-comment">كن أول من يعلّق.</div></div></div>
    </article>`;
  }

  function render() {
    if (route() !== 'community') return;
    installNav();
    document.title = 'المجتمع | كأس أغشوركيت';
    const now = Date.now();
    const stories = state.posts.filter(p => p.kind === 'story' && (!p.expires_at || new Date(p.expires_at).getTime() > now));
    const posts = state.posts.filter(p => p.kind !== 'story');
    main.innerHTML = `<div class="agh-ci-page" data-official-community="v2" data-community-instagram="v3">
      <header class="agh-ci-top">
        <span class="agh-ci-top-logo"><img src="${esc(logo())}" alt="كأس أغشوركيت"></span>
        <span class="agh-ci-top-copy"><b>مجتمع كأس أغشوركيت</b><small>المنشورات · القصص · تفاعل الجماهير</small></span>
        <span class="agh-ci-top-actions"><button type="button" class="agh-ci-icon" data-action="open-search" aria-label="بحث">⌕</button><button type="button" class="agh-ci-icon" data-route="news" aria-label="الأخبار">⌁</button></span>
      </header>
      <section class="agh-ci-stories" aria-label="قصص البطولة">
        ${stories.length ? stories.map(storyHtml).join('') : `<div class="agh-ci-story empty"><span class="agh-ci-ring"><span><img src="${esc(logo())}" alt=""></span></span><small>لا توجد قصص الآن</small></div>`}
      </section>
      <nav class="agh-ci-tabs" aria-label="المجتمع"><button type="button" class="on">المنشورات</button><button type="button" data-route="watch">الفيديوهات</button></nav>
      ${posts.length ? `<section class="agh-ci-feed">${posts.map(postHtml).join('')}</section>` : `<section class="agh-ci-empty"><b>لا توجد منشورات بعد</b><span>ستظهر منشورات إدارة البطولة هنا فور نشرها من لوحة الإدارة.</span></section>`}
    </div>`;
    window.dispatchEvent(new CustomEvent('agh:community-rendered'));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
  }

  async function refresh(force = false) {
    if (route() !== 'community') return;
    await load(force);
    if (route() === 'community') render();
  }

  function storyView(post) {
    let layer = document.getElementById('aghCiStoryView');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'aghCiStoryView';
      layer.className = 'agh-ci-story-view';
      layer.hidden = true;
      document.body.appendChild(layer);
    }
    const media = post.media_url
      ? (post.media_type === 'video'
        ? `<video src="${esc(post.media_url)}" controls autoplay playsinline></video>`
        : `<img src="${esc(post.media_url)}" alt="قصة كأس أغشوركيت">`)
      : `<img src="${esc(logo())}" alt="كأس أغشوركيت">`;
    layer.innerHTML = `<div class="agh-ci-story-card"><button type="button" class="agh-ci-story-close" data-ci-story-close>×</button>${media}${post.body ? `<div class="agh-ci-story-text">${esc(post.body)}</div>` : ''}</div>`;
    layer.hidden = false;
  }

  async function sharePost(id) {
    const p = state.posts.find(x => x.id === id);
    const text = `${p?.body || 'منشور من كأس أغشوركيت'}\n${location.origin}/#/community`;
    try {
      if (navigator.share) await navigator.share({ title: 'كأس أغشوركيت', text, url: `${location.origin}/#/community` });
      else await navigator.clipboard.writeText(text);
    } catch {}
  }

  document.addEventListener('click', (e) => {
    const story = e.target.closest?.('[data-ci-story]');
    if (story) {
      const p = state.posts.find(x => x.id === story.dataset.ciStory);
      if (p) storyView(p);
      return;
    }
    if (e.target.closest?.('[data-ci-story-close]') || (e.target.id === 'aghCiStoryView')) {
      const layer = document.getElementById('aghCiStoryView');
      if (layer) layer.hidden = true;
      return;
    }
    const share = e.target.closest?.('[data-ci-share]');
    if (share) {
      e.preventDefault();
      sharePost(share.dataset.ciShare);
      return;
    }
    const save = e.target.closest?.('[data-ci-save]');
    if (save) {
      const key = 'agh_community_saved_v1';
      let values = [];
      try { values = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
      const set = new Set(Array.isArray(values) ? values : []);
      if (set.has(save.dataset.ciSave)) { set.delete(save.dataset.ciSave); save.textContent = '☆'; }
      else { set.add(save.dataset.ciSave); save.textContent = '★'; }
      localStorage.setItem(key, JSON.stringify([...set]));
    }
  }, true);

  window.addEventListener('hashchange', () => {
    installNav();
    clearTimeout(timer);
    timer = setTimeout(() => refresh(false), 80);
  });
  window.addEventListener('agh:admin-update', () => {
    if (route() === 'community') refresh(true);
  });

  new MutationObserver(() => {
    installNav();
    if (route() !== 'community') return;
    if (!main.querySelector('[data-community-instagram="v3"]')) {
      clearTimeout(timer);
      timer = setTimeout(() => refresh(false), 100);
    }
  }).observe(main, { childList: true, subtree: false });

  const navs = [document.querySelector('.desktop-navigation'), document.querySelector('.mobile-navigation')].filter(Boolean);
  navs.forEach(n => new MutationObserver(installNav).observe(n, { childList: true }));

  installNav();
  if (route() === 'community') setTimeout(() => refresh(true), 40);
})();