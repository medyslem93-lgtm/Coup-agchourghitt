(() => {
  'use strict';

  const cfg = window.AGCH_CONFIG || {};
  const factory = window.supabase?.createClient;
  if (!factory || !cfg.supabaseUrl || !cfg.supabaseKey) return;

  const db = factory(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'aghchorguit-media-score-fix' } },
  });

  let lastMatchId = '';
  let payload = null;
  let timer = 0;

  const norm = (v = '') => String(v || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ـ/g, '').replace(/\s+/g, ' ');
  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const matchIdFromHash = () => location.hash.match(/^#\/?match\/([0-9a-f-]{36})(?:\/|$)/i)?.[1] || '';

  function injectStyles() {
    if (document.getElementById('aghMediaScoreFixCss')) return;
    const style = document.createElement('style');
    style.id = 'aghMediaScoreFixCss';
    style.textContent = `
      .agh-media-compact-score{position:absolute;z-index:8;top:10px;left:10px;right:10px;display:flex;align-items:center;justify-content:space-between;gap:7px;direction:rtl;pointer-events:none;font-family:inherit}
      .agh-media-compact-score .agh-ms-team{display:flex;align-items:center;gap:6px;max-width:43%;padding:5px 8px;border-radius:10px;background:rgba(4,8,7,.82);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.12);color:#fff;font-size:10px;font-weight:800;min-width:0}
      .agh-media-compact-score .agh-ms-team img{width:22px;height:22px;border-radius:6px;background:#fff;object-fit:contain;padding:1px;flex:0 0 auto}
      .agh-media-compact-score .agh-ms-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
      .agh-media-compact-score .agh-ms-count{display:grid;place-items:center;min-width:22px;height:22px;border-radius:7px;background:var(--accent,#2fc3ff);color:#06100d;font-size:12px;font-weight:950;line-height:1;padding:0 5px;flex:0 0 auto}
      .agh-media-compact-score .agh-ms-team.is-scoring{border-color:color-mix(in srgb,var(--accent,#2fc3ff) 65%,rgba(255,255,255,.18));box-shadow:0 0 0 1px color-mix(in srgb,var(--accent,#2fc3ff) 15%,transparent)}
      .agh-media-compact-score .agh-ms-minute{flex:0 0 auto;padding:5px 7px;border-radius:8px;background:rgba(4,8,7,.82);color:#fff;font-size:9px;font-weight:900;direction:ltr}
      .agh-media-score-hidden{display:none!important}
      .match-recap .recap-score strong{direction:ltr;unicode-bidi:isolate}
      @media(max-width:560px){.agh-media-compact-score{top:7px;left:7px;right:7px;gap:5px}.agh-media-compact-score .agh-ms-team{padding:4px 6px;font-size:9px;max-width:44%}.agh-media-compact-score .agh-ms-team img{width:19px;height:19px}.agh-media-compact-score .agh-ms-count{min-width:19px;height:19px;font-size:11px}.agh-media-compact-score .agh-ms-minute{padding:4px 6px;font-size:8px}}
    `;
    document.head.appendChild(style);
  }

  async function loadMatch(matchId) {
    const [matchRes, mediaRes, eventRes] = await Promise.all([
      db.from('matches').select('id,team_a_id,team_b_id,score_a,score_b,status,team_a:teams!matches_team_a_id_fkey(id,name,logo_url),team_b:teams!matches_team_b_id_fkey(id,name,logo_url)').eq('id', matchId).single(),
      db.from('media_assets').select('id,public_url,media_type,kind,captured_minute,score_a,score_b,created_at').eq('entity_type','match').eq('entity_id',matchId).order('created_at',{ascending:true}),
      db.from('match_events').select('id,type,team_id,minute,created_at').eq('match_id',matchId).in('type',['هدف','هدف عكسي','ركلة جزاء مسجلة']).order('minute',{ascending:true}).order('created_at',{ascending:true}),
    ]);
    if (matchRes.error) throw matchRes.error;
    return { match: matchRes.data, media: mediaRes.data || [], events: eventRes.data || [] };
  }

  function scoreAtMedia(media, data) {
    if (Number.isFinite(Number(media.score_a)) && Number.isFinite(Number(media.score_b))) {
      return { a:Number(media.score_a), b:Number(media.score_b) };
    }
    let a = 0, b = 0;
    const minute = Number(media.captured_minute ?? 9999);
    for (const e of data.events) {
      if (Number(e.minute ?? 0) > minute) continue;
      if (e.team_id === data.match.team_a_id) a += 1;
      else if (e.team_id === data.match.team_b_id) b += 1;
    }
    return { a, b };
  }

  function scoringSide(media, data, score) {
    const minute = Number(media.captured_minute ?? -1);
    const sameMinute = data.events.filter(e => Number(e.minute) === minute);
    const event = sameMinute[sameMinute.length - 1];
    if (event?.team_id === data.match.team_a_id) return 'a';
    if (event?.team_id === data.match.team_b_id) return 'b';
    if (score.a > 0 && score.b === 0) return 'a';
    if (score.b > 0 && score.a === 0) return 'b';
    return '';
  }

  function mediaForVideo(video, data) {
    const src = video.currentSrc || video.getAttribute('src') || video.querySelector('source')?.getAttribute('src') || '';
    if (!src) return null;
    return data.media.find(item => item.public_url && (src === item.public_url || src.includes(item.public_url) || item.public_url.includes(src))) || null;
  }

  function hideLegacyScore(wrapper, teamA, teamB) {
    const a = norm(teamA.name), b = norm(teamB.name);
    const nodes = wrapper.querySelectorAll('div,section,header');
    for (const node of nodes) {
      if (node.classList.contains('agh-media-compact-score')) continue;
      const text = norm(node.textContent);
      if (!text || text.length > 160 || !text.includes(a) || !text.includes(b)) continue;
      const imgs = node.querySelectorAll('img').length;
      if (imgs < 2) continue;
      const style = getComputedStyle(node);
      if (style.position === 'absolute' || style.position === 'fixed') {
        node.classList.add('agh-media-score-hidden');
      }
    }
  }

  function decorateVideos(data) {
    for (const video of document.querySelectorAll('#appMain video')) {
      const media = mediaForVideo(video, data);
      if (!media || media.media_type !== 'video') continue;
      const wrapper = video.closest('figure,article,.media-item,.match-media-item,.match-recap-media,.recap-media-item,.media-card') || video.parentElement;
      if (!wrapper) continue;
      if (getComputedStyle(wrapper).position === 'static') wrapper.style.position = 'relative';
      hideLegacyScore(wrapper, data.match.team_a, data.match.team_b);
      const score = scoreAtMedia(media, data);
      const scoring = scoringSide(media, data, score);
      let bar = wrapper.querySelector(':scope > .agh-media-compact-score');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'agh-media-compact-score';
        wrapper.appendChild(bar);
      }
      const a = data.match.team_a || {name:'الفريق الأول',logo_url:''};
      const b = data.match.team_b || {name:'الفريق الثاني',logo_url:''};
      const logo = t => t.logo_url ? `<img src="${esc(t.logo_url)}" alt="">` : '';
      bar.innerHTML = `<span class="agh-ms-team ${scoring==='a'?'is-scoring':''}">${logo(a)}<span class="agh-ms-name">${esc(a.name)}</span><b class="agh-ms-count">${score.a}</b></span><span class="agh-ms-minute">${media.captured_minute != null ? `${esc(media.captured_minute)}′` : ''}</span><span class="agh-ms-team ${scoring==='b'?'is-scoring':''}">${logo(b)}<span class="agh-ms-name">${esc(b.name)}</span><b class="agh-ms-count">${score.b}</b></span>`;
    }
  }

  function fixRecapScore(data) {
    const board = document.querySelector('#appMain .match-recap-scoreboard');
    const strong = board?.querySelector('.recap-score strong');
    const teams = board ? [...board.querySelectorAll('.recap-team')] : [];
    if (!board || !strong || teams.length < 2) return;
    const sorted = teams.map(el => ({el, x:el.getBoundingClientRect().left, name:norm(el.textContent)})).sort((x,y)=>x.x-y.x);
    const left = sorted[0], right = sorted[sorted.length-1];
    const aName = norm(data.match.team_a?.name), bName = norm(data.match.team_b?.name);
    const scoreFor = name => name.includes(aName) ? Number(data.match.score_a || 0) : name.includes(bName) ? Number(data.match.score_b || 0) : 0;
    strong.innerHTML = `${scoreFor(left.name)}<i>–</i>${scoreFor(right.name)}`;
    strong.setAttribute('dir','ltr');
  }

  async function apply(force = false) {
    const matchId = matchIdFromHash();
    if (!matchId) { lastMatchId=''; payload=null; return; }
    try {
      if (force || !payload || lastMatchId !== matchId) {
        payload = await loadMatch(matchId);
        lastMatchId = matchId;
      }
      if (matchIdFromHash() !== matchId) return;
      injectStyles();
      fixRecapScore(payload);
      decorateVideos(payload);
    } catch (e) {
      console.error('Match media score fix failed', e);
    }
  }

  function schedule(force = false) {
    clearTimeout(timer);
    timer = setTimeout(() => apply(force), 120);
  }

  window.addEventListener('hashchange', () => schedule(true));
  document.addEventListener('DOMContentLoaded', () => schedule(true), {once:true});
  const root = document.getElementById('appMain');
  if (root) new MutationObserver(() => schedule(false)).observe(root,{childList:true,subtree:true});
  schedule(true);
})();