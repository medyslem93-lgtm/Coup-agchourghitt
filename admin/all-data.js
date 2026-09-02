(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmtDate = d => d ? new Intl.DateTimeFormat('ar-MR',{dateStyle:'medium'}).format(new Date(`${d}T12:00:00`)) : 'بدون تاريخ';
  const fmtTime = t => t ? String(t).slice(0,5) : 'بدون وقت';
  const cfg = window.AGCH_CONFIG;
  if (!cfg || !window.supabase?.createClient) return;
  const sb = window.AGCH_ADMIN_SB || window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});

  const style=document.createElement('style');
  style.textContent=`
    .all-data-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 18px}.all-data-toolbar input,.all-data-toolbar select{min-height:46px;border:1px solid #d9dfda;border-radius:14px;padding:0 14px;background:#fff;color:#17362b;font-family:inherit}.data-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:16px}.data-summary .metric{background:#fff;border:1px solid #e2e7e3;border-radius:18px;padding:16px}.data-summary .metric b{display:block;font-size:25px;color:#00684f}.data-summary .metric span{color:#68736e;font-size:13px}.data-block{background:#fff;border:1px solid #e2e7e3;border-radius:20px;margin:14px 0;overflow:hidden}.data-block>h3{margin:0;padding:16px 18px;background:linear-gradient(135deg,#003b2f,#00684f);color:#fff;font-size:18px}.data-block .body{padding:12px}.data-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:12px 4px;border-bottom:1px solid #edf0ed}.data-row:last-child{border-bottom:0}.data-row b{color:#17362b}.data-row small{display:block;color:#7a807c;margin-top:3px}.pill{display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;background:#f4f6f2;color:#315245;font-size:12px;border:1px solid #e2e7e3;margin:2px}.pill.warn{background:#fff7df;color:#815f00;border-color:#ead58a}.pill.bad{background:#fff0f0;color:#8d3333;border-color:#efcaca}.logo-mini{width:38px;height:38px;object-fit:contain;border-radius:50%;border:2px solid #d4af50;background:#fff;margin-left:8px;vertical-align:middle}.data-empty{padding:18px;color:#7a807c;text-align:center}.section#allData{padding-bottom:150px}.group-title{font-weight:800;color:#003b2f;margin:14px 0 8px}.scroll-table{overflow:auto}.scroll-table table{width:100%;border-collapse:collapse;min-width:720px}.scroll-table th,.scroll-table td{padding:10px;border-bottom:1px solid #edf0ed;text-align:right;white-space:nowrap}.scroll-table th{background:#f5f7f5;color:#315245;position:sticky;top:0}.count-badge{background:#d4af50;color:#17362b;padding:5px 9px;border-radius:999px;font-weight:800}
    @media(min-width:760px){.data-summary{grid-template-columns:repeat(4,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);

  const tabs=$('.tabs');
  const settingsSection=$('#settings');
  if(!tabs || !settingsSection) return;
  const tab=document.createElement('button');
  tab.dataset.tab='allData';
  tab.textContent='كل المعلومات';
  tabs.appendChild(tab);
  const sec=document.createElement('section');
  sec.id='allData';
  sec.className='section';
  sec.innerHTML=`
    <div class="head"><h2>كل معلومات البطولة</h2><button id="allDataRefresh" class="primary">تحديث البيانات</button></div>
    <p class="muted">يعرض هذا القسم كل البيانات الموجودة فعليًا في قاعدة كأس أغشوركيت: الفرق، اللاعبين، المباريات، الأحداث، الحكام، الأخبار، الجوائز وإعدادات البطولة، مع تنبيهك إلى البيانات الناقصة دون اختراع أي معلومات.</p>
    <div class="all-data-toolbar"><input id="allDataSearch" placeholder="ابحث في كل المعلومات"><select id="allDataCat"><option value="الكل">كل الفئات</option><option>الكبار</option><option>الوسط</option><option>الصغار</option></select></div>
    <div id="allDataSummary" class="data-summary"></div>
    <div id="allDataIssues"></div>
    <div id="allDataContent"></div>`;
  settingsSection.before(sec);

  let D={teams:[],players:[],matches:[],events:[],refs:[],news:[],awards:[],settings:null};
  let loaded=false;
  const team=id=>D.teams.find(t=>t.id===id);
  const player=id=>D.players.find(p=>p.id===id);
  const matchName=m=>`${m.team_a?.name||m.team_a_placeholder||'غير محدد'} × ${m.team_b?.name||m.team_b_placeholder||'غير محدد'}`;
  const logo=(u,n)=>`<img class="logo-mini" src="${esc(u||'../assets/tournament.jpg')}" alt="${esc(n||'')}" onerror="this.onerror=null;this.src='../assets/tournament.jpg'">`;

  async function load(){
    $('#allDataContent').innerHTML='<div class="card data-empty">جارٍ تحميل جميع بيانات الإدارة...</div>';
    const [tr,pr,mr,er,rr,nr,aw,sr]=await Promise.all([
      sb.from('teams').select('*').order('category').order('name'),
      sb.from('players').select('*').order('name'),
      sb.from('matches').select('*,team_a:teams!matches_team_a_id_fkey(id,name,logo_url),team_b:teams!matches_team_b_id_fkey(id,name,logo_url)').order('match_date',{ascending:true,nullsFirst:false}).order('match_time',{ascending:true,nullsFirst:false}),
      sb.from('match_events').select('*').order('created_at',{ascending:false}),
      sb.from('referee_assignments').select('*').order('category'),
      sb.from('news').select('*').order('publish_date',{ascending:false}),
      sb.from('awards').select('*,player:players(id,name,team_id,photo_url)').order('award_date',{ascending:false,nullsFirst:false}),
      sb.from('site_settings').select('*').eq('id','main').maybeSingle()
    ]);
    const bad=[tr,pr,mr,er,rr,nr,aw,sr].find(x=>x.error);
    if(bad){$('#allDataContent').innerHTML=`<div class="card data-empty">تعذر تحميل المعلومات: ${esc(bad.error.message||'خطأ')}</div>`;return;}
    D={teams:tr.data||[],players:pr.data||[],matches:mr.data||[],events:er.data||[],refs:rr.data||[],news:nr.data||[],awards:aw.data||[],settings:sr.data||{}};
    loaded=true;render();
  }

  function render(){
    const q=($('#allDataSearch')?.value||'').trim().toLowerCase();
    const cat=$('#allDataCat')?.value||'الكل';
    const catOk=x=>cat==='الكل'||x===cat;
    const playerTeam=p=>team(p.team_id);
    const teams=D.teams.filter(t=>catOk(t.category)&&(!q||[t.name,t.coach,t.captain,t.group_name].filter(Boolean).some(v=>String(v).toLowerCase().includes(q))));
    const players=D.players.filter(p=>{const t=playerTeam(p);return catOk(t?.category)&&(!q||[p.name,p.position,p.number,t?.name].filter(v=>v!==null&&v!==undefined).some(v=>String(v).toLowerCase().includes(q)))});
    const matches=D.matches.filter(m=>catOk(m.category)&&(!q||[matchName(m),m.stage,m.round_name,m.group_name,m.venue,m.status,m.match_date].filter(Boolean).some(v=>String(v).toLowerCase().includes(q))));
    const events=D.events.filter(e=>{const m=D.matches.find(x=>x.id===e.match_id);return catOk(m?.category)&&(!q||[e.type,e.player_name,e.assist_name,e.note,matchName(m||{})].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)))});
    const refs=D.refs.filter(r=>catOk(r.category)&&(!q||[r.name,r.role].some(v=>String(v||'').toLowerCase().includes(q))));
    const news=D.news.filter(n=>(cat==='الكل'||!n.category||n.category===cat)&&(!q||[n.title,n.description,n.content,n.type].filter(Boolean).some(v=>String(v).toLowerCase().includes(q))));

    $('#allDataSummary').innerHTML=[
      ['الفرق',teams.length],['اللاعبون',players.length],['المباريات',matches.length],['الأحداث',events.length],['الحكام',refs.length],['الأخبار',news.length],['الجوائز',D.awards.filter(a=>catOk(a.category)).length],['إجمالي الأهداف',events.filter(e=>['هدف','ركلة جزاء مسجلة','هدف عكسي'].includes(e.type)).length]
    ].map(([a,b])=>`<div class="metric"><b>${b}</b><span>${a}</span></div>`).join('');

    const missingLogos=D.teams.filter(t=>!t.logo_url);
    const noPlayers=D.teams.filter(t=>!D.players.some(p=>p.team_id===t.id));
    const missingDates=D.matches.filter(m=>!m.match_date);
    const missingTimes=D.matches.filter(m=>!m.match_time);
    const issues=[];
    if(missingLogos.length)issues.push(`<span class="pill bad">${missingLogos.length} فريق بلا شعار</span>`);
    if(noPlayers.length)issues.push(`<span class="pill warn">${noPlayers.length} فريق بلا لاعبين</span>`);
    if(missingDates.length)issues.push(`<span class="pill warn">${missingDates.length} مباراة بلا تاريخ</span>`);
    if(missingTimes.length)issues.push(`<span class="pill warn">${missingTimes.length} مباراة بلا وقت</span>`);
    $('#allDataIssues').innerHTML=`<div class="data-block"><h3>حالة اكتمال البيانات</h3><div class="body">${issues.length?issues.join(''):'<span class="pill">لا توجد نواقص أساسية مكتشفة</span>'}${noPlayers.length?`<div class="group-title">فرق تحتاج قوائم لاعبين</div>${noPlayers.map(t=>`<span class="pill warn">${esc(t.name)} · ${esc(t.category)}</span>`).join('')}`:''}${missingLogos.length?`<div class="group-title">فرق تحتاج شعارًا</div>${missingLogos.map(t=>`<span class="pill bad">${esc(t.name)} · ${esc(t.category)}</span>`).join('')}`:''}</div></div>`;

    const teamsHtml=teams.map(t=>{const pc=D.players.filter(p=>p.team_id===t.id).length;return `<div class="data-row"><div><b>${logo(t.logo_url,t.name)}${esc(t.name)}</b><small>${esc(t.category)}${t.group_name?` · المجموعة ${esc(t.group_name)}`:''}${t.coach?` · المدرب: ${esc(t.coach)}`:''}${t.captain?` · القائد: ${esc(t.captain)}`:''}</small></div><span class="count-badge">${pc} لاعب</span></div>`}).join('')||'<div class="data-empty">لا توجد فرق مطابقة</div>';
    const playersHtml=players.map(p=>{const t=playerTeam(p);return `<div class="data-row"><div><b>${esc(p.name)}${p.is_captain?' · قائد':''}</b><small>${esc(t?.name||'فريق غير محدد')} · ${esc(t?.category||'')}${p.position?` · ${esc(p.position)}`:''}${p.number!=null?` · #${p.number}`:''}</small></div><span class="pill">${D.events.filter(e=>e.player_id===p.id&&['هدف','ركلة جزاء مسجلة'].includes(e.type)).length} هدف</span></div>`}).join('')||'<div class="data-empty">لا يوجد لاعبون مطابقون</div>';
    const matchRows=matches.map(m=>`<tr><td>${esc(fmtDate(m.match_date))}</td><td>${esc(fmtTime(m.match_time))}</td><td>${esc(m.category)}</td><td>${esc(m.stage||m.round_name||'غير محدد')}</td><td>${logo(m.team_a?.logo_url,m.team_a?.name)}${esc(m.team_a?.name||m.team_a_placeholder||'غير محدد')}</td><td>${m.status==='انتهت'||m.status==='مباشر'?`${m.score_a??0} - ${m.score_b??0}`:'VS'}</td><td>${logo(m.team_b?.logo_url,m.team_b?.name)}${esc(m.team_b?.name||m.team_b_placeholder||'غير محدد')}</td><td>${esc(m.status||'')}</td><td>${esc(m.venue||'غير محدد')}</td></tr>`).join('');
    const eventsHtml=events.map(e=>{const m=D.matches.find(x=>x.id===e.match_id);return `<div class="data-row"><div><b>${esc(e.type)} · ${esc(e.player_name||player(e.player_id)?.name||'بدون لاعب')}</b><small>${esc(matchName(m||{}))}${e.assist_name?` · صناعة: ${esc(e.assist_name)}`:''}${e.minute!=null?` · الدقيقة ${e.minute}`:''}${e.note?` · ${esc(e.note)}`:''}</small></div></div>`}).join('')||'<div class="data-empty">لا توجد أحداث مطابقة</div>';
    const refsHtml=refs.map(r=>{const m=D.matches.find(x=>x.id===r.match_id);return `<div class="data-row"><div><b>${esc(r.name)}</b><small>${esc(r.category)} · ${r.role==='main'?'الحكم الرئيسي':'الحكم المساعد'}${m?` · ${esc(matchName(m))}`:' · عام للفئة'}</small></div></div>`}).join('')||'<div class="data-empty">لا توجد تعيينات حكام</div>';
    const newsHtml=news.map(n=>`<div class="data-row"><div><b>${esc(n.title)}</b><small>${esc(n.publish_date||'بدون تاريخ')} · ${esc(n.type||'خبر')}${n.category?` · ${esc(n.category)}`:' · عام'}${n.featured?' · مثبت':''}</small></div></div>`).join('')||'<div class="data-empty">لا توجد أخبار مطابقة</div>';
    const s=D.settings||{};
    const settingsHtml=`<div class="data-row"><div><b>${esc(s.tournament_name||'كأس أغشوركيت 2026')}</b><small>الموسم ${esc(s.season||'2026')} · ${esc(s.tournament_status||'غير محدد')} · الملعب: ${esc(s.venue_name||'غير محدد')}</small></div></div><div class="data-row"><div><b>العنوان الرئيسي</b><small>${esc(s.hero_title||'غير متوفر')}</small></div></div><div class="data-row"><div><b>معلومات البطولة</b><small>${esc(s.tournament_info||'غير متوفرة')}</small></div></div>`;

    $('#allDataContent').innerHTML=`
      <div class="data-block"><h3>الفرق <span class="count-badge">${teams.length}</span></h3><div class="body">${teamsHtml}</div></div>
      <div class="data-block"><h3>اللاعبون <span class="count-badge">${players.length}</span></h3><div class="body">${playersHtml}</div></div>
      <div class="data-block"><h3>المباريات <span class="count-badge">${matches.length}</span></h3><div class="body scroll-table"><table><thead><tr><th>التاريخ</th><th>الوقت</th><th>الفئة</th><th>المرحلة</th><th>الفريق الأول</th><th>النتيجة</th><th>الفريق الثاني</th><th>الحالة</th><th>الملعب</th></tr></thead><tbody>${matchRows}</tbody></table></div></div>
      <div class="data-block"><h3>أحداث المباريات <span class="count-badge">${events.length}</span></h3><div class="body">${eventsHtml}</div></div>
      <div class="data-block"><h3>الحكام <span class="count-badge">${refs.length}</span></h3><div class="body">${refsHtml}</div></div>
      <div class="data-block"><h3>الأخبار <span class="count-badge">${news.length}</span></h3><div class="body">${newsHtml}</div></div>
      <div class="data-block"><h3>إعدادات ومعلومات البطولة</h3><div class="body">${settingsHtml}</div></div>`;
  }

  async function openAllData(){
    document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id==='allData'));
    document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab==='allData'));
    window.scrollTo({top:0,behavior:'smooth'});
    if(!loaded) await load(); else render();
  }
  tab.addEventListener('click',e=>{e.stopPropagation();openAllData();});
  $('#allDataRefresh').addEventListener('click',load);
  $('#allDataSearch').addEventListener('input',()=>loaded&&render());
  $('#allDataCat').addEventListener('change',()=>loaded&&render());
})();
