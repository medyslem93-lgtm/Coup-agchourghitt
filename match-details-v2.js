(() => {
  'use strict';
  const cfg = window.AGCH_CONFIG || {};
  const main = document.getElementById('appMain');
  if (!main || !cfg.supabaseUrl || !cfg.supabaseKey) return;
  const H = { apikey: cfg.supabaseKey, Authorization: `Bearer ${cfg.supabaseKey}` };
  let rendering = false, lastKey = '', channel = null, loadToken = 0;
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const q = async path => { const r = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {headers:H, cache:'no-store'}); if (!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); };
  const safe = async (path, fallback=[]) => { try { return await q(path); } catch (e) { console.warn('optional match data unavailable', path, e); return fallback; } };
  const uuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
  const route = () => location.hash.replace(/^#\/?/,'').split('/').map(decodeURIComponent).filter(Boolean);
  const routeInfo = () => { const p=route(); if (p[0]==='match' && uuid(p[1])) return {id:p[1],tab:p[2]}; if (p[0]==='matches' && uuid(p[1])) return {id:p[1],tab:p[2]}; if (p[0]==='match-details' && uuid(p[1])) return {id:p[1],tab:p[2]}; return null; };
  const fmtDate = v => { if(!v) return ''; try { return new Intl.DateTimeFormat('ar-MR',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date(`${v}T12:00:00Z`)); } catch { return v; } };
  const fmtTime = v => v ? String(v).slice(0,5) : '';
  const teamBy = (a,id) => a.find(x=>x.id===id)||{};
  const playerBy = (a,id) => a.find(x=>x.id===id)||{};
  const img = (u,a='') => u ? `<img src="${esc(u)}" alt="${esc(a)}" loading="lazy" decoding="async" onerror="this.style.display='none'">` : '<span class="agh-team-placeholder">⚽</span>';
  const scoreText = m => (m.score_a==null || m.score_b==null) ? '–' : `${m.score_a} - ${m.score_b}`;
  const statusClass = s => s==='مباشر' ? 'live' : s==='انتهت' ? 'finished' : 'upcoming';
  const matchTs = m => m.match_date ? Date.parse(`${m.match_date}T${String(m.match_time||'00:00').slice(0,5)}:00Z`) : 0;
  const eventIcon = t => ({'هدف':'⚽','ركلة جزاء مسجلة':'⚽','هدف من ركلة جزاء':'⚽','هدف عكسي':'⚽','بطاقة صفراء':'🟨','بطاقة حمراء':'🟥','تبديل':'🔄','بداية المباراة':'▶️','نهاية الشوط':'⏸','نهاية الشوط الأول':'⏸','بداية الشوط الثاني':'▶️','نهاية المباراة':'🏁'}[t]||'•');
  const empty = msg => `<div class="agh-match-empty">${esc(msg)}</div>`;
  function skeleton(){ main.innerHTML='<div class="agh-match-page agh-match-loading" dir="rtl"><div class="agh-match-skel hero"></div><div class="agh-match-skel tabs"></div><div class="agh-match-skel row"></div><div class="agh-match-skel row"></div></div>'; }
  function formFor(teamId,current,all){ if(!teamId) return []; return all.filter(m=>m.id!==current.id && m.status==='انتهت' && (m.team_a_id===teamId||m.team_b_id===teamId) && m.score_a!=null && m.score_b!=null && (!current.match_date||!m.match_date||matchTs(m)<=matchTs(current))).sort((a,b)=>matchTs(b)-matchTs(a)).slice(0,4).map(m=>{ const home=m.team_a_id===teamId, gf=Number(home?m.score_a:m.score_b), ga=Number(home?m.score_b:m.score_a); return gf>ga?'W':gf<ga?'L':'D'; }); }
  function formCard(team,form,label){ return `<div class="agh-form-card"><div class="agh-form-team">${img(team.logo_url,team.name)}<b>${esc(team.name||label)}</b></div>${form.length?`<div class="agh-form-row" aria-label="آخر النتائج">${form.map(x=>`<span class="agh-form-dot ${x.toLowerCase()}" title="${x==='W'?'فوز':x==='D'?'تعادل':'خسارة'}">${x}</span>`).join('')}</div>`:empty('لا توجد إحصائيات مسجلة بعد')}</div>`; }
  function eventsView(events,players,teams){
    if(!events.length) return empty('لا توجد أحداث مسجلة لهذه المباراة بعد');
    const rows=[...events].sort((a,b)=>{ const am=a.minute, bm=b.minute; if(am==null&&bm==null) return new Date(b.created_at||0)-new Date(a.created_at||0); if(am==null) return 1; if(bm==null) return -1; return Number(bm)-Number(am) || new Date(b.created_at||0)-new Date(a.created_at||0); });
    return `<div class="agh-timeline">${rows.map(e=>{ const p=playerBy(players,e.player_id), a=playerBy(players,e.assist_player_id), t=teamBy(teams,e.team_id); const pn=e.player_name||p.name||'', an=e.assist_name||a.name||''; let extra=''; if(e.type==='تبديل') extra=`<div class="agh-event-sub agh-sub-row">${pn?`<span class="agh-sub-in">↩ ${esc(pn)}</span>`:''}${an?`<span class="agh-sub-out">↪ ${esc(an)}</span>`:''}</div>`; else if(['هدف','ركلة جزاء مسجلة','هدف من ركلة جزاء'].includes(e.type)&&an) extra=`<div class="agh-event-sub">👟 تمريرة حاسمة: ${esc(an)}</div>`; if(e.note) extra += `<div class="agh-event-note">${esc(e.note)}</div>`; return `<article class="agh-event agh-event-${esc(e.type||'event').replace(/\s+/g,'-')}"><span class="agh-event-icon">${eventIcon(e.type)}</span><div class="agh-event-top"><strong>${esc(e.type||'حدث')}</strong>${e.minute!=null?`<span class="agh-event-minute">${esc(e.minute)}'</span>`:''}</div>${pn&&e.type!=='تبديل'?`<div class="agh-event-main">${esc(pn)}</div>`:''}${t.name?`<div class="agh-event-team">${esc(t.name)}</div>`:''}${extra}</article>`; }).join('')}</div>`;
  }
  function statsView(stats,home,away){
    if(!stats) return empty('لم تُسجل إحصائيات لهذه المباراة بعد');
    const defs=[['الاستحواذ','possession_a','possession_b','%'],['التسديدات','shots_a','shots_b',''],['التسديدات على المرمى','shots_on_target_a','shots_on_target_b',''],['الركنيات','corners_a','corners_b',''],['الأخطاء','fouls_a','fouls_b',''],['البطاقات الصفراء','yellow_cards_a','yellow_cards_b',''],['البطاقات الحمراء','red_cards_a','red_cards_b','']];
    const rows=defs.filter(([,a,b])=>stats[a]!=null && stats[b]!=null);
    if(!rows.length) return empty('لم تُسجل إحصائيات لهذه المباراة بعد');
    return `<div class="agh-stats-card"><div class="agh-stats-teams"><b>${esc(home.name||'الفريق الأول')}</b><b>${esc(away.name||'الفريق الثاني')}</b></div>${rows.map(([label,a,b,suf])=>{ const va=Number(stats[a]), vb=Number(stats[b]), total=va+vb, wa=total>0?Math.round(va/total*100):50, wb=total>0?100-wa:50; return `<div class="agh-stat-row"><div class="agh-stat-head"><span>${esc(stats[a])}${suf}</span><b>${label}</b><span>${esc(stats[b])}${suf}</span></div><div class="agh-stat-bars"><i style="width:${wa}%"></i><i style="width:${wb}%"></i></div></div>`; }).join('')}</div>`;
  }
  function lineupView(lineups,members,players,teams){
    if(!lineups.length) return empty('لم تُعلن التشكيلة بعد');
    const cards=lineups.map(l=>{ const team=teamBy(teams,l.team_id), rows=members.filter(x=>x.lineup_id===l.id).sort((a,b)=>(a.sort_order??999)-(b.sort_order??999)); const group=role=>rows.filter(x=>x.role===role).map(x=>{ const p=playerBy(players,x.player_id); if(!p.id) return ''; return `<div class="agh-lineup-player"><span class="agh-player-num">${p.number??'—'}</span><div><b>${esc(p.name)}</b>${p.position?`<small>${esc(p.position)}</small>`:''}</div></div>`; }).join(''); return `<section class="agh-lineup-card"><div class="agh-lineup-head">${img(team.logo_url,team.name)}<b>${esc(team.name||'الفريق')}</b>${l.formation?`<small>الخطة ${esc(l.formation)}</small>`:''}</div><div class="agh-lineup-group"><span>الأساسيون</span>${group('أساسي')||empty('لا توجد أسماء أساسيين مسجلة')}</div><div class="agh-lineup-group"><span>البدلاء</span>${group('بديل')||empty('لا توجد أسماء بدلاء مسجلة')}</div></section>`; }).join('');
    return cards?`<div class="agh-lineup-grid">${cards}</div>`:empty('لم تُعلن التشكيلة بعد');
  }
  function newsView(news){ return news.length?`<div class="agh-news-list">${news.map(n=>`<button class="agh-match-news" data-open-news="${esc(n.id)}"><b>${esc(n.title)}</b><small>${esc(n.type||n.category||'خبر')}</small></button>`).join('')}</div>`:empty('لا توجد أخبار مرتبطة بهذه المباراة'); }
  function overview(match,home,away,all){ const hf=formFor(home.id,match,all), af=formFor(away.id,match,all); return `<section class="agh-overview"><h2>آخر النتائج المسجلة</h2><p class="agh-section-note">تظهر فقط المباريات المنتهية والمسجلة فعليًا في قاعدة البيانات.</p><div class="agh-form-grid">${formCard(home,hf,'الفريق الأول')}${formCard(away,af,'الفريق الثاني')}</div></section>`; }
  async function loadMatch(id){
    const m=await q(`matches?id=eq.${encodeURIComponent(id)}&select=*`); if(!m[0]) return {match:null};
    const match=m[0]; const ids=[match.team_a_id,match.team_b_id].filter(Boolean); const teamFilter=ids.length?`&id=in.(${ids.join(',')})`:'';
    const [teams,events,stats,lineups,all,news]=await Promise.all([
      safe(`teams?select=*${teamFilter}`), safe(`match_events?match_id=eq.${encodeURIComponent(id)}&select=*`), safe(`match_stats?match_id=eq.${encodeURIComponent(id)}&select=*`), safe(`match_lineups?match_id=eq.${encodeURIComponent(id)}&select=*`), safe('matches?select=id,team_a_id,team_b_id,match_date,match_time,status,score_a,score_b'), safe(`news?match_id=eq.${encodeURIComponent(id)}&status=eq.published&is_story=eq.false&select=*`)
    ]);
    const playerIds=new Set(); events.forEach(e=>{if(e.player_id)playerIds.add(e.player_id);if(e.assist_player_id)playerIds.add(e.assist_player_id)});
    const lineupIds=lineups.map(l=>l.id); const members=lineupIds.length?await safe(`match_lineup_players?lineup_id=in.(${lineupIds.join(',')})&select=*`):[]; members.forEach(x=>{if(x.player_id)playerIds.add(x.player_id)});
    const players=playerIds.size?await safe(`players?id=in.(${[...playerIds].join(',')})&select=*`):[];
    return {match,teams,players,events,stats:stats[0]||null,lineups,members,all,news};
  }
  function renderPage(d,tab){
    const m=d.match; if(!m){ main.innerHTML=`<div class="agh-match-page">${empty('المباراة غير موجودة')}</div>`; return; }
    const home=teamBy(d.teams,m.team_a_id), away=teamBy(d.teams,m.team_b_id); const tabs=[['summary','نظرة عامة'],['timeline','الأحداث'],['stats','الإحصائيات'],['lineups','التشكيلة'],['news','الأخبار']];
    const body=tab==='timeline'?eventsView(d.events,d.players,d.teams):tab==='stats'?statsView(d.stats,home,away):tab==='lineups'?lineupView(d.lineups,d.members,d.players,d.teams):tab==='news'?newsView(d.news):overview(m,home,away,d.all);
    const date=fmtDate(m.match_date), time=fmtTime(m.match_time), hn=home.name||m.team_a_placeholder||'الفريق الأول', an=away.name||m.team_b_placeholder||'الفريق الثاني';
    main.innerHTML=`<div class="agh-match-page" dir="rtl"><section class="agh-match-hero"><button class="agh-match-back" data-match-back aria-label="رجوع">‹</button><div class="agh-match-scoreboard"><div class="agh-match-team">${img(home.logo_url,hn)}<b>${esc(hn)}</b></div><div class="agh-match-score"><strong>${esc(scoreText(m))}</strong><span class="${statusClass(m.status)}">${esc(m.status||'غير محدد')}${m.status==='مباشر'&&m.minute!=null?` · ${esc(m.minute)}'`:''}</span></div><div class="agh-match-team">${img(away.logo_url,an)}<b>${esc(an)}</b></div></div><div class="agh-match-meta">${date?`<span>${esc(date)}</span>`:''}${time?`<span>${esc(time)}</span>`:''}${m.venue?`<span>${esc(m.venue)}</span>`:''}${(m.stage||m.round_name)?`<span>${esc(m.stage||m.round_name)}</span>`:''}</div><div class="agh-match-tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${tab===k}" class="${tab===k?'active':''}" data-match-tab="${k}">${l}</button>`).join('')}</div></section><section class="agh-match-section">${body}</section></div>`;
    const back=main.querySelector('[data-match-back]'); if(back) back.onclick=()=>history.length>1?history.back():location.hash='#matches';
    main.querySelectorAll('[data-match-tab]').forEach(b=>b.onclick=()=>location.hash=`#match/${m.id}/${b.dataset.matchTab}`);
    main.querySelectorAll('[data-open-news]').forEach(b=>b.onclick=()=>location.hash=`#news/${b.dataset.openNews}`);
  }
  async function render(force=false){
    const ri=routeInfo(); if(!ri) return; const tab=['summary','timeline','stats','lineups','news'].includes(ri.tab)?ri.tab:'summary'; const key=`${ri.id}:${tab}`;
    if(rendering && !force) return; if(!force && lastKey===key && main.querySelector('.agh-match-page:not(.agh-match-loading)')) return;
    const token=++loadToken; rendering=true; lastKey=key; skeleton();
    try { const data=await loadMatch(ri.id); if(token===loadToken) renderPage(data,tab); }
    catch(e){ console.error('match details v3',e); if(token===loadToken) main.innerHTML=`<div class="agh-match-page" dir="rtl">${empty('تعذر تحميل تفاصيل المباراة. تحقق من الاتصال وحاول تحديث الصفحة.')}</div>`; }
    finally { if(token===loadToken){ rendering=false; if(main.querySelector('.agh-match-loading')) main.innerHTML=`<div class="agh-match-page" dir="rtl">${empty('تعذر إكمال تحميل تفاصيل المباراة.')}</div>`; } }
  }
  function openMatchFromClick(e){ const el=e.target.closest('[data-match-id],[data-open-match],[data-match],a[href*="#match/"]'); if(!el) return; const id=el.dataset.matchId||el.dataset.openMatch||el.dataset.match; if(uuid(id)){ e.preventDefault(); location.hash=`#match/${id}/summary`; } }
  document.addEventListener('click',openMatchFromClick,true);
  function realtime(){ if(!window.supabase?.createClient||channel) return; const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false}}); const refresh=()=>{if(routeInfo()){lastKey='';setTimeout(()=>render(true),120)}}; channel=sb.channel('match-details-v3-live').on('postgres_changes',{event:'*',schema:'public',table:'matches'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'match_events'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'match_stats'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'match_lineups'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'match_lineup_players'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'news'},refresh).subscribe(); }
  window.addEventListener('hashchange',()=>setTimeout(()=>render(),0)); window.addEventListener('load',()=>{render();realtime()});
  let mt; new MutationObserver(()=>{ if(routeInfo()&&!main.querySelector('.agh-match-page')){clearTimeout(mt);mt=setTimeout(()=>{lastKey='';render(true)},50)} }).observe(main,{childList:true,subtree:false});
  setTimeout(()=>{render();realtime()},500);
})();