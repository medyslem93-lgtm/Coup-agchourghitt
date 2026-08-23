(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
  const $=id=>document.getElementById(id);
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const CATS=['الكبار','الوسط','الصغار'];
  const S={teams:[],players:[],matches:[],events:[],news:[],refs:[],awards:[],settings:null,loading:true,error:null,matchCat:'الكبار',teamCat:'الكل',tourCat:'الكبار'};
  const teamById=()=>new Map(S.teams.map(t=>[t.id,t]));
  const playerById=()=>new Map(S.players.map(p=>[p.id,p]));
  const team=id=>teamById().get(id);
  const player=id=>playerById().get(id);
  const normImg=(u,f='assets/tournament.jpg')=>!u?f:/^(https?:|data:|blob:)/i.test(u)?u:String(u).replace(/^\.\//,'').replace(/^\.\.\//,'');
  const imgTag=(u,alt='',cls='')=>`<img class="${cls}" src="${esc(normImg(u))}" alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.src='assets/tournament.jpg'">`;
  const tlogo=t=>normImg(t?.logo_url||'assets/tournament.jpg');
  const statusText=s=>s||'قادمة';
  const scoreVal=v=>Number.isFinite(Number(v))?Number(v):0;
  const isFinished=m=>m.status==='انتهت';
  const isLive=m=>m.status==='مباشر';
  const fmtDate=d=>{if(!d)return 'التاريخ غير محدد';try{return new Intl.DateTimeFormat('ar-MR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${d}T12:00:00Z`))}catch{return d}};
  const matchDate=m=>m.match_date?new Date(`${m.match_date}T${(m.match_time||'23:59').slice(0,5)}:00`):new Date(8640000000000000);
  const debounce=(fn,ms=350)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};
  const empty=(title,msg='لم تتم إضافة البيانات بعد')=>`<div class="empty card"><b>${esc(title)}</b><span>${esc(msg)}</span></div>`;
  const loading=()=>`<div class="skeleton-list"><i></i><i></i><i></i></div>`;

  async function loadAll(silent=false){
    if(!silent){S.loading=true;S.error=null;renderAll();}
    try{
      const [tr,pr,mr,er,nr,rr,ar,sr]=await Promise.all([
        sb.from('teams').select('*').order('category').order('name'),
        sb.from('players').select('*').order('name'),
        sb.from('matches').select('*,team_a:teams!matches_team_a_id_fkey(id,name,logo_url,category,group_name),team_b:teams!matches_team_b_id_fkey(id,name,logo_url,category,group_name)').order('match_date',{ascending:true,nullsFirst:false}),
        sb.from('match_events').select('*').order('minute',{ascending:true,nullsFirst:false}).order('created_at'),
        sb.from('news').select('*').order('featured',{ascending:false}).order('sort_order').order('publish_date',{ascending:false}),
        sb.from('referee_assignments').select('*').order('category'),
        sb.from('awards').select('*,player:players(id,name,team_id,photo_url)').order('award_date',{ascending:false,nullsFirst:false}),
        sb.from('site_settings').select('*').eq('id','main').maybeSingle()
      ]);
      const bad=[tr,pr,mr,er,nr,rr,ar,sr].find(x=>x.error); if(bad) throw bad.error;
      S.teams=tr.data||[];S.players=pr.data||[];S.matches=mr.data||[];S.events=er.data||[];S.news=nr.data||[];S.refs=rr.data||[];S.awards=ar.data||[];S.settings=sr.data||{};S.loading=false;S.error=null;
      applySettings();renderAll();
    }catch(e){console.error(e);S.loading=false;S.error=e;renderAll();}
  }

  function applySettings(){
    const x=S.settings||{};
    document.title=x.tournament_name||'كأس أغشوركيت 2026';
    $('brandName').textContent=x.tournament_name||'كأس أغشوركيت 2026';
    $('brandSeason').textContent=x.season?`الموسم الرياضي ${x.season}`:'الموسم الرياضي';
    const logo=normImg(x.logo_url||'assets/tournament.jpg');
    ['brandLogo','heroLogo'].forEach(id=>{const el=$(id);if(el){el.src=logo;el.onerror=()=>{el.onerror=null;el.src='assets/tournament.jpg'}}});
    $('heroTitle').innerHTML=esc(x.hero_title||'كل البطولة. كل لحظة.').replace(/\. /,'.<br>');
    $('heroSubtitle').textContent=x.hero_subtitle||'النتائج، المباريات، الفرق والإحصائيات في تجربة رياضية واحدة.';
    $('tournamentName').textContent=x.tournament_name||'كأس أغشوركيت 2026';
    $('tournamentSeason').textContent=x.season||'2026';
    if($('announcement')){const has=!!x.announcement;$('announcement').hidden=!has;$('announcement').textContent=x.announcement||'';}
  }

  function getEvents(mid){return S.events.filter(e=>e.match_id===mid)}
  function teamNameById(id){return team(id)?.name||''}
  function playerName(e){return e.player_name||player(e.player_id)?.name||''}
  function assistName(e){return e.assist_name||player(e.assist_player_id)?.name||''}
  function eventTeamName(e){return teamNameById(e.team_id)||''}
  function allGoals(){return S.events.filter(e=>['هدف','ركلة جزاء مسجلة'].includes(e.type)&&playerName(e))}
  function allAssists(){
    const a=[];
    S.events.forEach(e=>{
      if(e.type==='تمريرة حاسمة'&&playerName(e))a.push({name:playerName(e),team:eventTeamName(e),team_id:e.team_id,player_id:e.player_id});
      const n=assistName(e);if(n&&['هدف','ركلة جزاء مسجلة'].includes(e.type))a.push({name:n,team:teamNameById(player(e.assist_player_id)?.team_id)||eventTeamName(e),team_id:player(e.assist_player_id)?.team_id||e.team_id,player_id:e.assist_player_id});
    });
    return a;
  }
  function countRows(rows,keyFn){const m=new Map();rows.forEach(r=>{const k=keyFn(r);if(!k)return;const old=m.get(k)||{...r,value:0};old.value++;m.set(k,old)});return [...m.values()].sort((a,b)=>b.value-a.value||String(a.name||'').localeCompare(String(b.name||''),'ar'))}
  function scorerRows(cat){return countRows(allGoals().filter(e=>matchById(e.match_id)?.category===cat),e=>`${e.player_id||playerName(e)}|${e.team_id||''}`).map(r=>({name:playerName(r),team:eventTeamName(r),team_id:r.team_id,value:r.value}))}
  function assistRows(cat){return countRows(allAssists().filter(e=>{const mid=S.events.find(x=>x.player_id===e.player_id&&x.team_id===e.team_id)?.match_id;return !mid||matchById(mid)?.category===cat}),e=>`${e.player_id||e.name}|${e.team_id||''}`)}
  function motmRows(cat){const ev=S.events.filter(e=>e.type==='رجل المباراة'&&playerName(e)&&matchById(e.match_id)?.category===cat);return countRows(ev,e=>`${e.player_id||playerName(e)}|${e.team_id||''}`).map(r=>({name:playerName(r),team:eventTeamName(r),team_id:r.team_id,value:r.value}))}
  function matchById(id){return S.matches.find(m=>m.id===id)}

  function standings(cat){
    const rows=new Map();
    S.teams.filter(t=>t.category===cat).forEach(t=>rows.set(t.id,{team:t,p:0,w:0,d:0,l:0,gf:0,ga:0,gd:0,pts:0}));
    S.matches.filter(m=>m.category===cat&&isFinished(m)).forEach(m=>{
      const a=rows.get(m.team_a_id),b=rows.get(m.team_b_id);if(!a||!b)return;
      const sa=scoreVal(m.score_a),sb=scoreVal(m.score_b);a.p++;b.p++;a.gf+=sa;a.ga+=sb;b.gf+=sb;b.ga+=sa;
      if(sa>sb){a.w++;b.l++;a.pts+=3}else if(sb>sa){b.w++;a.l++;b.pts+=3}else{a.d++;b.d++;a.pts++;b.pts++}
    });
    rows.forEach(r=>r.gd=r.gf-r.ga);
    return [...rows.values()].sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||a.team.name.localeCompare(b.team.name,'ar'));
  }

  function matchCard(m,compact=false){
    const a=m.team_a||team(m.team_a_id)||{},b=m.team_b||team(m.team_b_id)||{};
    const center=isFinished(m)||isLive(m)?`<div class="score" dir="ltr">${scoreVal(m.score_a)} - ${scoreVal(m.score_b)}</div>`:`<div class="vs">VS</div>`;
    return `<button class="card match-card ${compact?'compact':''}" data-open-match="${esc(m.id)}"><div class="match-meta"><span>${esc(m.stage||m.round_name||'مباراة')}${m.group_name?` · المجموعة ${esc(m.group_name)}`:''}</span><span class="status ${isLive(m)?'live':''}">${esc(statusText(m.status))}</span></div><div class="match-row"><div class="team">${imgTag(a.logo_url,a.name)}<b>${esc(a.name||'غير محدد')}</b></div>${center}<div class="team">${imgTag(b.logo_url,b.name)}<b>${esc(b.name||'غير محدد')}</b></div></div><div class="match-footer"><span>${esc(fmtDate(m.match_date))}</span><span>${esc((m.match_time||'').slice(0,5)||'الوقت غير محدد')}</span></div></button>`;
  }

  function renderHome(){
    if(S.loading){$('nextMatch').innerHTML=loading();$('upcoming').innerHTML=loading();return}
    if(S.error){$('nextMatch').innerHTML=empty('تعذر تحميل البيانات','تحقق من الاتصال وحاول مرة أخرى');return}
    const ordered=[...S.matches].sort((a,b)=>isLive(b)-isLive(a)||matchDate(a)-matchDate(b));
    const now=new Date();
    const next=ordered.find(m=>isLive(m)||(m.status==='قادمة'&&matchDate(m)>=new Date(now.getFullYear(),now.getMonth(),now.getDate())))||ordered.find(m=>m.status==='قادمة');
    $('nextMatch').innerHTML=next?matchCard(next):empty('لا توجد مباراة قادمة حاليًا');
    const up=ordered.filter(m=>m.status==='قادمة').slice(0,6);$('upcoming').innerHTML=up.length?up.map(m=>matchCard(m,true)).join(''):empty('لا توجد مباريات قادمة حاليًا');
    renderLeaderCards();renderNews();renderFavorite();
  }

  function renderLeaderCards(){
    const cat='الصغار';
    const sc=scorerRows(cat)[0],as=assistRows(cat)[0],mot=motmRows(cat)[0];
    const keeper=S.awards.find(a=>a.category===cat&&a.type==='أفضل حارس');
    const cards=[['الهدافون',sc?`${sc.name} · ${sc.value} هدف`:'لا توجد أهداف مسجلة','scorers'],['صانعو الألعاب',as?`${as.name} · ${as.value} صناعة`:'لا توجد صناعات مسجلة','assists'],['أفضل حارس',keeper?.player?.name||'لم يتم تحديد أفضل حارس بعد','keeper'],['رجل المباراة',mot?`${mot.name} · ${mot.value} مرة`:'لا توجد بيانات بعد','motm']];
    $('leaderCards').innerHTML=cards.map((x,i)=>`<button class="stat-card" data-stat="${x[2]}"><span>0${i+1}</span><b>${esc(x[0])}</b><small>${esc(x[1])}</small></button>`).join('');
  }

  function renderMatches(){
    const a=S.matches.filter(m=>m.category===S.matchCat).sort((x,y)=>matchDate(x)-matchDate(y));
    $('matchesList').innerHTML=S.loading?loading():a.length?a.map(matchCard).join(''):empty('لا توجد مباريات مسجلة','لن تظهر مباراة قبل إضافتها من لوحة الإدارة.');
  }
  function renderTeams(){
    const q=($('teamSearch')?.value||'').trim().toLowerCase();
    const arr=S.teams.filter(t=>(S.teamCat==='الكل'||t.category===S.teamCat)&&(!q||t.name.toLowerCase().includes(q)||S.players.some(p=>p.team_id===t.id&&p.name.toLowerCase().includes(q))));
    $('teamGrid').innerHTML=S.loading?loading():arr.length?arr.map(t=>`<button class="card teamcard" data-open-team="${t.id}">${imgTag(t.logo_url,t.name)}<h3>${esc(t.name)}</h3><p>${esc(t.category)}${t.group_name?` · المجموعة ${esc(t.group_name)}`:''} · ${S.players.filter(p=>p.team_id===t.id).length} لاعب</p></button>`).join(''):empty('لا توجد نتائج','جرّب فلترًا أو بحثًا مختلفًا.');
  }

  function renderNews(){
    const cards=S.news.map(n=>`<button class="card news-card" data-news="${n.id}">${n.image_url?imgTag(n.image_url,n.title):''}<div class="news-body"><h3>${esc(n.title)}</h3><p>${esc(n.description||'')}</p><small>${esc(fmtDate(n.publish_date))}</small></div></button>`).join('');
    $('newsHome').innerHTML=cards||empty('لا توجد أخبار منشورة حاليًا');
    $('newsList').innerHTML=cards||empty('لا توجد أخبار منشورة حاليًا');
  }

  function renderTournament(){renderOverview();renderStandings();renderBracket();renderRefs();renderStats()}
  function renderOverview(){
    const teams=S.teams.filter(t=>t.category===S.tourCat),matches=S.matches.filter(m=>m.category===S.tourCat),finished=matches.filter(isFinished),goals=S.events.filter(e=>['هدف','ركلة جزاء مسجلة','هدف عكسي'].includes(e.type)&&matchById(e.match_id)?.category===S.tourCat).length;
    const groups=new Set(teams.map(t=>t.group_name).filter(Boolean));
    $('tourOverview').innerHTML=`<div class="metric-grid"><div class="metric"><b>${teams.length}</b><span>فريق</span></div><div class="metric"><b>${matches.length}</b><span>مباراة</span></div><div class="metric"><b>${finished.length}</b><span>انتهت</span></div><div class="metric"><b>${goals}</b><span>هدف</span></div><div class="metric"><b>${S.players.filter(p=>teams.some(t=>t.id===p.team_id)).length}</b><span>لاعب</span></div><div class="metric"><b>${groups.size}</b><span>مجموعة</span></div></div>${S.settings?.tournament_info?`<div class="card info-card">${esc(S.settings.tournament_info)}</div>`:''}`;
  }
  function renderStandings(){
    const rows=standings(S.tourCat),groups=[...new Set(rows.map(r=>r.team.group_name||'عام'))];
    $('standings').innerHTML=groups.map(g=>{const rr=rows.filter(r=>(r.team.group_name||'عام')===g);return `<div class="section"><h3>${g==='عام'?'الترتيب':`المجموعة ${esc(g)}`}</h3><div class="table-wrap"><table><thead><tr><th>#</th><th>الفريق</th><th>ل</th><th>ف</th><th>ت</th><th>خ</th><th>له</th><th>ع</th><th>ف.أ</th><th>ن</th></tr></thead><tbody>${rr.map((r,i)=>`<tr><td>${i+1}</td><td><div class="table-team">${imgTag(r.team.logo_url,r.team.name)}<b>${esc(r.team.name)}</b></div></td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gd}</td><td><b>${r.pts}</b></td></tr>`).join('')}</tbody></table></div></div>`}).join('')||empty('لا توجد فرق مسجلة في هذه الفئة');
  }
  function renderBracket(){
    const knock=S.matches.filter(m=>m.category===S.tourCat&&/نصف|نهائي|ربع/.test(`${m.stage||''} ${m.round_name||''}`));
    if(knock.length){$('bracket').innerHTML=`<div class="bracket">${knock.sort((a,b)=>matchDate(a)-matchDate(b)).map(m=>matchCard(m)).join('')}</div>`;return}
    if(S.tourCat!=='الكبار'){$('bracket').innerHTML=empty('لم تُضف شجرة هذه الفئة بعد');return}
    const st=standings('الكبار'),ga=st.filter(r=>r.team.group_name==='A'),gb=st.filter(r=>r.team.group_name==='B'),gc=st.filter(r=>r.team.group_name==='C');
    const slot=r=>r?.p?r.team.name:null;
    const s1a=slot(ga[0])||'متصدر المجموعة A',s1b=slot(gc[0])||'متصدر المجموعة C',s2a=slot(ga[1])||'وصيف المجموعة A',s2b=slot(gb[0])||'متصدر المجموعة B';
    $('bracket').innerHTML=`<div class="bracket"><div class="card bracket-game"><small>نصف النهائي 1</small><h3>${esc(s1a)} × ${esc(s1b)}</h3></div><div class="card bracket-game"><small>نصف النهائي 2</small><h3>${esc(s2a)} × ${esc(s2b)}</h3></div><div class="card bracket-game"><small>النهائي</small><h3>الفائز من نصف النهائي الأول × الفائز من نصف النهائي الثاني</h3></div></div>`;
  }
  function renderRefs(){
    const general=S.refs.filter(r=>r.category===S.tourCat&&!r.match_id);const main=general.find(r=>r.role==='main'),assistant=general.find(r=>r.role==='assistant');
    $('referees').innerHTML=`<div class="card refs-card"><h3>طاقم حكام ${esc(S.tourCat)}</h3><div><span>الحكم الرئيسي</span><b>${esc(main?.name||'سيتم الإعلان عنه لاحقًا')}</b></div><div><span>الحكم المساعد</span><b>${esc(assistant?.name||'سيتم الإعلان عنه لاحقًا')}</b></div></div>`;
  }
  function renderStats(){
    const matches=S.matches.filter(m=>m.category===S.tourCat),finished=matches.filter(isFinished),goals=S.events.filter(e=>['هدف','ركلة جزاء مسجلة','هدف عكسي'].includes(e.type)&&matchById(e.match_id)?.category===S.tourCat),yellow=S.events.filter(e=>e.type==='بطاقة صفراء'&&matchById(e.match_id)?.category===S.tourCat).length,red=S.events.filter(e=>e.type==='بطاقة حمراء'&&matchById(e.match_id)?.category===S.tourCat).length;
    const sc=scorerRows(S.tourCat),as=assistRows(S.tourCat),st=standings(S.tourCat).sort((a,b)=>b.gf-a.gf);const least=[...standings(S.tourCat)].filter(x=>x.p).sort((a,b)=>a.ga-b.ga)[0];
    $('tourStats').innerHTML=`<div class="metric-grid"><div class="metric"><b>${matches.length}</b><span>مباراة</span></div><div class="metric"><b>${finished.length}</b><span>منتهية</span></div><div class="metric"><b>${goals.length}</b><span>هدف</span></div><div class="metric"><b>${finished.length?(goals.length/finished.length).toFixed(2):'0'}</b><span>متوسط الأهداف</span></div><div class="metric"><b>${yellow}</b><span>صفراء</span></div><div class="metric"><b>${red}</b><span>حمراء</span></div></div><div class="grid2"><div class="card list-card"><h3>الهدافون</h3>${statList(sc,'هدف')}</div><div class="card list-card"><h3>صانعو الألعاب</h3>${statList(as,'صناعة')}</div></div><div class="grid2"><div class="card info-card"><b>أكثر فريق تسجيلًا</b><span>${esc(st[0]?.team.name||'لا توجد بيانات')} ${st[0]?`· ${st[0].gf}`:''}</span></div><div class="card info-card"><b>أقل فريق استقبالًا</b><span>${esc(least?.team.name||'لا توجد بيانات')} ${least?`· ${least.ga}`:''}</span></div></div>`;
  }
  function statList(rows,label){return rows.length?rows.slice(0,20).map((r,i)=>`<div class="rank-row"><span>${i+1}</span><div><b>${esc(r.name||r.player_name||'')}</b><small>${esc(r.team||team(r.team_id)?.name||'')}</small></div><strong>${r.value} ${esc(label)}</strong></div>`).join(''):'<p class="muted">لا توجد بيانات بعد</p>'}

  function showSheet(html){$('sheetPanel').innerHTML=html;$('sheet').classList.add('show')}
  function closeSheet(){$('sheet').classList.remove('show')}
  window.closeSheet=closeSheet;
  function openTeam(id){
    const t=team(id);if(!t)return;const ps=S.players.filter(p=>p.team_id===id);const st=standings(t.category).find(r=>r.team.id===id)||{p:0,w:0,d:0,l:0,gf:0,ga:0,gd:0,pts:0};const ms=S.matches.filter(m=>m.team_a_id===id||m.team_b_id===id).sort((a,b)=>matchDate(a)-matchDate(b));
    showSheet(`<div class="sheet-head"><button data-close>إغلاق</button></div><div class="profile-hero"><div class="profile-main">${imgTag(t.logo_url,t.name,'profile-logo')}<div><h2>${esc(t.name)}</h2><p>${esc(t.category)}${t.group_name?` · المجموعة ${esc(t.group_name)}`:''}</p>${t.coach?`<p>المدرب: ${esc(t.coach)}</p>`:''}${t.captain?`<p>القائد: ${esc(t.captain)}</p>`:''}</div></div><div class="metric-grid mini"><div class="metric"><b>${st.p}</b><span>لعب</span></div><div class="metric"><b>${st.w}</b><span>فوز</span></div><div class="metric"><b>${st.d}</b><span>تعادل</span></div><div class="metric"><b>${st.pts}</b><span>نقاط</span></div></div></div><div class="section"><h3>قائمة اللاعبين · ${ps.length}</h3><div class="player-list">${ps.length?ps.map(p=>playerRow(p,t)).join(''):empty('لم تتم إضافة لاعبين بعد')}</div></div><div class="section"><h3>مباريات الفريق</h3>${ms.length?ms.map(m=>matchCard(m,true)).join(''):empty('لا توجد مباريات للفريق')}</div>`);
  }
  function playerRow(p,t){const s=playerStats(p);return `<button class="player-row" data-open-player="${p.id}"><div class="player-avatar">${p.photo_url?imgTag(p.photo_url,p.name):esc((p.name||'؟')[0])}</div><div><b>${esc(p.name)}</b><small>${esc(t.name)}${p.number!=null?` · #${p.number}`:''}${p.position?` · ${esc(p.position)}`:''}${p.is_captain?' · القائد':''}</small></div><span>${s.goals} ⚽</span></button>`}
  function playerStats(p){const ev=S.events.filter(e=>e.player_id===p.id||(!e.player_id&&e.player_name===p.name&&e.team_id===p.team_id));return {goals:ev.filter(e=>['هدف','ركلة جزاء مسجلة'].includes(e.type)).length,assists:ev.filter(e=>e.type==='تمريرة حاسمة').length+S.events.filter(e=>e.assist_player_id===p.id).length,yellow:ev.filter(e=>e.type==='بطاقة صفراء').length,red:ev.filter(e=>e.type==='بطاقة حمراء').length,motm:ev.filter(e=>e.type==='رجل المباراة').length}}
  function openPlayer(id){const p=player(id);if(!p)return;const t=team(p.team_id)||{};const s=playerStats(p);showSheet(`<div class="sheet-head"><button data-close>إغلاق</button></div><div class="profile-hero"><div class="profile-main"><div class="profile-photo">${p.photo_url?imgTag(p.photo_url,p.name):esc((p.name||'؟')[0])}</div><div><h2>${esc(p.name)}</h2><p>${esc(t.name||'')}</p>${p.number!=null?`<p>الرقم: ${p.number}</p>`:''}${p.position?`<p>المركز: ${esc(p.position)}</p>`:''}</div></div><div class="metric-grid mini"><div class="metric"><b>${s.goals}</b><span>أهداف</span></div><div class="metric"><b>${s.assists}</b><span>صناعة</span></div><div class="metric"><b>${s.yellow}</b><span>صفراء</span></div><div class="metric"><b>${s.motm}</b><span>رجل المباراة</span></div></div></div>`)}
  function openMatch(id){
    const m=matchById(id);if(!m)return;const a=m.team_a||team(m.team_a_id)||{},b=m.team_b||team(m.team_b_id)||{},ev=getEvents(id);const refs=S.refs.filter(r=>r.match_id===id);const gen=S.refs.filter(r=>!r.match_id&&r.category===m.category);const main=refs.find(r=>r.role==='main')||gen.find(r=>r.role==='main'),assistant=refs.find(r=>r.role==='assistant')||gen.find(r=>r.role==='assistant');
    showSheet(`<div class="sheet-head"><button data-close>إغلاق</button></div><div class="match-detail"><small>${esc(m.category)}${m.group_name?` · المجموعة ${esc(m.group_name)}`:''}${m.stage?` · ${esc(m.stage)}`:''}</small><div class="match-row big"><div class="team">${imgTag(a.logo_url,a.name)}<b>${esc(a.name||'')}</b></div><div class="score" dir="ltr">${isFinished(m)||isLive(m)?`${scoreVal(m.score_a)} - ${scoreVal(m.score_b)}`:'VS'}</div><div class="team">${imgTag(b.logo_url,b.name)}<b>${esc(b.name||'')}</b></div></div><p>${esc(fmtDate(m.match_date))} · ${esc((m.match_time||'').slice(0,5)||'الوقت غير محدد')} · ${esc(m.venue||S.settings?.venue_name||'الملعب غير محدد')}</p><span class="status ${isLive(m)?'live':''}">${esc(m.status)}</span></div><div class="detail-tabs"><button class="active" data-pane="overview">نظرة عامة</button><button data-pane="events">الأحداث</button><button data-pane="lineups">التشكيلات</button></div><div id="pane-overview" class="pane active"><div class="grid2"><div class="card info-card"><b>الحكم الرئيسي</b><span>${esc(main?.name||'غير محدد')}</span></div><div class="card info-card"><b>الحكم المساعد</b><span>${esc(assistant?.name||'غير محدد')}</span></div></div>${motmBlock(ev)}</div><div id="pane-events" class="pane">${ev.length?`<div class="event-list">${ev.map(eventRow).join('')}</div>`:empty('لا توجد أحداث مسجلة')}</div><div id="pane-lineups" class="pane">${empty('لم يتم تسجيل التشكيلة بعد')}</div>`);
  }
  function eventRow(e){const icons={'هدف':'⚽','ركلة جزاء مسجلة':'⚽','هدف عكسي':'⚽','ركلة جزاء ضائعة':'✖','تمريرة حاسمة':'🎯','بطاقة صفراء':'🟨','بطاقة حمراء':'🟥','تبديل':'↔','رجل المباراة':'★'};return `<div class="event-row"><span>${icons[e.type]||'•'}</span><div><b>${esc(e.type)}${e.minute!=null?` · ${e.minute}'`:''}</b><small>${esc(playerName(e)||e.note||'')}${eventTeamName(e)?` · ${esc(eventTeamName(e))}`:''}${assistName(e)?` · صناعة: ${esc(assistName(e))}`:''}</small></div></div>`}
  function motmBlock(ev){const e=ev.find(x=>x.type==='رجل المباراة');return e?`<div class="card motm"><b>رجل المباراة</b><span>${esc(playerName(e))}</span></div>`:''}
  function openArticle(id){const n=S.news.find(x=>x.id===id);if(!n)return;showSheet(`<div class="sheet-head"><button data-close>إغلاق</button></div><article class="article">${n.image_url?imgTag(n.image_url,n.title,'article-cover'):''}<small>${esc(fmtDate(n.publish_date))}</small><h1>${esc(n.title)}</h1>${n.description?`<p class="lead">${esc(n.description)}</p>`:''}<div class="article-body">${esc(n.content||'').replace(/\n/g,'<br>')}</div></article>`)}
  function openStat(type){const cat='الصغار';let title='الإحصائيات',rows=[];if(type==='scorers'){title='الهدافون';rows=scorerRows(cat)}if(type==='assists'){title='صانعو الألعاب';rows=assistRows(cat)}if(type==='motm'){title='رجال المباريات';rows=motmRows(cat)}if(type==='keeper'){title='أفضل حارس';const a=S.awards.filter(x=>x.category===cat&&x.type==='أفضل حارس');rows=a.map((x,i)=>({name:x.player?.name||'غير محدد',team:team(x.player?.team_id)?.name||'',value:a.length-i}))}showSheet(`<div class="sheet-head"><button data-close>إغلاق</button></div><h2>${esc(title)}</h2><p class="muted">فئة الصغار</p><div class="card list-card">${rows.length?statList(rows,type==='scorers'?'هدف':type==='assists'?'صناعة':'مرة'):empty('لا توجد بيانات بعد')}</div>`)}

  function openSearch(){showSheet(`<div class="sheet-head"><button data-close>إغلاق</button></div><h2>البحث الشامل</h2><input id="globalSearch" class="search" placeholder="فريق، لاعب أو مباراة"><div id="globalResults"></div>`);setTimeout(()=>{$('globalSearch').addEventListener('input',renderGlobalSearch);$('globalSearch').focus()},0)}
  function renderGlobalSearch(){const q=$('globalSearch').value.trim().toLowerCase();if(!q){$('globalResults').innerHTML='';return}const out=[];S.teams.filter(t=>t.name.toLowerCase().includes(q)).slice(0,8).forEach(t=>out.push(`<button class="search-result" data-open-team="${t.id}">${imgTag(t.logo_url,t.name)}<div><b>${esc(t.name)}</b><small>${esc(t.category)}</small></div></button>`));S.players.filter(p=>p.name.toLowerCase().includes(q)).slice(0,12).forEach(p=>out.push(`<button class="search-result" data-open-player="${p.id}"><div class="mini-letter">${esc(p.name[0]||'؟')}</div><div><b>${esc(p.name)}</b><small>${esc(team(p.team_id)?.name||'')}</small></div></button>`));S.matches.filter(m=>`${m.team_a?.name||''} ${m.team_b?.name||''}`.toLowerCase().includes(q)).slice(0,8).forEach(m=>out.push(`<button class="search-result" data-open-match="${m.id}"><div class="mini-letter">⚽</div><div><b>${esc(m.team_a?.name||'')} × ${esc(m.team_b?.name||'')}</b><small>${esc(m.category)} · ${esc(m.status)}</small></div></button>`));$('globalResults').innerHTML=out.join('')||empty('لا توجد نتائج')}
  function favoriteSheet(){showSheet(`<div class="sheet-head"><button data-close>إغلاق</button></div><h2>اختر فريقك المفضل</h2><div class="teamgrid">${S.teams.map(t=>`<button class="card teamcard" data-fav="${t.id}">${imgTag(t.logo_url,t.name)}<h3>${esc(t.name)}</h3></button>`).join('')}</div>`)}
  function renderFavorite(){const id=localStorage.getItem('favTeamId'),t=team(id);const sec=$('favSection');if(!t){sec.hidden=true;return}sec.hidden=false;$('favCard').innerHTML=`<button class="card favorite-card" data-open-team="${t.id}">${imgTag(t.logo_url,t.name)}<div><b>${esc(t.name)}</b><span>فريقك المفضل</span></div></button>`}

  function renderAll(){renderHome();renderMatches();renderTeams();renderTournament();renderNews()}
  function go(page){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===page));document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===page));scrollTo({top:0,behavior:'smooth'})}
  window.go=go;

  document.addEventListener('click',e=>{
    const p=e.target.closest('[data-page]');if(p){go(p.dataset.page);return}
    const mt=e.target.closest('[data-matchcat]');if(mt){S.matchCat=mt.dataset.matchcat;document.querySelectorAll('[data-matchcat]').forEach(x=>x.classList.toggle('active',x===mt));renderMatches();return}
    const tt=e.target.closest('[data-teamcat]');if(tt){S.teamCat=tt.dataset.teamcat;document.querySelectorAll('[data-teamcat]').forEach(x=>x.classList.toggle('active',x===tt));renderTeams();return}
    const tc=e.target.closest('[data-tourcat]');if(tc){S.tourCat=tc.dataset.tourcat;document.querySelectorAll('[data-tourcat]').forEach(x=>x.classList.toggle('active',x===tc));renderTournament();return}
    const tb=e.target.closest('[data-tourtab]');if(tb){document.querySelectorAll('[data-tourtab]').forEach(x=>x.classList.toggle('active',x===tb));document.querySelectorAll('.tour-pane').forEach(x=>x.classList.toggle('active',x.id===`tour-${tb.dataset.tourtab}`));return}
    const m=e.target.closest('[data-open-match]');if(m){openMatch(m.dataset.openMatch);return}
    const t=e.target.closest('[data-open-team]');if(t){openTeam(t.dataset.openTeam);return}
    const p2=e.target.closest('[data-open-player]');if(p2){openPlayer(p2.dataset.openPlayer);return}
    const n=e.target.closest('[data-news]');if(n){openArticle(n.dataset.news);return}
    const s=e.target.closest('[data-stat]');if(s){openStat(s.dataset.stat);return}
    if(e.target.closest('[data-close]')){closeSheet();return}
    const pane=e.target.closest('[data-pane]');if(pane){document.querySelectorAll('.detail-tabs button').forEach(x=>x.classList.toggle('active',x===pane));document.querySelectorAll('.pane').forEach(x=>x.classList.toggle('active',x.id===`pane-${pane.dataset.pane}`));return}
    const fav=e.target.closest('[data-fav]');if(fav){localStorage.setItem('favTeamId',fav.dataset.fav);closeSheet();renderFavorite();return}
    if(e.target.id==='sheet')closeSheet();
  });
  $('teamSearch').addEventListener('input',debounce(renderTeams,120));
  $('searchBtn').addEventListener('click',openSearch);
  $('moreSearch').addEventListener('click',openSearch);
  $('favoriteBtn').addEventListener('click',favoriteSheet);
  $('allMatchesBtn').addEventListener('click',()=>go('matches'));
  $('allNewsBtn').addEventListener('click',()=>go('news'));

  const realtimeReload=debounce(()=>loadAll(true),450);
  sb.channel('public-tournament-live')
    .on('postgres_changes',{event:'*',schema:'public',table:'teams'},realtimeReload)
    .on('postgres_changes',{event:'*',schema:'public',table:'players'},realtimeReload)
    .on('postgres_changes',{event:'*',schema:'public',table:'matches'},realtimeReload)
    .on('postgres_changes',{event:'*',schema:'public',table:'match_events'},realtimeReload)
    .on('postgres_changes',{event:'*',schema:'public',table:'news'},realtimeReload)
    .on('postgres_changes',{event:'*',schema:'public',table:'referee_assignments'},realtimeReload)
    .on('postgres_changes',{event:'*',schema:'public',table:'awards'},realtimeReload)
    .on('postgres_changes',{event:'*',schema:'public',table:'site_settings'},realtimeReload)
    .subscribe();

  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadAll(true)});
  loadAll();
})();
