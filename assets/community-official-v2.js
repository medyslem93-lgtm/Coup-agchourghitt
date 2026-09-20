(() => {
  'use strict';
  if (window.__aghOfficialCommunityV2) return;
  window.__aghOfficialCommunityV2 = true;

  const cfg = window.AGCH_CONFIG || {};
  const db = window.AGCH_SUPABASE_CLIENT || window.aghDb || window.supabase?.createClient?.(
    cfg.supabaseUrl,
    cfg.supabaseKey,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }, global: { headers: { 'x-client-info': 'agh-official-community-v2' } } }
  );
  const main = document.getElementById('appMain');
  if (!db || !main) return;

  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const route = () => decodeURIComponent(location.hash || '').replace(/^#\/?/, '').split(/[/?]/)[0] || 'home';
  const state = { user: null, posts: [], likes: [], comments: [], profiles: new Map(), loading: false, expanded: new Set() };
  let renderTimer = 0;

  const style = document.createElement('style');
  style.id = 'aghOfficialCommunityV2Styles';
  style.textContent = `
  .agh-official-community{max-width:880px;margin:0 auto;padding:18px 12px 115px;color:#fff}.agh-official-hero{display:flex;justify-content:space-between;gap:14px;align-items:flex-end;margin:4px 0 16px}.agh-official-hero span{display:block;color:#dfff00;font:900 9px/1.2 Cairo,sans-serif;letter-spacing:.15em}.agh-official-hero h1{margin:4px 0 3px;font:1000 27px/1.2 Cairo,sans-serif}.agh-official-hero p{margin:0;color:#9aa59d;font:700 11px/1.8 Cairo,sans-serif;max-width:560px}.agh-official-pill{flex:none;border:1px solid rgba(223,255,0,.2);background:rgba(223,255,0,.07);color:#e9ff91;border-radius:999px;padding:8px 11px;font:900 9px Cairo,sans-serif}
  .agh-official-stories{display:flex;gap:10px;overflow:auto;padding:2px 0 14px;scrollbar-width:none}.agh-official-stories::-webkit-scrollbar{display:none}.agh-official-story{border:0;background:none;color:#fff;min-width:72px;display:grid;justify-items:center;gap:6px;font:800 9px Cairo,sans-serif;cursor:pointer}.agh-official-story-ring{width:60px;height:60px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#dfff00,#22c77a,#c8a548);box-shadow:0 0 0 1px rgba(255,255,255,.08)}.agh-official-story-ring>span{width:100%;height:100%;border-radius:50%;overflow:hidden;background:#0a0d0b;border:2px solid #0a0d0b;display:grid;place-items:center}.agh-official-story-ring img{width:100%;height:100%;object-fit:cover}.agh-official-empty{padding:28px 18px;border:1px dashed rgba(255,255,255,.13);border-radius:18px;color:#8f9a92;text-align:center;font:800 11px Cairo,sans-serif}
  .agh-official-feed{display:grid;gap:14px}.agh-official-post{overflow:hidden;border:1px solid rgba(255,255,255,.085);border-radius:22px;background:linear-gradient(150deg,#111713,#080a09);box-shadow:0 18px 45px rgba(0,0,0,.16)}.agh-official-post-head{display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:10px;align-items:center;padding:12px}.agh-official-avatar{width:46px;height:46px;border-radius:14px;background:#fff;overflow:hidden;display:grid;place-items:center}.agh-official-avatar img{width:100%;height:100%;object-fit:contain}.agh-official-post-head b,.agh-official-post-head small{display:block}.agh-official-post-head b{font:1000 12px Cairo,sans-serif}.agh-official-post-head small{margin-top:2px;color:#869188;font:700 9px Cairo,sans-serif}.agh-official-badge{padding:5px 8px;border-radius:999px;background:#dfff00;color:#0b100c;font:1000 8px Cairo,sans-serif}.agh-official-body{padding:0 13px 12px;color:#e8ede9;white-space:pre-wrap;font:700 12px/1.9 Cairo,sans-serif}.agh-official-media{width:100%;max-height:590px;display:block;object-fit:cover;background:#020302}.agh-official-post video.agh-official-media{object-fit:contain;max-height:660px}.agh-official-actions{display:flex;align-items:center;gap:7px;padding:10px 12px;border-top:1px solid rgba(255,255,255,.06)}.agh-official-actions button{border:0;border-radius:11px;background:#151c17;color:#d5ddd7;padding:8px 11px;font:900 9px Cairo,sans-serif;cursor:pointer}.agh-official-actions button.on{color:#ff8b91;background:#251416}.agh-official-actions .agh-comment-count{margin-inline-start:auto;color:#849087;font:800 9px Cairo,sans-serif}
  .agh-comments{border-top:1px solid rgba(255,255,255,.055);padding:10px 12px 12px}.agh-comment-list{display:grid;gap:8px}.agh-comment{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:8px;align-items:start}.agh-comment-avatar{width:34px;height:34px;border-radius:11px;overflow:hidden;background:#1a231c;display:grid;place-items:center;color:#dfff00;font:1000 10px Cairo,sans-serif}.agh-comment-avatar img{width:100%;height:100%;object-fit:cover}.agh-comment-bubble{background:#141a16;border:1px solid rgba(255,255,255,.06);border-radius:13px;padding:7px 9px}.agh-comment-bubble b{display:block;font:900 9px Cairo,sans-serif}.agh-comment-bubble p{margin:2px 0 0;color:#d4dbd6;font:700 10px/1.7 Cairo,sans-serif;white-space:pre-wrap}.agh-comment-bubble small{display:block;margin-top:3px;color:#728078;font:600 8px Cairo,sans-serif}.agh-comment-delete{border:0;background:none;color:#8e9891;font-size:12px;cursor:pointer}.agh-comments-more{border:0;background:none;color:#cde46f;font:800 9px Cairo,sans-serif;padding:7px 0;cursor:pointer}.agh-comment-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin-top:9px}.agh-comment-form input{min-width:0;border:1px solid rgba(255,255,255,.1);background:#0d120f;color:#fff;border-radius:12px;padding:10px 11px;outline:0;font:700 10px Cairo,sans-serif}.agh-comment-form button{border:0;border-radius:11px;background:#dfff00;color:#0a100b;padding:0 14px;font:1000 9px Cairo,sans-serif}.agh-comment-login{width:100%;margin-top:9px;border:1px solid rgba(223,255,0,.16);background:rgba(223,255,0,.05);color:#e8ff8d;border-radius:12px;padding:9px;font:900 9px Cairo,sans-serif;cursor:pointer}
  .agh-official-story-view{position:fixed;z-index:100700;inset:0;background:rgba(0,0,0,.91);backdrop-filter:blur(12px);display:grid;place-items:center;padding:12px}.agh-official-story-view[hidden]{display:none!important}.agh-official-story-card{position:relative;width:min(470px,100%);height:min(82dvh,760px);border-radius:25px;overflow:hidden;background:#050706;border:1px solid rgba(255,255,255,.12);display:flex;flex-direction:column}.agh-official-story-top{position:absolute;z-index:3;top:10px;right:12px;left:12px;display:flex;align-items:center;gap:8px;color:#fff;text-shadow:0 2px 8px #000}.agh-official-story-top img{width:34px;height:34px;border-radius:10px;background:#fff;object-fit:contain}.agh-official-story-top b{font:1000 10px Cairo,sans-serif}.agh-official-story-top small{display:block;font:700 8px Cairo,sans-serif;color:#d3d8d4}.agh-official-story-close{margin-inline-start:auto;border:0;width:36px;height:36px;border-radius:50%;background:#0009;color:#fff;font-size:23px}.agh-official-story-media{width:100%;height:100%;object-fit:contain;background:#000}.agh-official-story-text{position:absolute;right:14px;left:14px;bottom:18px;border-radius:14px;padding:11px;background:#000a;color:#fff;font:800 12px/1.8 Cairo,sans-serif}.agh-official-story-onlytext{margin:auto;padding:32px;color:#fff;text-align:center;font:900 20px/1.8 Cairo,sans-serif}
  @media(max-width:600px){.agh-official-community{padding-inline:10px}.agh-official-hero{align-items:flex-start}.agh-official-hero h1{font-size:23px}.agh-official-pill{display:none}.agh-official-post{border-radius:18px}.agh-official-media{max-height:70dvh}}
  `;
  document.head.appendChild(style);

  const formatDate = (v) => { try { return new Intl.DateTimeFormat('ar-MR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)); } catch { return v || ''; } };
  const logo = () => 'assets/tournament.jpg';
  const profileFor = (id) => state.profiles.get(id) || {};
  const initials = (n = '') => String(n).trim().split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('') || 'م';
  const avatar = (p) => p.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="${esc(p.display_name || 'مشجع')}">` : esc(initials(p.display_name || 'مشجع'));
  const commentsFor = (id) => state.comments.filter((x) => x.post_id === id);
  const likesFor = (id) => state.likes.filter((x) => x.post_id === id);
  const isLiked = (id) => !!state.user && likesFor(id).some((x) => x.user_id === state.user.id);

  function login(msg = 'سجّل الدخول بحسابك أولًا') {
    const b = document.getElementById('aghAccountBtn');
    if (b) b.click();
    else alert(msg);
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    try {
      const { data: sessionData } = await db.auth.getSession();
      state.user = sessionData?.session?.user || null;
      const { data: posts, error } = await db.from('fan_posts').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      state.posts = posts || [];
      const ids = state.posts.map((x) => x.id);
      state.likes = [];
      state.comments = [];
      state.profiles = new Map();
      if (ids.length) {
        const [lr, cr] = await Promise.all([
          db.from('fan_post_likes').select('post_id,user_id,created_at').in('post_id', ids),
          db.from('fan_post_comments').select('id,post_id,user_id,body,is_hidden,created_at').in('post_id', ids).order('created_at', { ascending: true })
        ]);
        state.likes = lr.data || [];
        state.comments = cr.data || [];
        const uids = [...new Set(state.comments.map((x) => x.user_id))];
        if (uids.length) {
          const { data: profiles } = await db.from('fan_profiles').select('user_id,display_name,username,avatar_url').in('user_id', uids);
          for (const p of profiles || []) state.profiles.set(p.user_id, p);
        }
      }
    } catch (e) {
      console.warn('[official-community]', e);
    } finally {
      state.loading = false;
    }
  }

  function commentHtml(c) {
    const p = profileFor(c.user_id);
    return `<div class="agh-comment"><span class="agh-comment-avatar">${avatar(p)}</span><div class="agh-comment-bubble"><b>${esc(p.display_name || p.username || 'مشجع')}</b><p>${esc(c.body)}</p><small>${esc(formatDate(c.created_at))}</small></div>${state.user?.id === c.user_id ? `<button class="agh-comment-delete" data-official-comment-delete="${c.id}" aria-label="حذف التعليق">×</button>` : ''}</div>`;
  }

  function postHtml(post) {
    const comments = commentsFor(post.id);
    const shown = state.expanded.has(post.id) ? comments : comments.slice(-3);
    const likeCount = likesFor(post.id).length;
    return `<article class="agh-official-post" data-official-post="${post.id}"><div class="agh-official-post-head"><span class="agh-official-avatar"><img src="${logo()}" alt="كأس أغشوركيت"></span><span><b>${esc(post.author_name || 'إدارة كأس أغشوركيت')}</b><small>${esc(formatDate(post.created_at))}</small></span><span class="agh-official-badge">${esc(post.author_badge || 'رسمي')}</span></div>${post.body ? `<div class="agh-official-body">${esc(post.body)}</div>` : ''}${post.media_url ? (post.media_type === 'video' ? `<video class="agh-official-media" src="${esc(post.media_url)}" controls playsinline preload="metadata"></video>` : `<img class="agh-official-media" src="${esc(post.media_url)}" alt="منشور رسمي" loading="lazy">`) : ''}<div class="agh-official-actions"><button class="${isLiked(post.id) ? 'on' : ''}" data-official-like="${post.id}">♥ ${likeCount}</button><button data-official-focus-comment="${post.id}">💬 تعليق</button><span class="agh-comment-count">${comments.length} تعليق</span></div><div class="agh-comments"><div class="agh-comment-list">${shown.map(commentHtml).join('') || '<div style="color:#78837b;font:700 9px Cairo,sans-serif">لا توجد تعليقات بعد.</div>'}</div>${comments.length > 3 ? `<button class="agh-comments-more" data-official-comments-more="${post.id}">${state.expanded.has(post.id) ? 'عرض أقل' : `عرض كل التعليقات (${comments.length})`}</button>` : ''}${state.user ? `<form class="agh-comment-form" data-official-comment-form="${post.id}"><input maxlength="1000" placeholder="اكتب تعليقك…" aria-label="اكتب تعليقك"><button type="submit">إرسال</button></form>` : `<button class="agh-comment-login" data-official-login>سجّل الدخول للتعليق أو الإعجاب</button>`}</div></article>`;
  }

  function render() {
    if (route() !== 'community') return;
    const stories = state.posts.filter((x) => x.kind === 'story' && (!x.expires_at || new Date(x.expires_at) > new Date()));
    const posts = state.posts.filter((x) => x.kind === 'post');
    main.innerHTML = `<div class="agh-official-community" data-official-community="v2"><header class="agh-official-hero"><div><span>AGCHOURGHIT OFFICIAL</span><h1>منشورات وقصص البطولة</h1><p>المحتوى هنا تنشره إدارة كأس أغشوركيت فقط. يمكن للمشجعين الإعجاب والتعليق بحساباتهم.</p></div><div class="agh-official-pill">✓ محتوى رسمي</div></header>${stories.length ? `<div class="agh-official-stories">${stories.map((s) => `<button class="agh-official-story" data-official-story="${s.id}"><span class="agh-official-story-ring"><span><img src="${logo()}" alt="قصة رسمية"></span></span><b>${esc((s.body || 'قصة').slice(0, 18))}</b></button>`).join('')}</div>` : ''}<section class="agh-official-feed">${posts.map(postHtml).join('') || '<div class="agh-official-empty">ستظهر هنا منشورات إدارة البطولة عند نشرها من لوحة الإدارة.</div>'}</section></div>`;
  }

  async function refreshAndRender() { await load(); if (route() === 'community') render(); }

  async function toggleLike(postId) {
    if (!state.user) return login();
    const liked = isLiked(postId);
    const r = liked
      ? await db.from('fan_post_likes').delete().eq('post_id', postId).eq('user_id', state.user.id)
      : await db.from('fan_post_likes').insert({ post_id: postId, user_id: state.user.id });
    if (r.error) return console.warn(r.error);
    await refreshAndRender();
  }

  async function addComment(postId, input) {
    if (!state.user) return login();
    const body = String(input?.value || '').trim();
    if (!body) return;
    input.disabled = true;
    const { error } = await db.from('fan_post_comments').insert({ post_id: postId, user_id: state.user.id, body });
    input.disabled = false;
    if (error) { console.warn(error); return; }
    state.expanded.add(postId);
    await refreshAndRender();
    setTimeout(() => main.querySelector(`[data-official-post="${postId}"] .agh-comments`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 40);
  }

  async function deleteComment(id) {
    if (!state.user) return;
    const { error } = await db.from('fan_post_comments').delete().eq('id', id).eq('user_id', state.user.id);
    if (!error) await refreshAndRender();
  }

  function openStory(id) {
    const s = state.posts.find((x) => x.id === id);
    if (!s) return;
    let layer = document.getElementById('aghOfficialStoryView');
    if (!layer) { layer = document.createElement('div'); layer.id = 'aghOfficialStoryView'; layer.className = 'agh-official-story-view'; document.body.appendChild(layer); }
    layer.hidden = false;
    document.body.style.overflow = 'hidden';
    layer.innerHTML = `<div class="agh-official-story-card"><div class="agh-official-story-top"><img src="${logo()}" alt="كأس أغشوركيت"><span><b>${esc(s.author_name || 'إدارة كأس أغشوركيت')}</b><small>${esc(formatDate(s.created_at))} · ${likesFor(s.id).length} إعجاب</small></span><button class="agh-official-story-close" type="button">×</button></div>${s.media_url ? (s.media_type === 'video' ? `<video class="agh-official-story-media" src="${esc(s.media_url)}" controls autoplay playsinline></video>` : `<img class="agh-official-story-media" src="${esc(s.media_url)}" alt="قصة رسمية">`) : `<div class="agh-official-story-onlytext">${esc(s.body || '')}</div>`}${s.media_url && s.body ? `<div class="agh-official-story-text">${esc(s.body)}</div>` : ''}</div>`;
    const close = () => { layer.hidden = true; document.body.style.overflow = ''; layer.querySelector('video')?.pause(); };
    layer.querySelector('.agh-official-story-close').onclick = close;
    layer.onclick = (e) => { if (e.target === layer) close(); };
  }

  document.addEventListener('click', (e) => {
    const like = e.target.closest?.('[data-official-like]'); if (like) { e.preventDefault(); toggleLike(like.dataset.officialLike); return; }
    const loginBtn = e.target.closest?.('[data-official-login]'); if (loginBtn) { e.preventDefault(); login(); return; }
    const focus = e.target.closest?.('[data-official-focus-comment]'); if (focus) { e.preventDefault(); const input = main.querySelector(`[data-official-comment-form="${focus.dataset.officialFocusComment}"] input`); if (input) input.focus(); else login(); return; }
    const more = e.target.closest?.('[data-official-comments-more]'); if (more) { e.preventDefault(); const id = more.dataset.officialCommentsMore; state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id); render(); return; }
    const del = e.target.closest?.('[data-official-comment-delete]'); if (del) { e.preventDefault(); deleteComment(del.dataset.officialCommentDelete); return; }
    const story = e.target.closest?.('[data-official-story]'); if (story) { e.preventDefault(); openStory(story.dataset.officialStory); }
  }, true);

  document.addEventListener('submit', (e) => {
    const form = e.target.closest?.('[data-official-comment-form]');
    if (!form) return;
    e.preventDefault();
    addComment(form.dataset.officialCommentForm, form.querySelector('input'));
  }, true);

  db.auth.onAuthStateChange((_, session) => { state.user = session?.user || null; if (route() === 'community') setTimeout(refreshAndRender, 50); });
  window.addEventListener('hashchange', () => { clearTimeout(renderTimer); renderTimer = setTimeout(() => { if (route() === 'community') refreshAndRender(); }, 130); });
  new MutationObserver(() => {
    if (route() !== 'community') return;
    if (!main.querySelector('[data-official-community="v2"]')) {
      clearTimeout(renderTimer);
      renderTimer = setTimeout(() => { if (route() === 'community') refreshAndRender(); }, 100);
    }
  }).observe(main, { childList: true, subtree: false });

  if (route() === 'community') setTimeout(refreshAndRender, 180);
})();
