(() => {
  'use strict';
  if(!window.supabase||!window.AGCH_CONFIG)return;
  const sb=window.supabase.createClient(window.AGCH_CONFIG.supabaseUrl,window.AGCH_CONFIG.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
  const M={teams:[],matches:[],quals:[],filter:'all',date:'all',active:localStorage.getItem('agh-active-category')||'الكبار',loaded:false};
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const icon=(name)=>({
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    matches:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    trophy:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v4a4 4 0 0 1-8 0zM10 12v4m4-4v4M8 20h8M6 6H4v2a4 4 0 0 0 4 4M18 6h2v2a4 4 0 0 1-4 4"/></svg>',
    teams:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M14 15.5a4.5 4.5 0 0 1 6.5 4.5"/></svg>',
    menu:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    ball:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m12 7 3 2-1 4h-4L9 9zM9 9 6 8M15 9l3-1M10 13l-2 4M14 13l2 4M8 17l-1 2M16 17l1 2"/></svg>',
    star:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/></svg>',
    pin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11z"/><circle cx="12" cy="10" r="2"/></svg>',
    placeholder:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 4.3 1.7c-1.2 1-2 1.5-2 3M12 17h.01"/></svg>'
  }[name]||'');
  const teamById=id=>M.teams.find(t=>t.id===id);
  const side=(m,k)=>m[`team_${k}`]||teamById(m[`team_${k}_id`])||null;
  const sideName=(m,k)=>side(m,k)?.name||m[`team_${k}_placeholder`]||'غير محدد';
  const sideLogo=(m,k)=>side(m,k)?.logo_url||'';
  const status=m=>m.status||'قادمة';
  const isPastStatus=m=>status(m)==='انتهت';
  const isLive=m=>status(m)==='مباشر';
  const matchDT=m=>m.match_date?new Date(`${m.match_date}T${String(m.match_time||'17:00').slice(0,5)}:00`):new Date(8640000000000000);
  const fmt=d=>{if(!d)return 'التاريخ غير محدد';try{return new Intl.DateTimeFormat('ar-MR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${d}T12:00:00Z`))}catch{return d}};
  const shortDay=d=>{const x=new Date(`${d}T12:00:00Z`);return new Intl.DateTimeFormat('ar-MR',{weekday:'short'}).format(x)};
  const img=(u,a)=>u?`<img src="${esc(u)}" alt="${esc(a)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span class="middle-logo-shell" style="display:none">${icon('placeholder')}</span>`:`<span class="middle-logo-shell">${icon('placeholder')}</span>`;
  let originalHome=null, countdownTimer=null, reloadTimer=null;

  function ensureBar(){
    if($('#middleCategoryBar'))return;
    const bar=document.createElement('div');bar.id='middleCategoryBar';bar.className='middle-category-bar';bar.innerHTML=`<button data-global-cat="الكبار">الكبار</button><button data-global-cat="الوسط">${icon('star')} الوسط</button><button data-global-cat="الصغار">${icon('ball')} الصغار</button>`;
    const top=$('.topbar');top?.insertAdjacentElement('afterend',bar);
  }
  function navIcons(on){
    const map={home:'home',matches:'matches',tournament:'trophy',teams:'teams',more:'menu'};
    $$('.nav [data-page]').forEach(b=>{const span=b.querySelector('span');if(!span)return;if(!span.dataset.old)span.dataset.old=span.innerHTML;span.innerHTML=on?icon(map[b.dataset.page]):span.dataset.old;});
  }
  function syncLegacy(cat){
    const selectors=[`[data-matchcat="${cat}"]`,`[data-teamcat="${cat}"]`,`[data-tourcat="${cat}"]`];
    selectors.forEach(s=>{const b=$(s);if(b&&!b.classList.contains('active'))b.click();});
  }
  function setCategory(cat,{sync=true}={}){
    M.active=cat;localStorage.setItem('agh-active-category',cat);document.body.dataset.activeCategory=cat;document.body.classList.toggle('middle-mode',cat==='الوسط');
    $$('#middleCategoryBar [data-global-cat]').forEach(b=>b.classList.toggle('active',b.dataset.globalCat===cat));navIcons(cat==='الوسط');
    if(sync)syncLegacy(cat);
    if(cat==='الوسط'){loadMiddle().then(renderForPage);} else {removeMiddleExtras();restoreHome();}
  }
  function removeMiddleExtras(){['#middleMatchesIntro','#middleTeamsIntro'].forEach(s=>$(s)?.remove());}
  function saveHome(){if(originalHome)return;originalHome={next:$('#nextMatch')?.innerHTML||'',up:$('#upcoming')?.innerHTML||''};}
  function restoreHome(){if(!originalHome)return;if($('#nextMatch'))$('#nextMatch').innerHTML=originalHome.next;if($('#upcoming'))$('#upcoming').innerHTML=originalHome.up;clearInterval(countdownTimer);countdownTimer=null;}

  async function loadMiddle(){
    try{
      const [tr,mr,qr]=await Promise.all([
        sb.from('teams').select('*').eq('category','الوسط').order('name'),
        sb.from('matches').select('*,team_a:teams!matches_team_a_id_fkey(id,name,logo_url,category),team_b:teams!matches_team_b_id_fkey(id,name,logo_url,category)').eq('category','الوسط').order('display_order').order('match_date'),
        sb.from('qualification_events').select('*,participant:teams(id,name,logo_url,category)').eq('category','الوسط').order('display_order')
      ]);
      const bad=[tr,mr,qr].find(x=>x.error);if(bad)throw bad.error;
      M.teams=tr.data||[];M.matches=mr.data||[];M.quals=qr.data||[];M.loaded=true;
    }catch(e){console.error('Middle championship load failed',e);}
  }

  function teamGrid(){
    const q=($('#teamSearch')?.value||'').trim().toLowerCase();
    const arr=M.teams.filter(t=>!q||t.name.toLowerCase().includes(q));
    return arr.map(t=>`<article class="middle-team-card"><div class="middle-team-visual">${img(t.logo_url,t.name)}<h3>${esc(t.name)}</h3></div><span class="middle-team-badge">بطولة الوسط</span><button class="middle-team-open" data-open-team="${t.id}">صفحة الفريق ←</button></article>`).join('')||'<div class="empty card">لا توجد فرق مطابقة</div>';
  }
  function renderMiddleTeams(){
    const grid=$('#teamGrid');if(!grid)return;
    let intro=$('#middleTeamsIntro');if(!intro){intro=document.createElement('div');intro.id='middleTeamsIntro';intro.className='middle-page-intro';grid.before(intro)}
    intro.innerHTML=`<div class="middle-team-heading"><div><span class="middle-kicker">CLUBS</span><h2>فرق بطولة الوسط</h2><p>اضغط على شعار أي فريق لمشاهدة قائمته ولاعبيه.</p></div></div>`;
    grid.className='middle-team-grid';grid.innerHTML=teamGrid();
  }

  function dateStrip(){
    const dates=[...new Set(M.matches.map(m=>m.match_date).filter(Boolean))];
    return `<div class="middle-date-strip"><button class="${M.date==='all'?'active':''}" data-middle-date="all"><span>كل</span><b>المواعيد</b></button>${dates.map(d=>`<button class="${M.date===d?'active':''}" data-middle-date="${d}"><span>${esc(shortDay(d))}</span><b>${new Date(`${d}T12:00:00Z`).getUTCDate()}</b></button>`).join('')}</div>`;
  }
  function resultFilters(){return `<div class="middle-result-filters"><button class="${M.filter==='all'?'active':''}" data-middle-filter="all">الكل</button><button class="${M.filter==='upcoming'?'active':''}" data-middle-filter="upcoming">القادمة</button><button class="${M.filter==='results'?'active':''}" data-middle-filter="results">النتائج</button></div>`}
  function matchCard(m,mini=false){
    const an=sideName(m,'a'),bn=sideName(m,'b'),al=sideLogo(m,'a'),bl=sideLogo(m,'b');
    const center=(isPastStatus(m)||isLive(m))?`<div class="middle-center-box score ${isLive(m)?'live':''}" dir="ltr">${m.score_a??0} - ${m.score_b??0}</div>`:`<div class="middle-center-box">${esc(String(m.match_time||'').slice(0,5)||'غير محدد')}</div>`;
    const state=isLive(m)?'مباشر':isPastStatus(m)?'انتهت':'لم تبدأ بعد ←';
    return `<button class="middle-match-card ${mini?'middle-mini':''}" data-middle-match="${m.id}"><div class="middle-match-top"><b>${esc(m.round_name||m.stage||'مباراة')}</b><span>${esc(fmt(m.match_date))}</span></div><div class="middle-match-main"><div class="middle-side">${img(al,an)}<b>${esc(an)}</b></div>${center}<div class="middle-side">${img(bl,bn)}<b>${esc(bn)}</b></div></div><div class="middle-match-bottom"><span class="state ${isLive(m)?'live':''}">${state}</span><span class="venue">${icon('pin')} ${esc(m.venue||'ملعب رضوان')}</span></div></button>`;
  }
  function qualificationCard(q){const t=q.participant||teamById(q.participant_team_id)||{};return `<button class="middle-match-card middle-bye-card" data-middle-qualification="${q.id}"><div class="middle-match-top"><b>${esc(q.stage||'تأهل بالقرعة')}</b><span>${esc(q.status||'تأهل بالقرعة')}</span></div><div class="middle-match-main"><div class="middle-side">${img(t.logo_url,t.name||q.participant_label)}<b>${esc(t.name||q.participant_label||'الشمال')}</b></div><div class="middle-center-box">VS</div><div class="middle-side"><span class="middle-logo-shell">${icon('placeholder')}</span><b>${esc(q.opponent_label||'تأهل تلقائي')}</b></div></div><div class="middle-match-bottom"><span class="state">تأهل بالقرعة</span><span class="venue">${icon('pin')} ${esc(q.venue||'ملعب رضوان')}</span></div></button>`}
  function visibleItems(){
    const ms=M.matches.filter(m=>(M.date==='all'||m.match_date===M.date)&&(M.filter==='all'||(M.filter==='upcoming'&&!isPastStatus(m))||(M.filter==='results'&&isPastStatus(m))));
    const qs=(M.date==='all'&&M.filter!=='results')?M.quals:[];
    return [...ms.map(m=>({order:m.display_order||99,html:matchCard(m)})),...qs.map(q=>({order:q.display_order||99,html:qualificationCard(q)}))].sort((a,b)=>a.order-b.order).map(x=>x.html).join('');
  }
  function renderMiddleMatches(){
    const list=$('#matchesList');if(!list)return;
    let intro=$('#middleMatchesIntro');if(!intro){intro=document.createElement('div');intro.id='middleMatchesIntro';intro.className='middle-page-intro';list.before(intro)}
    intro.innerHTML=`<span class="middle-kicker">MATCH CENTRE</span><h1>المباريات</h1><p>الجدول الكامل لبطولة الوسط من الأربعاء، 26 أغسطس 2026 إلى الجمعة، 18 سبتمبر 2026</p><div class="middle-complete-banner">${icon('matches')}<div><b>جميع التواريخ مكتملة</b><span>من الدور الأول حتى النهائي وفق البرنامج الرسمي المسجل</span></div></div>${dateStrip()}${resultFilters()}`;
    list.className='middle-match-list';list.innerHTML=visibleItems()||'<div class="empty card">لا توجد مباريات مطابقة لهذا الفلتر</div>';
  }

  function nextMatch(){const now=new Date();return M.matches.filter(m=>m.status==='قادمة'&&m.team_a_id&&m.team_b_id&&matchDT(m)>=now).sort((a,b)=>matchDT(a)-matchDT(b))[0]||M.matches.filter(m=>m.status==='قادمة'&&m.team_a_id&&m.team_b_id).sort((a,b)=>matchDT(a)-matchDT(b))[0]}
  function countdownParts(m){const diff=Math.max(0,matchDT(m)-new Date()),sec=Math.floor(diff/1000);return {d:Math.floor(sec/86400),h:Math.floor(sec%86400/3600),m:Math.floor(sec%3600/60),s:sec%60}}
  function hero(m){if(!m)return '<div class="empty card">لا توجد مباراة قادمة لبطولة الوسط</div>';const a=side(m,'a')||{},b=side(m,'b')||{},c=countdownParts(m);return `<div class="middle-hero-match"><div class="middle-hero-head"><strong>المباراة القادمة</strong><small>${esc(m.round_name||m.stage||'الدور الأول')} · لم تبدأ بعد</small></div><div class="middle-hero-teams"><div class="middle-hero-team">${img(a.logo_url,a.name)}<b>${esc(a.name||'غير محدد')}</b></div><div><div class="middle-hero-vs">VS</div><div class="middle-hero-meta">${esc(fmt(m.match_date))}<br><b>${esc(String(m.match_time||'').slice(0,5))}</b><br>${esc(m.venue||'ملعب رضوان')}</div></div><div class="middle-hero-team">${img(b.logo_url,b.name)}<b>${esc(b.name||'غير محدد')}</b></div></div><div class="middle-countdown" data-countdown-match="${m.id}"><div><b>${String(c.d).padStart(2,'0')}</b><span>يوم</span></div><div><b>${String(c.h).padStart(2,'0')}</b><span>ساعة</span></div><div><b>${String(c.m).padStart(2,'0')}</b><span>دقيقة</span></div><div><b>${String(c.s).padStart(2,'0')}</b><span>ثانية</span></div></div><div class="middle-hero-actions"><button class="primary" data-middle-match="${m.id}">تفاصيل المباراة</button><button data-add-calendar="${m.id}">أضف إلى التقويم</button></div></div>`}
  function renderMiddleHome(){
    saveHome();const next=nextMatch();if($('#nextMatch'))$('#nextMatch').innerHTML=hero(next);if($('#upcoming')){$('#upcoming').className='middle-mini-scroll';$('#upcoming').innerHTML=M.matches.filter(m=>m.status==='قادمة'&&m.team_a_id&&m.team_b_id).sort((a,b)=>matchDT(a)-matchDT(b)).slice(0,5).map(m=>matchCard(m,true)).join('')}
    clearInterval(countdownTimer);countdownTimer=setInterval(()=>{if(M.active!=='الوسط'||!next)return;const box=$(`[data-countdown-match="${next.id}"]`);if(!box)return;const c=countdownParts(next),bs=box.querySelectorAll('b');[c.d,c.h,c.m,c.s].forEach((v,i)=>{if(bs[i])bs[i].textContent=String(v).padStart(2,'0')})},1000);
  }

  function showMiddleMatch(id){const m=M.matches.find(x=>x.id===id);if(!m)return;const an=sideName(m,'a'),bn=sideName(m,'b');const panel=$('#sheetPanel'),sheet=$('#sheet');if(!panel||!sheet)return;panel.innerHTML=`<div class="middle-sheet"><div class="sheet-head"><button data-middle-close>إغلاق</button></div>${matchCard(m)}<div class="card" style="margin-top:14px;padding:16px"><h2>${esc(an)} × ${esc(bn)}</h2><p>الفئة: الوسط</p><p>المرحلة: ${esc(m.round_name||m.stage||'غير محدد')}</p><p>التاريخ: ${esc(fmt(m.match_date))}</p><p>الوقت: ${esc(String(m.match_time||'').slice(0,5)||'غير محدد')}</p><p>الملعب: ${esc(m.venue||'ملعب رضوان')}</p>${m.status==='قادمة'?'<p><b>لم تبدأ بعد — لا توجد نتيجة أو إحصائيات مسجلة.</b></p>':''}</div></div>`;sheet.classList.add('show')}
  function showQualification(id){const q=M.quals.find(x=>x.id===id);if(!q)return;const panel=$('#sheetPanel'),sheet=$('#sheet');if(!panel||!sheet)return;panel.innerHTML=`<div class="middle-sheet"><div class="sheet-head"><button data-middle-close>إغلاق</button></div>${qualificationCard(q)}<div class="card" style="margin-top:14px;padding:16px"><h2>تأهل بالقرعة</h2><p>هذه بطاقة تأهل وليست مباراة، لذلك لا توجد نتيجة مسجلة لها.</p></div></div>`;sheet.classList.add('show')}
  function addCalendar(id){const m=M.matches.find(x=>x.id===id);if(!m?.match_date)return;const a=sideName(m,'a'),b=sideName(m,'b'),start=new Date(`${m.match_date}T${String(m.match_time||'17:00').slice(0,5)}:00Z`),end=new Date(start.getTime()+2*3600000),stamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Coupe Aghchorguit//AR','BEGIN:VEVENT',`DTSTART:${stamp(start)}`,`DTEND:${stamp(end)}`,`SUMMARY:${a} × ${b}`,`LOCATION:${m.venue||'ملعب رضوان'}`,'DESCRIPTION:بطولة الوسط - كأس أغشوركيت 2026','END:VEVENT','END:VCALENDAR'].join('\r\n');const link=document.createElement('a');link.href='data:text/calendar;charset=utf-8,'+encodeURIComponent(ics);link.download=`aghchorguit-${m.match_date}.ics`;document.body.appendChild(link);link.click();link.remove()}

  function renderForPage(){if(M.active!=='الوسط'||!M.loaded)return;const p=$('.page.active')?.id;if(p==='home')renderMiddleHome();if(p==='matches')renderMiddleMatches();if(p==='teams')renderMiddleTeams();}
  function scheduleReload(){clearTimeout(reloadTimer);reloadTimer=setTimeout(()=>loadMiddle().then(renderForPage),250)}
  function subscribe(){sb.channel('middle-championship-live').on('postgres_changes',{event:'*',schema:'public',table:'teams'},p=>{if(p.new?.category==='الوسط'||p.old?.category==='الوسط')scheduleReload()}).on('postgres_changes',{event:'*',schema:'public',table:'matches',filter:'category=eq.الوسط'},scheduleReload).on('postgres_changes',{event:'*',schema:'public',table:'qualification_events',filter:'category=eq.الوسط'},scheduleReload).subscribe()}

  document.addEventListener('click',e=>{
    const g=e.target.closest('[data-global-cat]');if(g){setCategory(g.dataset.globalCat);return}
    const legacy=e.target.closest('[data-matchcat],[data-teamcat],[data-tourcat]');if(legacy){const cat=legacy.dataset.matchcat||legacy.dataset.teamcat||legacy.dataset.tourcat;if(cat&&cat!=='الكل')setTimeout(()=>setCategory(cat,{sync:false}),0);return}
    const page=e.target.closest('[data-page]');if(page&&M.active==='الوسط')setTimeout(renderForPage,0);
    const f=e.target.closest('[data-middle-filter]');if(f){M.filter=f.dataset.middleFilter;renderMiddleMatches();return}
    const d=e.target.closest('[data-middle-date]');if(d){M.date=d.dataset.middleDate;renderMiddleMatches();return}
    const mm=e.target.closest('[data-middle-match]');if(mm){e.preventDefault();e.stopPropagation();showMiddleMatch(mm.dataset.middleMatch);return}
    const q=e.target.closest('[data-middle-qualification]');if(q){showQualification(q.dataset.middleQualification);return}
    const cal=e.target.closest('[data-add-calendar]');if(cal){addCalendar(cal.dataset.addCalendar);return}
    if(e.target.closest('[data-middle-close]')){$('#sheet')?.classList.remove('show');return}
  });
  $('#teamSearch')?.addEventListener('input',()=>{if(M.active==='الوسط')renderMiddleTeams()});
  window.addEventListener('pageshow',()=>{if(M.active==='الوسط')loadMiddle().then(renderForPage)});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&M.active==='الوسط')loadMiddle().then(renderForPage)});

  ensureBar();subscribe();setCategory(M.active,{sync:true});
})();
