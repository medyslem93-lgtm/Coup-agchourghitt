(() => {
  'use strict';
  if (window.__aghSiteSmoothV4) return;
  window.__aghSiteSmoothV4 = true;

  const cfg = window.AGCH_CONFIG || {};
  const main = document.getElementById('appMain');
  if (!main || !window.supabase?.createClient || !cfg.supabaseUrl || !cfg.supabaseKey) return;

  const db = window.AGCH_SUPABASE_CLIENT || window.aghDb || window.supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabaseKey,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }, global: { headers: { 'x-client-info': 'agh-site-smooth-v4' } } }
  );
  const TOURNAMENT_ID = '4b420e85-19b3-479c-bd79-e0fef79a105f';
  const route = () => decodeURIComponent(location.hash || '').replace(/^#\/?/, '').split(/[/?]/)[0] || 'home';
  let communityTimer = 0;
  let communityAttempts = 0;
  let candidateBusy = false;

  const style = document.createElement('style');
  style.id = 'aghSiteSmoothV4Styles';
  style.textContent = `
    html{scroll-behavior:smooth}body{overscroll-behavior-y:none}button,a,[role="button"],[data-route],[data-agh-route]{touch-action:manipulation;-webkit-tap-highlight-color:transparent}.app-main{transition:opacity .16s ease,transform .16s ease}.app-main.agh-route-pending{opacity:.72;transform:translateY(3px)}.agh-smooth-loading{max-width:880px;margin:0 auto;padding:22px 12px 120px}.agh-smooth-loading i{display:block;border-radius:16px;background:linear-gradient(100deg,#111713 25%,#1a231c 40%,#111713 55%);background-size:240% 100%;animation:aghSmoothShimmer 1.15s linear infinite}.agh-smooth-loading i:nth-child(1){width:42%;height:30px;margin-bottom:18px}.agh-smooth-loading i:nth-child(2){width:100%;height:74px;margin-bottom:12px}.agh-smooth-loading i:nth-child(3){width:100%;height:240px}@keyframes aghSmoothShimmer{to{background-position:-240% 0}}
    .agh-account-google.agh-google-primary{order:-20;min-height:50px!important;border-radius:14px!important;font-size:12px!important;box-shadow:0 8px 25px rgba(255,255,255,.08)}.agh-login-fast-note{order:-19;text-align:center;color:#aab4ad;font:700 9px/1.7 Cairo,sans-serif;margin:-2px 0 2px}.agh-account-sep.agh-login-sep{order:-18}.agh-account-secondary[data-ac-signup]{border-color:rgba(199,255,55,.22)!important;background:rgba(199,255,55,.07)!important;color:#e9ff9c!important}.agh-account-secondary[data-ac-magic]{color:#d8dfda!important}.agh-account-form>.agh-account-label{order:0}.agh-account-form>[data-ac-login]{order:1}.agh-account-form>.agh-account-row{order:2}.agh-account-form>[data-ac-reset]{order:3}.agh-account-form>[data-ac-msg]{order:4}
    .agh-pot-candidate.agh-vote-card-busy{pointer-events:none;opacity:.72}.agh-pot-candidate[data-pot-profile-card]{cursor:pointer}.agh-quick-vote-hint{position:fixed;z-index:100800;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));transform:translateX(-50%);max-width:min(92vw,440px);background:#111713;color:#fff;border:1px solid rgba(223,255,0,.26);border-radius:14px;padding:10px 14px;box-shadow:0 15px 42px #0008;font:900 10px Cairo,sans-serif;text-align:center}
    .agh-community-zone-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:5px 1px 10px}.agh-community-zone-title h2{margin:0;color:#fff;font:1000 16px Cairo,sans-serif}.agh-community-zone-title span{color:#8e9991;font:700 9px Cairo,sans-serif}.agh-story-placeholder{display:flex;gap:10px;overflow:hidden;padding:0 0 14px}.agh-story-placeholder .circle{width:62px;height:62px;border-radius:50%;border:2px dashed rgba(223,255,0,.22);background:#101612;display:grid;place-items:center;color:#dfff00;font-size:22px}.agh-story-placeholder div{display:grid;justify-items:center;gap:5px;color:#7f8a82;font:800 8px Cairo,sans-serif}.agh-official-body a{color:#dfff00;text-decoration:none;font-weight:900;overflow-wrap:anywhere}.agh-official-share{margin-inline-start:0}.agh-official-post{content-visibility:auto;contain-intrinsic-size:480px}.agh-official-story{touch-action:manipulation}.agh-community-live-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#dfff00;box-shadow:0 0 0 4px rgba(223,255,0,.08);margin-inline-end:6px}
    @media(max-width:600px){.agh-smooth-loading{padding-inline:10px}.agh-official-actions button{min-height:38px}.agh-comment-form input{min-height:42px}.agh-comment-form button{min-width:68px}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.app-main{transition:none}.agh-smooth-loading i{animation:none}}
  `;
  document.head.appendChild(style);

  function toast(text) {
    document.querySelector('.agh-quick-vote-hint')?.remove();
    const el = document.createElement('div');
    el.className = 'agh-quick-vote-hint';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  function markRoutePending() {
    main.classList.add('agh-route-pending');
    clearTimeout(markRoutePending.t);
    markRoutePending.t = setTimeout(() => main.classList.remove('agh-route-pending'), 260);
  }

  function showCommunityLoading() {
    if (route() !== 'community') return;
    if (main.querySelector('[data-official-community],.agh-community-page')) return;
    main.innerHTML = '<div class="agh-smooth-loading" aria-label="جارٍ تحميل المجتمع"><i></i><i></i><i></i></div>';
  }

  function loadOfficialCommunityScript(force = false) {
    let tag = document.querySelector('script[data-agh-official-community-v2]');
    if (window.__aghOfficialCommunityV2 && !force) return;
    if (tag && !force) return;
    if (tag) tag.remove();
    tag = document.createElement('script');
    tag.src = 'assets/community-official-v2.js?v=20260920-2';
    tag.dataset.aghOfficialCommunityV2 = '1';
    tag.async = false;
    tag.onload = () => setTimeout(() => window.dispatchEvent(new HashChangeEvent('hashchange')), 30);
    document.head.appendChild(tag);
  }

  function scheduleCommunityRepair() {
    if (route() !== 'community') return;
    clearTimeout(communityTimer);
    communityTimer = setTimeout(() => {
      if (route() !== 'community') return;
      if (main.querySelector('[data-official-community="v2"]')) {
        communityAttempts = 0;
        enhanceCommunity();
        return;
      }
      if (!window.__aghOfficialCommunityV2) loadOfficialCommunityScript(true);
      if (communityAttempts < 8) {
        communityAttempts += 1;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        scheduleCommunityRepair();
      }
    }, communityAttempts ? 130 : 70);
  }

  function linkify(element) {
    if (!element || element.dataset.aghLinked === '1') return;
    element.dataset.aghLinked = '1';
    const text = element.textContent || '';
    const re = /(https?:\/\/[^\s]+)/g;
    if (!re.test(text)) return;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    text.replace(re, (url, _m, offset) => {
      frag.appendChild(document.createTextNode(text.slice(last, offset)));
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = url.replace(/^https?:\/\//, '');
      frag.appendChild(a);
      last = offset + url.length;
      return url;
    });
    frag.appendChild(document.createTextNode(text.slice(last)));
    element.replaceChildren(frag);
  }

  function enhanceCommunity() {
    const root = main.querySelector('[data-official-community="v2"]');
    if (!root) return;
    const hero = root.querySelector('.agh-official-hero');
    const stories = root.querySelector('.agh-official-stories');
    if (!root.querySelector('[data-agh-stories-title]')) {
      const title = document.createElement('div');
      title.className = 'agh-community-zone-title';
      title.dataset.aghStoriesTitle = '1';
      title.innerHTML = '<h2><i class="agh-community-live-dot"></i>القصص</h2><span>من إدارة البطولة</span>';
      hero?.insertAdjacentElement('afterend', title);
      if (!stories) {
        const empty = document.createElement('div');
        empty.className = 'agh-story-placeholder';
        empty.innerHTML = '<div><span class="circle">＋</span><b>ستظهر القصص هنا</b></div>';
        title.insertAdjacentElement('afterend', empty);
      }
    }
    const feed = root.querySelector('.agh-official-feed');
    if (feed && !root.querySelector('[data-agh-posts-title]')) {
      const title = document.createElement('div');
      title.className = 'agh-community-zone-title';
      title.dataset.aghPostsTitle = '1';
      title.innerHTML = '<h2>المنشورات الرسمية</h2><span>أخبار · صور · فيديو</span>';
      feed.insertAdjacentElement('beforebegin', title);
    }
    root.querySelectorAll('.agh-official-body').forEach(linkify);
    root.querySelectorAll('.agh-official-post').forEach((post) => {
      const actions = post.querySelector('.agh-official-actions');
      if (!actions || actions.querySelector('[data-agh-share-post]')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'agh-official-share';
      button.dataset.aghSharePost = post.dataset.officialPost || '';
      button.textContent = '↗ مشاركة';
      const count = actions.querySelector('.agh-comment-count');
      actions.insertBefore(button, count || null);
    });
  }

  async function sharePost(postEl) {
    const body = postEl?.querySelector('.agh-official-body')?.textContent?.trim() || 'منشور من كأس أغشوركيت';
    const data = { title: 'كأس أغشوركيت', text: body.slice(0, 500), url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else if (navigator.clipboard) { await navigator.clipboard.writeText(`${data.text}\n${data.url}`); toast('تم نسخ المنشور للمشاركة'); }
    } catch (_) {}
  }

  function polishLogin() {
    const layer = document.getElementById('aghAccountLayer');
    if (!layer || layer.hidden) return;
    const form = layer.querySelector('[data-ac-form]');
    if (!form || form.dataset.aghPolished === '1') return;
    form.dataset.aghPolished = '1';
    const google = form.querySelector('[data-ac-google]');
    const sep = form.querySelector('.agh-account-sep');
    const signup = form.querySelector('[data-ac-signup]');
    const magic = form.querySelector('[data-ac-magic]');
    if (google) {
      google.classList.add('agh-google-primary');
      google.textContent = 'G  المتابعة بحساب Google';
      form.insertBefore(google, form.firstChild);
      const note = document.createElement('div');
      note.className = 'agh-login-fast-note';
      note.textContent = 'أسرع طريقة: دخول Google بضغطة واحدة، أو أنشئ حسابًا بالبريد.';
      google.insertAdjacentElement('afterend', note);
      if (sep) { sep.classList.add('agh-login-sep'); note.insertAdjacentElement('afterend', sep); }
    }
    if (signup) signup.textContent = 'إنشاء حساب جديد';
    if (magic) magic.textContent = 'الدخول بالبريد بدون كلمة مرور';
    form.querySelector('input[name="email"]')?.setAttribute('enterkeyhint', 'next');
    form.querySelector('input[name="password"]')?.setAttribute('enterkeyhint', 'go');
  }

  async function accountVoteStatus() {
    const { data: sessionData } = await db.auth.getSession();
    const user = sessionData?.session?.user || null;
    if (!user) return { user: null, myVote: null };
    try {
      const { data, error } = await db.rpc('get_player_tournament_account_my_vote', { p_tournament_id: TOURNAMENT_ID });
      if (error) throw error;
      return { user, myVote: data || null };
    } catch (_) {
      return { user, myVote: null };
    }
  }

  function candidateElement(id) {
    return [...document.querySelectorAll('#aghPotSheet [data-pot-candidate]')].find((x) => x.dataset.potCandidate === id) || null;
  }

  function openVoteChoice(id, card) {
    const cta = document.querySelector('#aghPlayerTournamentVote [data-pot-open]');
    if (!cta) { toast('تعذر فتح التصويت الآن. حدّث الصفحة وحاول مرة أخرى.'); return; }
    cta.click();
    setTimeout(() => {
      const choice = candidateElement(id);
      if (!choice) return;
      choice.click();
      choice.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const name = card?.querySelector('.agh-pot-player b')?.textContent?.trim() || 'هذا اللاعب';
      toast(`تم اختيار ${name} — أكّد التصويت`);
    }, 70);
  }

  async function openCandidateProfile(id, card) {
    try {
      const { data } = await db.from('player_tournament_candidates').select('player_id').eq('id', id).maybeSingle();
      if (data?.player_id) {
        location.hash = `#/player/${data.player_id}`;
        return;
      }
    } catch (_) {}
    const profileButton = card?.querySelector('[data-pot-profile]');
    if (profileButton) profileButton.click();
  }

  async function handleCandidateTap(id, card) {
    if (!id || candidateBusy) return;
    candidateBusy = true;
    card?.classList.add('agh-vote-card-busy');
    try {
      const status = await accountVoteStatus();
      if (status.user && status.myVote) await openCandidateProfile(id, card);
      else openVoteChoice(id, card);
    } finally {
      candidateBusy = false;
      card?.classList.remove('agh-vote-card-busy');
    }
  }

  document.addEventListener('click', (event) => {
    const share = event.target.closest?.('[data-agh-share-post]');
    if (share) {
      event.preventDefault();
      sharePost(share.closest('.agh-official-post'));
      return;
    }

    const candidate = event.target.closest?.('#aghPlayerTournamentVote [data-pot-profile-card]');
    if (candidate && !event.target.closest('[data-pot-profile]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      handleCandidateTap(candidate.dataset.potProfileCard, candidate);
      return;
    }

    const routeButton = event.target.closest?.('[data-route],[data-agh-route]');
    if (routeButton) {
      markRoutePending();
      const target = routeButton.dataset.aghRoute || routeButton.dataset.route || '';
      if (target === 'community') setTimeout(showCommunityLoading, 0);
    }

    if (event.target.closest?.('#aghAccountBtn,[data-official-login]')) setTimeout(polishLogin, 25);
  }, true);

  window.addEventListener('hashchange', () => {
    markRoutePending();
    if (route() === 'community') {
      communityAttempts = 0;
      setTimeout(scheduleCommunityRepair, 40);
    }
    setTimeout(() => main.classList.remove('agh-route-pending'), 140);
  });

  const observer = new MutationObserver(() => {
    polishLogin();
    if (route() !== 'community') return;
    if (main.querySelector('[data-official-community="v2"]')) enhanceCommunity();
    else scheduleCommunityRepair();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  db.auth.onAuthStateChange(() => setTimeout(() => {
    polishLogin();
    if (route() === 'community') window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, 0));

  if (route() === 'community') {
    showCommunityLoading();
    loadOfficialCommunityScript(!window.__aghOfficialCommunityV2);
    scheduleCommunityRepair();
  }
  setTimeout(polishLogin, 250);
})();
