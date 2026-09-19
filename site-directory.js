(() => {
  'use strict';

  const main = document.getElementById('appMain');
  const searchLayer = document.getElementById('searchLayer');
  const searchInput = document.getElementById('globalSearch');
  const searchResults = document.getElementById('searchResults');
  const cfg = window.AGCH_CONFIG || {};
  if (!main || !searchLayer || !searchInput || !searchResults || !window.supabase?.createClient || !cfg.supabaseUrl || !cfg.supabaseKey) return;

  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'aghchorguit-directory-web' } },
  });

  const store = { tournaments: [], teams: [], players: [], referees: [], assignments: [], matches: [], news: [], loaded: false, loading: null };
  let rendering = false;
  let searchTimer = 0;
  let activeSearchType = 'all';

  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const route = () => (location.hash.replace(/^#\/?/, '') || 'home').split('/').filter(Boolean).map(decodeURIComponent);
  const normalize = (value = '') => String(value).normalize('NFKD').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/ـ/g, '').replace(/[أإآٱ]/g, 'ا').replace(/[ىي]/g, 'ي').replace(/ة/g, 'ه').replace(/[ؤ]/g, 'و').replace(/[ئ]/g, 'ي').replace(/[گڨ]/g, 'ك').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
  const img = (url, alt = '') => `<img src="${esc(url || 'assets/tournament.jpg')}" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='assets/tournament.jpg'">`;
  const team = id => store.teams.find(x => x.id === id);
  const tournament = id => store.tournaments.find(x => x.id === id);
  const fmtDate = value => { try { return value ? new Intl.DateTimeFormat('ar-MR', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00Z`)) : 'موعد غير محدد'; } catch { return value || 'موعد غير محدد'; } };

  async function load(force = false) {
    if (store.loaded && !force) return store;
    if (store.loading) return store.loading;
    store.loading = (async () => {
      const queries = [
        ['tournaments', db.from('tournaments').select('id,slug,name,short_name,season,status,logo_url,accent_color,sort_order').order('sort_order')],
        ['teams', db.from('teams').select('id,tournament_id,name,logo_url,group_name,category,coach').order('name')],
        ['players', db.from('players').select('id,team_id,name,photo_url,position,number,is_captain').order('name')],
        ['referees', db.from('referees').select('*').order('name')],
        ['assignments', db.from('referee_assignments').select('id,referee_id,tournament_id,match_id,role,category,name,photo_url')],
        ['matches', db.from('matches').select('id,tournament_id,team_a_id,team_b_id,match_date,match_time,status,stage,round_name,score_a,score_b,venue').order('match_date', { ascending: false, nullsFirst: false })],
        ['news', db.from('news').select('id,title,description,type,image_url,publish_date').order('publish_date', { ascending: false })],
      ];
      const results = await Promise.all(queries.map(async ([key, q]) => [key, await q]));
      results.forEach(([key, result]) => { if (!result.error) store[key] = result.data || []; });
      store.loaded = true;
      store.loading = null;
      return store;
    })().catch(error => { store.loading = null; console.warn('Directory data unavailable', error); return store; });
    return store.loading;
  }

  function navCard(routeName, icon, title, subtitle, count) {
    return `<button class="agh-dir-card" type="button" data-route="${esc(routeName)}"><span class="agh-dir-icon">${icon}</span><span class="agh-dir-copy"><b>${esc(title)}</b><small>${esc(subtitle)}</small></span>${count != null ? `<strong>${esc(count)}</strong>` : ''}<i>‹</i></button>`;
  }

  function installSectionNav() {
    const header = document.querySelector('.app-header');
    if (!header || document.getElementById('aghSectionNav')) return;
    const nav = document.createElement('nav');
    nav.id = 'aghSectionNav';
    nav.className = 'agh-section-nav';
    nav.setAttribute('aria-label', 'أقسام كأس أغشوركيت');
    nav.innerHTML = [
      ['tournaments','🏆','البطولات'], ['matches','⚽','المباريات'], ['teams','🛡️','الفرق'], ['players','👤','اللاعبون'],
      ['referees','⚖️','الحكام'], ['watch','▶️','شاهد'], ['stats','📊','الإحصائيات'], ['news','📰','الأخبار'], ['directory','☰','كل الأقسام']
    ].map(([r,i,l]) => `<button type="button" data-route="${r}"><span>${i}</span><b>${l}</b></button>`).join('');
    header.insertAdjacentElement('afterend', nav);
  }

  function organizeDesktopNav() {
    const nav = document.querySelector('.desktop-navigation');
    if (nav && nav.dataset.aghOrganized !== '1') {
      nav.dataset.aghOrganized = '1';
      nav.innerHTML = '<button data-route="home">الرئيسية</button><button data-route="matches">المباريات</button><button data-route="tournaments">البطولات</button><button data-route="teams">الفرق</button><button data-route="players">اللاعبون</button><button data-route="referees">الحكام</button><button data-route="directory">المزيد</button>';
    }
    const mobile = document.querySelector('.mobile-navigation');
    if (mobile && mobile.dataset.aghOrganized !== '1') {
      mobile.dataset.aghOrganized = '1';
      mobile.innerHTML = '<button data-route="home"><span>الرئيسية</span></button><button data-route="matches"><span>المباريات</span></button><button class="nav-primary" data-route="tournaments"><span>البطولات</span></button><button data-route="directory"><span>الأقسام</span></button><button data-action="open-search"><span>البحث</span></button>';
    }
  }

  function homeDirectory() {
    if (route()[0] !== 'home' || main.querySelector('.agh-home-directory')) return;
    const anchor = main.querySelector('.hero-layout') || main.querySelector('.tournament-strip') || main.firstElementChild;
    if (!anchor) return;
    const section = document.createElement('section');
    section.className = 'section-block agh-home-directory';
    section.innerHTML = `<div class="agh-dir-head"><div><span>EXPLORE</span><h2>كل شيء في مكانه</h2><p>انتقل مباشرة إلى القسم الذي تبحث عنه دون ازدحام الصفحة الرئيسية.</p></div><button type="button" data-route="directory">عرض كل الأقسام</button></div><div class="agh-dir-grid agh-dir-grid-home">${navCard('tournaments','🏆','البطولات','كل بطولة بصفحتها المستقلة',store.tournaments.length)}${navCard('teams','🛡️','الفرق','جميع الفرق مرتبة حسب البطولة',store.teams.length)}${navCard('players','👤','اللاعبون','ملفات اللاعبين والفرق',store.players.length)}${navCard('referees','⚖️','الحكام','الحكام والتعيينات',store.referees.length)}${navCard('watch','▶️','البث والملخصات','المباشر والفيديو واللقطات')}${navCard('stats','📊','الإحصائيات','الترتيب والهدافون والبطاقات')}</div>`;
    anchor.insertAdjacentElement('afterend', section);
  }

  function shell(title, desc, body, kicker = 'DIRECTORY') {
    return `<div class="page-shell agh-dir-page"><div class="agh-dir-page-head"><div><span>${esc(kicker)}</span><h1>${esc(title)}</h1><p>${esc(desc)}</p></div><button type="button" class="agh-dir-search-open" data-action="open-search">⌕ بحث شامل</button></div>${body}</div>`;
  }

  function tournamentChips(active = 'all', attr = 'data-dir-filter') {
    return `<div class="agh-dir-filters"><button class="${active === 'all' ? 'active' : ''}" ${attr}="all">الكل</button>${store.tournaments.map(t => `<button class="${active === t.id ? 'active' : ''}" ${attr}="${esc(t.id)}">${esc(t.short_name || t.name)}</button>`).join('')}</div>`;
  }

  function renderDirectory() {
    const body = `<section class="agh-dir-hero"><div><small>كأس أغشوركيت 2026</small><h2>دليل الموقع</h2><p>بنفس فكرة مراكز البطولات العالمية: مباريات وفرق ولاعبون وحكام وبطولات ومحتوى مرئي، وكل قسم مستقل وواضح.</p></div><button type="button" data-action="open-search">ابحث عن أي شيء</button></section><div class="agh-dir-grid">${navCard('tournaments','🏆','البطولات','اختر بطولة ثم شاهد تفاصيلها الكاملة',store.tournaments.length)}${navCard('matches','⚽','المباريات','مباشر، قادمة ونتائج',store.matches.length)}${navCard('teams','🛡️','الفرق','كل الفرق مع البطولة والمجموعة',store.teams.length)}${navCard('players','👤','اللاعبون','ملفات اللاعبين والمراكز والأرقام',store.players.length)}${navCard('referees','⚖️','الحكام','الحكام وسجل التعيينات',store.referees.length)}${navCard('watch','▶️','البث والملخصات','البث المباشر، الأهداف والملخصات')}${navCard('stats','📊','الإحصائيات','الترتيب، الهدافون والبطاقات')}${navCard('news','📰','الأخبار','آخر أخبار البطولة',store.news.length)}${navCard('following','❤️','متابعاتي','الفرق واللاعبون الذين تتابعهم')}${navCard('profile','👤','ملفي','ملف المشجع والنشاط')}</div>`;
    main.innerHTML = shell('كل الأقسام', 'واجهة منظمة للوصول السريع إلى كل جزء من المنصة.', body);
  }

  function renderTeamsDirectory(active = 'all') {
    const rows = active === 'all' ? store.teams : store.teams.filter(x => x.tournament_id === active);
    const groups = store.tournaments.map(t => [t, rows.filter(x => x.tournament_id === t.id)]).filter(([,list]) => list.length);
    const body = `${tournamentChips(active)}${groups.map(([t,list]) => `<section class="agh-dir-section"><div class="agh-dir-section-title"><div>${img(t.logo_url,t.short_name || t.name)}<span><b>${esc(t.short_name || t.name)}</b><small>${list.length} فرق</small></span></div><button type="button" data-route="tournament/${esc(t.slug)}/teams">صفحة البطولة</button></div><div class="agh-team-directory">${list.map(x => `<button type="button" class="agh-entity-row" data-route="team/${esc(x.id)}"><i>${img(x.logo_url,x.name)}</i><span><b>${esc(x.name)}</b><small>${x.group_name ? `المجموعة ${esc(x.group_name)} · ` : ''}${x.coach ? `المدرب ${esc(x.coach)}` : esc(t.short_name || '')}</small></span><em>${store.players.filter(p => p.team_id === x.id).length} لاعب</em><strong>‹</strong></button>`).join('')}</div></section>`).join('') || '<div class="agh-dir-empty">لا توجد فرق في هذا القسم.</div>'}`;
    main.innerHTML = shell('الفرق', 'جميع فرق كأس أغشوركيت مرتبة حسب البطولة، وليس قائمة مختلطة.', body, 'TEAMS');
  }

  function renderPlayersDirectory(active = 'all') {
    const validTeamIds = new Set((active === 'all' ? store.teams : store.teams.filter(t => t.tournament_id === active)).map(t => t.id));
    const rows = store.players.filter(p => validTeamIds.has(p.team_id));
    const body = `${tournamentChips(active)}<div class="agh-player-directory">${rows.map(p => { const tm = team(p.team_id); const tr = tournament(tm?.tournament_id); return `<button type="button" class="agh-player-directory-card" data-route="player/${esc(p.id)}"><i>${p.photo_url ? img(p.photo_url,p.name) : `<span>${esc((p.name || '?').slice(0,1))}</span>`}</i><span><b>${esc(p.name)}</b><small>${esc(tm?.name || 'فريق غير محدد')}${p.position ? ` · ${esc(p.position)}` : ''}</small></span><em>${p.number != null ? `#${esc(p.number)}` : esc(tr?.short_name || '')}</em></button>`; }).join('') || '<div class="agh-dir-empty">لا يوجد لاعبون في هذا القسم.</div>'}</div>`;
    main.innerHTML = shell('اللاعبون', 'ملفات مستقلة للاعبين مع الفريق والمركز والرقم، ويمكن الوصول إلى ملف اللاعب مباشرة.', body, 'PLAYERS');
  }

  function refereeStats(id) {
    const a = store.assignments.filter(x => x.referee_id === id && x.match_id);
    return { total: a.length, main: a.filter(x => x.role === 'main').length, assist: a.filter(x => x.role && x.role !== 'main').length };
  }

  function renderRefereesDirectory(active = 'all') {
    const allowed = active === 'all' ? null : new Set(store.assignments.filter(a => a.tournament_id === active).map(a => a.referee_id));
    const rows = store.referees.filter(r => !allowed || allowed.has(r.id));
    const body = `${tournamentChips(active, 'data-ref-filter')}<div class="agh-ref-directory">${rows.map(r => { const s = refereeStats(r.id); return `<button type="button" class="agh-ref-directory-card" data-route="referee/${esc(r.id)}"><i>${r.photo_url ? img(r.photo_url,r.name) : '<span>⚖️</span>'}</i><span><b>${esc(r.name)}</b><small>${s.total} مباراة · ${s.main} رئيسي · ${s.assist} مساعد</small></span><strong>‹</strong></button>`; }).join('') || '<div class="agh-dir-empty">لا يوجد حكام في هذا القسم.</div>'}</div>`;
    main.innerHTML = shell('الحكام', 'دليل مستقل للحكام وتعييناتهم في مباريات البطولات.', body, 'REFEREES');
  }

  function renderRefereeProfile(id) {
    const r = store.referees.find(x => x.id === id);
    if (!r) { main.innerHTML = shell('الحكم غير موجود', 'تعذر العثور على هذا الملف.', '<div class="agh-dir-empty">الملف غير متاح.</div>'); return; }
    const assignments = store.assignments.filter(a => a.referee_id === id && a.match_id);
    const s = refereeStats(id);
    const matches = assignments.map(a => ({ a, m: store.matches.find(m => m.id === a.match_id) })).filter(x => x.m);
    const body = `<section class="agh-ref-profile"><div class="agh-ref-profile-main"><i>${r.photo_url ? img(r.photo_url,r.name) : '<span>⚖️</span>'}</i><div><small>REFEREE PROFILE</small><h2>${esc(r.name)}</h2><p>السجل التحكيمي في كأس أغشوركيت</p></div></div><div class="agh-ref-profile-stats"><div><b>${s.total}</b><span>مباراة</span></div><div><b>${s.main}</b><span>حكم رئيسي</span></div><div><b>${s.assist}</b><span>حكم مساعد</span></div></div></section><section class="agh-dir-section"><div class="agh-dir-section-title"><div><span><b>المباريات والتعيينات</b><small>السجل الكامل</small></span></div></div><div class="agh-team-directory">${matches.map(({a,m}) => { const ta = team(m.team_a_id), tb = team(m.team_b_id), tr = tournament(m.tournament_id); return `<button type="button" class="agh-entity-row" data-route="match/${esc(m.id)}"><i>${img(ta?.logo_url,ta?.name)}</i><span><b>${esc(ta?.name || 'فريق')} × ${esc(tb?.name || 'فريق')}</b><small>${esc(tr?.short_name || '')} · ${fmtDate(m.match_date)} · ${a.role === 'main' ? 'حكم رئيسي' : 'حكم مساعد'}</small></span><em>${m.status === 'انتهت' ? `${m.score_a ?? 0}-${m.score_b ?? 0}` : esc((m.match_time || '').slice(0,5))}</em><strong>‹</strong></button>`; }).join('') || '<div class="agh-dir-empty">لا توجد تعيينات مسجلة.</div>'}</div></section>`;
    main.innerHTML = shell(r.name, 'ملف الحكم وسجل المباريات.', body, 'OFFICIAL');
  }

  function scoreText(text, q) {
    const h = normalize(text), n = normalize(q); if (!h || !n) return 0;
    if (h === n) return 100; if (h.startsWith(n)) return 85; if (h.split(' ').some(w => w.startsWith(n))) return 75; if (h.includes(n)) return 60;
    const tokens = n.split(' ').filter(Boolean); return tokens.length > 1 && tokens.every(t => h.includes(t)) ? 50 : 0;
  }

  function collectSearch(q) {
    const out = [];
    store.tournaments.forEach(t => { const s = scoreText(`${t.name} ${t.short_name} ${t.slug} بطولة الكبار الوسط الصغار المعتزلين`, q); if (s) out.push({type:'tournament',score:s+8,title:t.short_name||t.name,meta:`${t.season||''} · ${t.status||''}`,image:t.logo_url,route:`tournament/${t.slug}/overview`}); });
    store.teams.forEach(t => { const tr = tournament(t.tournament_id); const s = scoreText(`${t.name} ${t.group_name||''} ${tr?.short_name||''}`,q); if(s) out.push({type:'team',score:s+6,title:t.name,meta:`${tr?.short_name||''}${t.group_name?` · المجموعة ${t.group_name}`:''}`,image:t.logo_url,route:`team/${t.id}`}); });
    store.players.forEach(p => { const tm=team(p.team_id), tr=tournament(tm?.tournament_id); const s=scoreText(`${p.name} ${p.position||''} ${p.number||''} ${tm?.name||''} ${tr?.short_name||''}`,q); if(s) out.push({type:'player',score:s+5,title:p.name,meta:`${tm?.name||''}${p.position?` · ${p.position}`:''}`,image:p.photo_url||tm?.logo_url,route:`player/${p.id}`}); });
    store.referees.forEach(r => { const s=scoreText(`${r.name} حكم referee official`,q); if(s) out.push({type:'referee',score:s+5,title:r.name,meta:`${refereeStats(r.id).total} مباراة`,image:r.photo_url,route:`referee/${r.id}`}); });
    store.matches.forEach(m => { const a=team(m.team_a_id),b=team(m.team_b_id),tr=tournament(m.tournament_id); const s=scoreText(`${a?.name||''} ${b?.name||''} ${tr?.short_name||''} ${m.stage||''} ${m.round_name||''} ${m.match_date||''}`,q); if(s) out.push({type:'match',score:s+3,title:`${a?.name||'فريق'} × ${b?.name||'فريق'}`,meta:`${tr?.short_name||''} · ${fmtDate(m.match_date)} · ${m.status||''}`,image:a?.logo_url,route:`match/${m.id}`}); });
    store.news.forEach(n => { const s=scoreText(`${n.title||''} ${n.description||''} ${n.type||''}`,q); if(s) out.push({type:'news',score:s,title:n.title,meta:fmtDate(n.publish_date),image:n.image_url,route:`news/${n.id}`}); });
    return out.sort((a,b)=>b.score-a.score || a.title.localeCompare(b.title,'ar'));
  }

  const searchLabels = { all:'الكل', tournament:'البطولات', team:'الفرق', player:'اللاعبون', referee:'الحكام', match:'المباريات', news:'الأخبار' };
  function renderSearch(q = searchInput.value) {
    const query = String(q || '').trim();
    const tabs = `<div class="agh-search-tabs">${Object.entries(searchLabels).map(([key,label])=>`<button type="button" class="${activeSearchType===key?'active':''}" data-search-type="${key}">${label}</button>`).join('')}</div>`;
    if (!query) {
      searchResults.innerHTML = `${tabs}<div class="agh-search-start"><b>ماذا تريد أن تجد؟</b><p>يمكنك البحث باسم بطولة، فريق، لاعب، حكم، مباراة أو خبر.</p><div class="agh-search-shortcuts"><button data-route="tournaments">🏆 البطولات</button><button data-route="teams">🛡️ الفرق</button><button data-route="players">👤 اللاعبون</button><button data-route="referees">⚖️ الحكام</button><button data-route="matches">⚽ المباريات</button></div></div>`;
      return;
    }
    let results = collectSearch(query);
    if (activeSearchType !== 'all') results = results.filter(r => r.type === activeSearchType);
    const counts = results.reduce((m,r)=>(m[r.type]=(m[r.type]||0)+1,m),{});
    if (!results.length) { searchResults.innerHTML = `${tabs}<div class="agh-search-none"><b>لا توجد نتيجة لـ «${esc(query)}»</b><p>جرّب اسمًا أقصر أو اختر قسمًا من الأعلى.</p></div>`; return; }
    searchResults.innerHTML = `${tabs}<div class="agh-search-summary"><span>${results.length} نتيجة</span><small>${activeSearchType==='all'?'مرتبة حسب الأقرب للبحث':searchLabels[activeSearchType]}</small></div><div class="agh-search-list">${results.slice(0,30).map(r=>`<button type="button" class="agh-search-row" data-route="${esc(r.route)}"><i>${r.image?img(r.image,r.title):'<span>•</span>'}</i><span><b>${esc(r.title)}</b><small>${esc(r.meta||'')}</small></span><em>${esc(searchLabels[r.type]||r.type)}</em></button>`).join('')}</div>`;
  }

  function installSearch() {
    searchInput.placeholder = 'ابحث عن بطولة، فريق، لاعب، حكم، مباراة أو خبر…';
    searchInput.setAttribute('autocomplete','off');
    if (searchInput.dataset.aghDirectorySearch === '1') return;
    searchInput.dataset.aghDirectorySearch = '1';
    searchInput.addEventListener('input', event => {
      event.stopImmediatePropagation();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => renderSearch(searchInput.value), 140);
    }, true);
    document.addEventListener('click', event => {
      const tab = event.target.closest('[data-search-type]');
      if (tab) { activeSearchType = tab.dataset.searchType; renderSearch(); return; }
      if (event.target.closest('[data-action="open-search"]')) setTimeout(() => { activeSearchType='all'; renderSearch(searchInput.value); searchInput.focus(); }, 30);
    }, true);
  }

  function handleFilters(event) {
    const teamFilter = event.target.closest('[data-dir-filter]');
    if (teamFilter) {
      const value = teamFilter.dataset.dirFilter;
      const root = route()[0];
      if (root === 'teams') renderTeamsDirectory(value); else if (root === 'players') renderPlayersDirectory(value);
    }
    const refFilter = event.target.closest('[data-ref-filter]');
    if (refFilter) renderRefereesDirectory(refFilter.dataset.refFilter);
  }

  async function renderCustomRoute() {
    if (rendering) return;
    const [root,id] = route();
    if (!['directory','teams','players','referees','referee','home'].includes(root)) return;
    rendering = true;
    try {
      await load();
      if (root === 'directory') renderDirectory();
      else if (root === 'teams') renderTeamsDirectory();
      else if (root === 'players') renderPlayersDirectory();
      else if (root === 'referees') renderRefereesDirectory();
      else if (root === 'referee') renderRefereeProfile(id);
      else if (root === 'home') homeDirectory();
    } finally { rendering = false; }
  }

  document.addEventListener('click', handleFilters, true);
  window.addEventListener('hashchange', () => setTimeout(renderCustomRoute, 40));
  const observer = new MutationObserver(() => {
    const root = route()[0];
    if (['directory','teams','players','referees','referee'].includes(root) && !main.querySelector('.agh-dir-page')) setTimeout(renderCustomRoute, 70);
    if (root === 'home' && !main.querySelector('.agh-home-directory')) setTimeout(renderCustomRoute, 100);
  });
  observer.observe(main, { childList: true, subtree: false });

  installSectionNav();
  organizeDesktopNav();
  installSearch();
  load().then(() => { renderCustomRoute(); if (!searchLayer.hidden) renderSearch(); });
})();