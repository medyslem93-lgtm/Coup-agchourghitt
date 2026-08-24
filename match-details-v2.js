(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG,sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}}),$=id=>document.getElementById(id);
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
  const img=(u,a='')=>`<img src="${esc(!u?'assets/tournament.jpg':/^(https?:|data:|blob:)/i.test(u)?u:String(u).replace(/^\.\.\//,'').replace(/^\.\//,''))}" alt="${esc(a)}" onerror="this.onerror=null;this.src='assets/tournament.jpg'">`;
  const fmt=d=>{if(!d)return 'التاريخ غير محدد';try{return new Intl.DateTimeFormat('ar-MR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(d+'T12:00:00Z'))}catch{return d}};
  const show=h=>{$('sheetPanel').innerHTML=h;$('sheet').classList.add('show')},close=()=>{$('sheet').classList.remove('show')};
  let ctx=null;

  async function open(id){
    show('<div class="empty card"><b>جارٍ تحميل مركز المباراة...</b></div>');
    try{
      const mr=await sb.from('matches').select('*,team_a:teams!matches_team_a_id_fkey(id,name,logo_url),team_b:teams!matches_team_b_id_fkey(id,name,logo_url)').eq('id',id).single();if(mr.error)throw mr.error;const m=mr.data;
      const [er,rr,sr,lr,pr]=await Promise.all([
        sb.from('match_events').select('*').eq('match_id',id).order('minute',{ascending:true,nullsFirst:false}).order('created_at'),
        sb.from('referee_assignments').select('*').or(`match_id.eq.${id},and(match_id.is.null,category.eq.${m.category})`),
        sb.from('match_stats').select('*').eq('match_id',id).maybeSingle(),
        sb.from('match_lineups').select('*').eq('match_id',id),
        sb.from('players').select('*').in('team_id',[m.team_a_id,m.team_b_id]).order('name')
      ]);const bad=[er,rr,sr,lr,pr].find(x=>x.error);if(bad)throw bad.error;
      const events=er.data||[],refs=rr.data||[],stats=sr.data||null,lineups=lr.data||[],players=pr.data||[],lids=lineups.map(x=>x.id);let members=[];
      if(lids.length){const q=await sb.from('match_lineup_players').select('*').in('lineup_id',lids).order('sort_order');if(q.error)throw q.error;members=q.data||[]}
      const pmap=new Map(players.map(p=>[p.id,p])),pn=e=>e.player_name||pmap.get(e.player_id)?.name||'',teamName=tid=>tid===m.team_a_id?m.team_a.name:tid===m.team_b_id?m.team_b.name:'';
      const localRef=role=>refs.find(r=>r.match_id===id&&r.role===role)||refs.find(r=>!r.match_id&&r.category===m.category&&r.role===role);
      const localRefs=role=>{const own=refs.filter(r=>r.match_id===id&&r.role===role);return own.length?own:refs.filter(r=>!r.match_id&&r.category===m.category&&r.role===role)};
      const assistants=localRefs('assistant');
      const score=(m.status==='انتهت'||m.status==='مباشر')?`${m.score_b??0} - ${m.score_a??0}`:'VS';
      ctx={m,events,refs,stats,lineups,players,members,pmap};
      show(`<div class="sheet-head"><button data-v2-close>إغلاق</button></div><div class="match-detail"><small>${esc(m.category)}${m.group_name?' · المجموعة '+esc(m.group_name):''}${m.stage?' · '+esc(m.stage):''}${m.round_name?' · '+esc(m.round_name):''}</small><div class="match-row big"><div class="team">${img(m.team_a.logo_url,m.team_a.name)}<b>${esc(m.team_a.name)}</b></div><div class="score" dir="ltr">${score}</div><div class="team">${img(m.team_b.logo_url,m.team_b.name)}<b>${esc(m.team_b.name)}</b></div></div><p>${esc(fmt(m.match_date))} · ${esc((m.match_time||'').slice(0,5)||'الوقت غير محدد')} · ${esc(m.venue||'الملعب غير محدد')}</p><span class="status ${m.status==='مباشر'?'live':''}">${esc(m.status)}</span></div><div class="detail-tabs"><button class="active" data-v2-pane="overview">نظرة عامة</button><button data-v2-pane="events">الأحداث</button><button data-v2-pane="lineups">التشكيلات</button><button data-v2-pane="stats">الإحصائيات</button></div><div id="v2-overview" class="pane active"><div class="grid2"><div class="card info-card"><b>الحكم الرئيسي</b><span>${esc(localRef('main')?.name||'غير محدد')}</span></div>${assistants.length?assistants.map((r,i)=>`<div class="card info-card"><b>حكم الراية ${i+1}</b><span>${esc(r.name)}</span></div>`).join(''):'<div class="card info-card"><b>حكم الراية</b><span>غير محدد</span></div>'}</div>${motm(events,pn,teamName)}</div><div id="v2-events" class="pane">${events.length?`<div class="event-list">${events.map(e=>eventRow(e,pn,teamName,pmap)).join('')}</div>`:'<div class="empty card"><b>لا توجد أحداث مسجلة</b></div>'}</div><div id="v2-lineups" class="pane">${renderLineups(m,lineups,members,pmap,players,events)}</div><div id="v2-stats" class="pane">${statsBlock(stats,m,events)}</div>`);
    }catch(e){console.error(e);show(`<div class="sheet-head"><button data-v2-close>إغلاق</button></div><div class="empty card"><b>تعذر تحميل تفاصيل المباراة</b><span>${esc(e.message||'حاول مرة أخرى')}</span></div>`)}
  }

  function motm(events,pn,tn){const e=events.find(x=>x.type==='رجل المباراة');return e?`<div class="card motm"><b>رجل المباراة</b><span>${esc(pn(e))}${tn(e.team_id)?' · '+esc(tn(e.team_id)):''}</span></div>`:''}
  function eventRow(e,pn,tn,pmap){const icons={'هدف':'⚽','ركلة جزاء مسجلة':'⚽','هدف عكسي':'⚽','ركلة جزاء ضائعة':'✖','تمريرة حاسمة':'🎯','بطاقة صفراء':'🟨','بطاقة حمراء':'🟥','تبديل':'↔','رجل المباراة':'★','بداية المباراة':'▶','نهاية الشوط':'◼','نهاية المباراة':'■'},assist=e.assist_name||pmap.get(e.assist_player_id)?.name||'';return `<div class="event-row"><span>${icons[e.type]||'•'}</span><div><b>${esc(e.type)}${e.minute!=null?' · '+e.minute+"'":''}</b><small>${esc(pn(e)||e.note||'')}${tn(e.team_id)?' · '+esc(tn(e.team_id)):''}${assist?' · صناعة: '+esc(assist):''}</small></div></div>`}

  function formationToRows(formation,fieldCount){
    let nums=String(formation||'').match(/\d+/g)?.map(Number).filter(n=>n>0)||[];
    const sum=nums.reduce((a,b)=>a+b,0);
    if(nums[0]===1&&sum===fieldCount+1)nums=nums.slice(1);
    if(!nums.length||nums.reduce((a,b)=>a+b,0)!==fieldCount){
      if(fieldCount===10)return [4,3,3];
      return [fieldCount];
    }
    return nums;
  }
  function getStartingPlayers(teamId,lineup,members,pmap){
    if(!lineup)return[];
    return members.filter(x=>x.lineup_id===lineup.id&&x.role==='أساسي').sort((a,b)=>(a.sort_order??999)-(b.sort_order??999)).map(x=>pmap.get(x.player_id)).filter(Boolean);
  }
  function getBenchPlayers(teamId,starters,players){
    const ids=new Set(starters.map(p=>p.id));
    return players.filter(p=>p.team_id===teamId&&!ids.has(p.id)).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ar'));
  }
  function shortName(name=''){const s=String(name).trim().split(/\s+/);return s.length<=2?name:s.slice(0,2).join(' ')}
  function teamTheme(name=''){if(name.includes('الهلال'))return'hilal';if(name.includes('الشهيد'))return'martyr';return'default'}
  function getPlayerMatchEvents(player,events){
    const n=String(player.name||'').trim();
    return events.filter(e=>e.player_id===player.id||(!e.player_id&&String(e.player_name||'').trim()===n));
  }
  function eventBadges(player,events){
    const ev=getPlayerMatchEvents(player,events),goals=ev.filter(e=>['هدف','ركلة جزاء مسجلة'].includes(e.type)).length,assists=ev.filter(e=>e.type==='تمريرة حاسمة').length,y=ev.some(e=>e.type==='بطاقة صفراء'),r=ev.some(e=>e.type==='بطاقة حمراء');
    return `${goals?`<i>⚽${goals>1?goals:''}</i>`:''}${assists?`<i>🎯${assists>1?assists:''}</i>`:''}${y?'<i>🟨</i>':''}${r?'<i>🟥</i>':''}`;
  }
  function renderPitchPlayer(p,lineup,events,isKeeper=false){
    const num=p.number!=null&&p.number!==''?esc(p.number):'';
    return `<button class="pitch-player ${isKeeper?'keeper':''}" data-v2-player="${esc(p.id)}" type="button"><span class="player-badges">${eventBadges(p,events)}</span><span class="pitch-shirt">${num||' '}</span><b title="${esc(p.name)}">${esc(shortName(p.name))}</b>${lineup?.captain_player_id===p.id?'<em>C</em>':''}${isKeeper?'<small>GK</small>':''}</button>`;
  }
  function renderFormationPitch(team,lineup,starters,events){
    if(!lineup||!starters.length)return `<div class="empty card"><b>${esc(team.name)}</b><span>لم يتم تسجيل التشكيلة بعد.</span></div>`;
    const gk=starters.find(p=>p.id===lineup.goalkeeper_player_id)||starters[0],field=starters.filter(p=>p.id!==gk.id),rows=formationToRows(lineup.formation,field.length);let cursor=0;
    const rowHtml=rows.map((count,i)=>{const arr=field.slice(cursor,cursor+count);cursor+=count;const bottom=rows.length===1?52:24+(i*(60/Math.max(rows.length-1,1)));return `<div class="pitch-line" style="bottom:${bottom}%">${arr.map(p=>renderPitchPlayer(p,lineup,events)).join('')}</div>`}).join('');
    return `<div class="formation-pitch theme-${teamTheme(team.name)}"><div class="pitch-markings"><i class="half"></i><i class="circle"></i><i class="box top"></i><i class="box bottom"></i><i class="six top"></i><i class="six bottom"></i><i class="spot top"></i><i class="spot bottom"></i></div>${rowHtml}<div class="pitch-gk">${renderPitchPlayer(gk,lineup,events,true)}</div></div>`;
  }
  function renderBench(team,bench){
    return `<section class="bench-section"><div class="bench-title"><b>الاحتياط</b><span>${bench.length} لاعب</span></div>${bench.length?`<div class="bench-grid">${bench.map(p=>`<button class="bench-player" data-v2-player="${esc(p.id)}" type="button"><span>${p.number??'–'}</span><b>${esc(p.name)}</b></button>`).join('')}</div>`:'<div class="empty"><span>لا يوجد لاعبو احتياط مسجلون.</span></div>'}</section>`;
  }
  function renderTeamPanel(team,lineup,members,pmap,players,events,active){
    const starters=getStartingPlayers(team.id,lineup,members,pmap),bench=getBenchPlayers(team.id,starters,players);
    return `<div class="lineup-team-panel ${active?'active':''}" data-lineup-panel="${esc(team.id)}"><div class="lineup-head"><div>${img(team.logo_url,team.name)}<span><b>${esc(team.name)}</b><small>التشكيلة الأساسية · ${esc(lineup?.formation||'الخطة غير محددة')}</small></span></div></div>${renderFormationPitch(team,lineup,starters,events)}${renderBench(team,bench)}</div>`;
  }
  function renderTeamSelector(m){return `<div class="lineup-selector"><button class="active" data-lineup-team="${esc(m.team_a.id)}">${img(m.team_a.logo_url,m.team_a.name)}<span>${esc(m.team_a.name)}</span></button><button data-lineup-team="${esc(m.team_b.id)}">${img(m.team_b.logo_url,m.team_b.name)}<span>${esc(m.team_b.name)}</span></button></div>`}
  function renderLineups(m,lineups,members,pmap,players,events){
    const la=lineups.find(x=>x.team_id===m.team_a.id),lb=lineups.find(x=>x.team_id===m.team_b.id);
    return `<div class="formation-centre">${renderTeamSelector(m)}${renderTeamPanel(m.team_a,la,members,pmap,players,events,true)}${renderTeamPanel(m.team_b,lb,members,pmap,players,events,false)}</div><div id="v2-player-card" class="player-card-overlay" hidden></div>`;
  }
  function showPlayerCard(id){
    if(!ctx)return;const p=ctx.pmap.get(id);if(!p)return;const team=p.team_id===ctx.m.team_a.id?ctx.m.team_a:ctx.m.team_b,lineup=ctx.lineups.find(x=>x.team_id===p.team_id),ev=getPlayerMatchEvents(p,ctx.events),goals=ev.filter(e=>['هدف','ركلة جزاء مسجلة'].includes(e.type)).length,assists=ev.filter(e=>e.type==='تمريرة حاسمة').length,y=ev.filter(e=>e.type==='بطاقة صفراء').length,r=ev.filter(e=>e.type==='بطاقة حمراء').length,box=$('v2-player-card');if(!box)return;
    box.hidden=false;box.innerHTML=`<div class="player-card"><button data-player-card-close>×</button><div class="player-card-head">${p.photo_url?img(p.photo_url,p.name):'<div class="player-avatar">⚽</div>'}<div><b>${esc(p.name)}</b><span>${esc(team.name)}</span></div></div><div class="player-meta"><span><b>${p.number??'–'}</b>الرقم</span><span><b>${esc(p.position||'–')}</b>المركز</span><span><b>${lineup?.captain_player_id===p.id?'نعم':'لا'}</b>القائد</span><span><b>${lineup?.goalkeeper_player_id===p.id?'نعم':'لا'}</b>حارس</span></div><div class="player-events"><span>⚽ ${goals}</span><span>🎯 ${assists}</span><span>🟨 ${y}</span><span>🟥 ${r}</span></div></div>`;
  }

  function statsBlock(s,m,events){
    const count=(type,tid)=>events.filter(e=>e.type===type&&e.team_id===tid).length;
    const assistsA=count('تمريرة حاسمة',m.team_a_id),assistsB=count('تمريرة حاسمة',m.team_b_id);
    const yellowA=s?.yellow_cards_a??count('بطاقة صفراء',m.team_a_id),yellowB=s?.yellow_cards_b??count('بطاقة صفراء',m.team_b_id);
    const redA=s?.red_cards_a??count('بطاقة حمراء',m.team_a_id),redB=s?.red_cards_b??count('بطاقة حمراء',m.team_b_id);
    const official=[['الأهداف',m.score_a??0,m.score_b??0,''],['التمريرات الحاسمة',assistsA,assistsB,''],['البطاقات الصفراء',yellowA,yellowB,''],['البطاقات الحمراء',redA,redB,'']];
    const recorded=[['الاستحواذ','possession','%'],['التسديدات','shots',''],['على المرمى','shots_on_target',''],['الركنيات','corners',''],['الأخطاء','fouls','']].filter(([,k])=>s&&(s[k+'_a']!=null||s[k+'_b']!=null)).map(([label,k,u])=>[label,s[k+'_a'],s[k+'_b'],u]);
    const rows=[...official,...recorded];
    return `<div class="card list-card"><div class="stats-header"><b>${esc(m.team_a.name)}</b><span>الإحصائيات</span><b>${esc(m.team_b.name)}</b></div>${rows.map(([label,a,b,u])=>`<div class="stats-compare"><strong>${a??'–'}${a!=null?u:''}</strong><span>${esc(label)}</span><strong>${b??'–'}${b!=null?u:''}</strong></div>`).join('')}</div>`;
  }

  document.addEventListener('click',e=>{
    const m=e.target.closest('[data-open-match]');if(m){e.preventDefault();e.stopImmediatePropagation();open(m.dataset.openMatch);return}
    if(e.target.closest('[data-v2-close]')){e.preventDefault();e.stopImmediatePropagation();close();return}
    const p=e.target.closest('[data-v2-pane]');if(p){e.preventDefault();e.stopImmediatePropagation();document.querySelectorAll('[data-v2-pane]').forEach(x=>x.classList.toggle('active',x===p));['overview','events','lineups','stats'].forEach(x=>document.getElementById('v2-'+x)?.classList.toggle('active',x===p.dataset.v2Pane));return}
    const ts=e.target.closest('[data-lineup-team]');if(ts){e.preventDefault();document.querySelectorAll('[data-lineup-team]').forEach(x=>x.classList.toggle('active',x===ts));document.querySelectorAll('[data-lineup-panel]').forEach(x=>x.classList.toggle('active',x.dataset.lineupPanel===ts.dataset.lineupTeam));return}
    const pl=e.target.closest('[data-v2-player]');if(pl){e.preventDefault();showPlayerCard(pl.dataset.v2Player);return}
    if(e.target.closest('[data-player-card-close]')){const box=$('v2-player-card');if(box){box.hidden=true;box.innerHTML=''}return}
  },true);
})();
