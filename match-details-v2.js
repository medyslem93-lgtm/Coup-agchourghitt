(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG,sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}}),$=id=>document.getElementById(id);
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const img=(u,a='')=>`<img src="${esc(!u?'assets/tournament.jpg':/^(https?:|data:|blob:)/i.test(u)?u:String(u).replace(/^\.\.\//,'').replace(/^\.\//,''))}" alt="${esc(a)}" onerror="this.onerror=null;this.src='assets/tournament.jpg'">`;
  const fmt=d=>{if(!d)return 'التاريخ غير محدد';try{return new Intl.DateTimeFormat('ar-MR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(d+'T12:00:00Z'))}catch{return d}};
  const show=h=>{$('sheetPanel').innerHTML=h;$('sheet').classList.add('show')},close=()=>{$('sheet').classList.remove('show')};
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
      const score=(m.status==='انتهت'||m.status==='مباشر')?`${m.score_a??0} - ${m.score_b??0}`:'VS';
      show(`<div class="sheet-head"><button data-v2-close>إغلاق</button></div><div class="match-detail"><small>${esc(m.category)}${m.group_name?' · المجموعة '+esc(m.group_name):''}${m.stage?' · '+esc(m.stage):''}${m.round_name?' · '+esc(m.round_name):''}</small><div class="match-row big"><div class="team">${img(m.team_a.logo_url,m.team_a.name)}<b>${esc(m.team_a.name)}</b></div><div class="score" dir="ltr">${score}</div><div class="team">${img(m.team_b.logo_url,m.team_b.name)}<b>${esc(m.team_b.name)}</b></div></div><p>${esc(fmt(m.match_date))} · ${esc((m.match_time||'').slice(0,5)||'الوقت غير محدد')} · ${esc(m.venue||'الملعب غير محدد')}</p><span class="status ${m.status==='مباشر'?'live':''}">${esc(m.status)}</span></div><div class="detail-tabs"><button class="active" data-v2-pane="overview">نظرة عامة</button><button data-v2-pane="events">الأحداث</button><button data-v2-pane="lineups">التشكيلات</button><button data-v2-pane="stats">الإحصائيات</button></div><div id="v2-overview" class="pane active"><div class="grid2"><div class="card info-card"><b>الحكم الرئيسي</b><span>${esc(localRef('main')?.name||'غير محدد')}</span></div>${assistants.length?assistants.map((r,i)=>`<div class="card info-card"><b>حكم الراية ${i+1}</b><span>${esc(r.name)}</span></div>`).join(''):'<div class="card info-card"><b>حكم الراية</b><span>غير محدد</span></div>'}</div>${motm(events,pn,teamName)}</div><div id="v2-events" class="pane">${events.length?`<div class="event-list">${events.map(e=>eventRow(e,pn,teamName,pmap)).join('')}</div>`:'<div class="empty card"><b>لا توجد أحداث مسجلة</b></div>'}</div><div id="v2-lineups" class="pane">${lineupBlock(m.team_a,lineups,members,pmap)}${lineupBlock(m.team_b,lineups,members,pmap)}</div><div id="v2-stats" class="pane">${statsBlock(stats,m,events)}</div>`);
    }catch(e){console.error(e);show(`<div class="sheet-head"><button data-v2-close>إغلاق</button></div><div class="empty card"><b>تعذر تحميل تفاصيل المباراة</b><span>${esc(e.message||'حاول مرة أخرى')}</span></div>`)}
  }
  function motm(events,pn,tn){const e=events.find(x=>x.type==='رجل المباراة');return e?`<div class="card motm"><b>رجل المباراة</b><span>${esc(pn(e))}${tn(e.team_id)?' · '+esc(tn(e.team_id)):''}</span></div>`:''}
  function eventRow(e,pn,tn,pmap){const icons={'هدف':'⚽','ركلة جزاء مسجلة':'⚽','هدف عكسي':'⚽','ركلة جزاء ضائعة':'✖','تمريرة حاسمة':'🎯','بطاقة صفراء':'🟨','بطاقة حمراء':'🟥','تبديل':'↔','رجل المباراة':'★','بداية المباراة':'▶','نهاية الشوط':'◼','نهاية المباراة':'■'},assist=e.assist_name||pmap.get(e.assist_player_id)?.name||'';return `<div class="event-row"><span>${icons[e.type]||'•'}</span><div><b>${esc(e.type)}${e.minute!=null?' · '+e.minute+"'":''}</b><small>${esc(pn(e)||e.note||'')}${tn(e.team_id)?' · '+esc(tn(e.team_id)):''}${assist?' · صناعة: '+esc(assist):''}</small></div></div>`}
  function lineupBlock(t,lineups,members,pmap){const l=lineups.find(x=>x.team_id===t.id);if(!l)return `<div class="card empty" style="margin-top:10px"><b>${esc(t.name)}</b><span>لم يتم تسجيل التشكيلة بعد.</span></div>`;const lm=members.filter(x=>x.lineup_id===l.id),role=r=>lm.filter(x=>x.role===r).map(x=>pmap.get(x.player_id)).filter(Boolean),list=(arr,label)=>`<div class="lineup-group"><h4>${label}</h4>${arr.length?arr.map(p=>`<div class="rank-row"><span>${p.number??'–'}</span><div><b>${esc(p.name)}</b><small>${esc(p.position||'')}</small></div>${l.captain_player_id===p.id?'<strong>القائد</strong>':l.goalkeeper_player_id===p.id?'<strong>حارس</strong>':''}</div>`).join(''):'<p class="muted">لا يوجد</p>'}</div>`;return `<div class="card list-card" style="margin-top:10px"><h3>${esc(t.name)}${l.formation?' · '+esc(l.formation):''}</h3>${list(role('أساسي'),'الأساسيون')}${list(role('بديل'),'الاحتياط')}</div>`}
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
  document.addEventListener('click',e=>{const m=e.target.closest('[data-open-match]');if(m){e.preventDefault();e.stopImmediatePropagation();open(m.dataset.openMatch);return}if(e.target.closest('[data-v2-close]')){e.preventDefault();e.stopImmediatePropagation();close();return}const p=e.target.closest('[data-v2-pane]');if(p){e.preventDefault();e.stopImmediatePropagation();document.querySelectorAll('[data-v2-pane]').forEach(x=>x.classList.toggle('active',x===p));['overview','events','lineups','stats'].forEach(x=>document.getElementById('v2-'+x)?.classList.toggle('active',x===p.dataset.v2Pane))}},true);
})();
