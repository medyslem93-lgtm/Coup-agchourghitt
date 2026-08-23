/* Official data patch — 23 Aug 2026. No invented fixtures or statistics. */
Object.assign(logoMap,{
'القسام':'qassam.jpg','السديم':'sadim.jpg','سانتوس':'santos.jpg','السابع أكتوبر':'seventh_october.jpg','الشمال':'shamal.jpg','الطوفان':'toufan.jpg','البداع':'bidaa.jpg',
'القدس 1':'qods1.jpg','المحظرة':'mahdara.jpg','المرابطون':'morabitoun.jpg','النجوم':'al_noujoum.jpg','ملوك أغشورگيت':'molouk_aghchorguit.jpg','ملوك أغشوركيت':'molouk_aghchorguit.jpg','الإتحاد':'ittihad.jpg'
});
logoMap['الواد الغارك']='wadi_gharig.jpg'; logoMap['بغداد']='baghdad.jpg';

groups.A.splice(0,groups.A.length,'الشهيد الدكتور محمد الأمين محمد المصطفى','الهلال','الواد الغارك','بغداد');
seniorMatches.splice(0,seniorMatches.length,
 {cat:'الكبار',stage:'دوري المجموعات',date:'2026-08-22',time:'17:30',a:'الهلال',b:'الشهيد الدكتور محمد الأمين محمد المصطفى',group:'A',status:'UPCOMING'},
 {cat:'الكبار',stage:'دوري المجموعات',date:'2026-08-23',time:'17:30',a:'البلد الطيب',b:'بير البركة',group:'B',status:'UPCOMING'},
 {cat:'الكبار',stage:'دوري المجموعات',date:'2026-08-24',time:'17:30',a:'بوقبره',b:'نجوم لمدن',group:'C',status:'UPCOMING'}
);
middleMatches.splice(0,middleMatches.length);
smallMatches.splice(0,smallMatches.length,
 {cat:'الصغار',stage:'بطولة الصغار',a:'النجوم الجديدة',b:'الشمال',status:'FINISHED',scoreA:0,scoreB:9,events:[
  {type:'goal',team:'الشمال',player:'بال'},{type:'goal',team:'الشمال',player:'بال'},{type:'goal',team:'الشمال',player:'بال'},
  {type:'goal',team:'الشمال',player:'يوسف'},{type:'goal',team:'الشمال',player:'يوسف'},
  {type:'goal',team:'الشمال',player:'حمني'},{type:'goal',team:'الشمال',player:'حمني'},
  {type:'goal',team:'الشمال',player:'يحي'},{type:'own_goal',team:'الشمال',player:null},
  {type:'assist',team:'الشمال',player:'يوسف'},{type:'assist',team:'الشمال',player:'الشيخ'},{type:'assist',team:'الشمال',player:'الشيخ'},
  {type:'assist',team:'الشمال',player:'داه'},{type:'assist',team:'الشمال',player:'حمني'},{type:'assist',team:'الشمال',player:'يحي'}],motm:{player:'بال',team:'الشمال',position:'مهاجم'}},
 {cat:'الصغار',stage:'بطولة الصغار',a:'البداع',b:'دبي',status:'FINISHED',scoreA:1,scoreB:1,events:[{type:'goal',team:'البداع',player:'عباد أميني'},{type:'penalty_goal',team:'دبي',player:'محمد محمود'}],motm:{player:'محمد جدو',team:'البداع',position:'مدافع'}},
 {cat:'الصغار',stage:'بطولة الصغار',a:'القدس 2',b:'الحمد',status:'FINISHED',scoreA:0,scoreB:0,events:[{type:'yellow',player:'دمين حبيب الله'},{type:'yellow',player:'الداه ميلود'},{type:'yellow',player:'شكرود البار'},{type:'yellow',player:'داه أحمد'}],motm:{player:'سيدي مسكه'}},
 {cat:'الصغار',stage:'بطولة الصغار',a:'الكبة',b:'أغشوركيت',status:'FINISHED',scoreA:2,scoreB:0,events:[{type:'goal',team:'الكبة',player:'الشيخ المصطفى أحمد لعبيد'},{type:'goal',team:'الكبة',player:'الشيخ المصطفى أحمد لعبيد'},{type:'assist',team:'الكبة',player:'إسماعيل'},{type:'assist',team:'الكبة',player:'الداه أحمد لعبيدي'}],motm:{player:'الشيخ أحمد لعبيدي'}}
);

const originalOfficialOverrides=applyOfficialOverrides;
applyOfficialOverrides=function(){
 originalOfficialOverrides();
 D.الكبار=D.الكبار||{};
 delete D.الكبار['الواد الغارگ']; delete D.الكبار['نادي بغداد'];
};

fmtDate=function(d){return d?new Intl.DateTimeFormat('ar-MR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(d+'T12:00:00Z')):'غير متوفر'};
dt=function(m){return m?.date?new Date(`${m.date}T${m.time||'09:00'}:00Z`):new Date(8640000000000000)};
matchStatus=function(m){return m.status==='FINISHED'?'انتهت':m.status==='LIVE'?'مباشر':m.status==='POSTPONED'?'مؤجلة':m.status==='CANCELLED'?'ملغاة':'قادمة'};
card=function(m,compact=false){let mid=m.status==='FINISHED'?`<span class="score" dir="ltr">${m.scoreA} - ${m.scoreB}</span>`:'<span class="vs">VS</span>';return `<button class="card match-card ${compact?'compact':''}" onclick='openMatch(${JSON.stringify(m).replaceAll("'","&#39;")})'><div class="match-meta"><span>${m.stage}${m.group?' · المجموعة '+m.group:''}</span><span class="status ${m.status==='FINISHED'?'finished':''}"><i></i> ${matchStatus(m)}</span></div><div class="match-row"><div class="team"><img src="${logo(m.a)}" onerror="this.onerror=null;this.src='${fallback}'"><b>${m.a}</b></div><div>${mid}</div><div class="team"><img src="${logo(m.b)}" onerror="this.onerror=null;this.src='${fallback}'"><b>${m.b}</b></div></div><div class="match-footer"><span>${fmtDate(m.date)}</span><span>${m.time||'غير متوفر'}</span></div></button>`};
renderMatches=function(cat='الكبار'){let a=cat==='الكبار'?seniorMatches:cat==='الوسط'?middleMatches:smallMatches;matchesList.innerHTML=a.length?a.map(m=>`${m.date?`<div class="schedule-day">${fmtDate(m.date)}</div>`:''}${card(m)}`).join(''):'<div class="card empty"><b>لا توجد مباريات مسجلة</b><span>لن نضيف أي مباراة قبل تزويدنا ببياناتها الرسمية.</span></div>'};

function officialEventLabel(e){let t={goal:'هدف',penalty_goal:'هدف من ركلة جزاء',own_goal:'هدف عكسي',assist:'تمريرة حاسمة',yellow:'بطاقة صفراء',red:'بطاقة حمراء',sub:'تبديل'}[e.type]||e.type;return `<div class="event-row"><b>${t}</b><span>${e.player||'لا يُنسب للاعب'}${e.team?' · '+e.team:''}</span></div>`}
openMatch=function(m){let key='vote:'+(m.date||'nodate')+':'+m.a+':'+m.b,voted=localStorage.getItem(key),finished=m.status==='FINISHED',center=finished?`<span class="mc-score" dir="ltr">${m.scoreA} - ${m.scoreB}</span>`:'VS',events=(m.events||[]).filter(e=>e.type!=='assist'),assists=(m.events||[]).filter(e=>e.type==='assist');showSheet(`<div class="backrow"><button onclick="closeSheet()">إغلاق</button><button onclick="shareText('${m.a} × ${m.b}')">مشاركة</button></div><div class="mc-hero"><small style="color:var(--gold)">${m.stage}${m.group?' · المجموعة '+m.group:''}</small><div class="mc-teams"><div><img src="${logo(m.a)}"><b>${m.a}</b></div><div class="mc-vs">${center}</div><div><img src="${logo(m.b)}"><b>${m.b}</b></div></div><div class="mc-meta">${fmtDate(m.date)} · ${m.time||'غير متوفر'} · الملعب: غير متوفر · ${matchStatus(m)}</div></div><div class="tabs match-tabs"><button class="active" onclick="matchTab('overview',this)">نظرة عامة</button><button onclick="matchTab('lineups',this)">التشكيلات</button><button onclick="matchTab('events',this)">الأحداث</button><button onclick="matchTab('stats',this)">الإحصائيات</button></div><div id="mp-overview" class="match-pane active">${finished?`<div class="card empty"><b>النتيجة النهائية</b><span class="big-result" dir="ltr">${m.scoreA} - ${m.scoreB}</span>${m.motm?`<span>رجل المباراة: ${m.motm.player}${m.motm.team?' · '+m.motm.team:''}</span>`:''}</div>`:`<div class="card poll"><h3>من تتوقع أن يفوز؟</h3><div class="vote-row"><button ${voted?'disabled':''} onclick="vote('${key}','a')">${m.a}</button><button ${voted?'disabled':''} onclick="vote('${key}','d')">تعادل</button><button ${voted?'disabled':''} onclick="vote('${key}','b')">${m.b}</button></div><p>${voted?'تم حفظ توقعك على هذا الجهاز.':'التصويت لا يؤثر في أي إحصائية رسمية.'}</p></div>`}</div><div id="mp-lineups" class="match-pane"><div class="pitch"><div class="pitch-msg"><b>لم يتم تسجيل التشكيلة بعد.</b><small>لن يتم اختراع خطة أو مراكز أو أرقام.</small></div></div></div><div id="mp-events" class="match-pane">${events.length?`<div class="card event-list">${events.map(officialEventLabel).join('')}${assists.length?`<h3>التمريرات الحاسمة</h3>${assists.map(officialEventLabel).join('')}`:''}</div>`:'<div class="card empty"><b>لا توجد أحداث مسجلة</b><span>لن تُعرض أحداث غير حقيقية.</span></div>'}</div><div id="mp-stats" class="match-pane"><div class="card empty"><b>لا توجد إحصائيات مقارنة مسجلة</b><span>لن نعرض استحواذًا أو تسديدات أو ركنيات غير حقيقية.</span></div></div>`)};

function officialStatRows(type){let counts=new Map();smallMatches.forEach(m=>(m.events||[]).forEach(e=>{let ok=type==='scorers'?(e.type==='goal'||e.type==='penalty_goal'):type==='assists'?e.type==='assist':false;if(ok&&e.player){let k=e.player+'|||'+(e.team||'غير متوفر');counts.set(k,(counts.get(k)||0)+1)}}));return [...counts].map(([k,value])=>{let [player,team]=k.split('|||');return {player,team,value}}).sort((a,b)=>b.value-a.value||a.player.localeCompare(b.player,'ar'))}
openStat=function(type){let titles={scorers:'الهدافون',assists:'صانعو الألعاب',keeper:'أفضل حارس',motm:'رجال المباريات'},rows=type==='motm'?smallMatches.filter(m=>m.motm).map(m=>({player:m.motm.player,team:m.motm.team||'غير متوفر',value:1})):officialStatRows(type);showSheet(`<div class="backrow"><button onclick="closeSheet()">إغلاق</button></div><div class="page-title"><h1>${titles[type]}</h1><p>فئة الصغار · بيانات مسجلة فعليًا</p></div>${rows.length?`<div class="playerlist">${rows.map((r,i)=>`<div class="player"><div class="mini-avatar">${i+1}</div><div style="flex:1"><b>${r.player}</b><small>${r.team}</small></div><img src="${logo(r.team)}" onerror="this.style.display='none'" style="width:38px;height:38px;object-fit:contain;background:#fff;border-radius:10px;padding:2px"><b>${r.value}</b></div>`).join('')}</div>`:'<div class="card empty"><b>لا توجد بيانات حقيقية بعد</b><span>سيظهر الترتيب بعد تسجيل الأحداث الحقيقية.</span></div>'}`)};

if(Array.isArray(news)){news.splice(0,news.length,{id:'launch',date:'22 أغسطس 2026',title:'انطلاق بطولة كأس أغشوركيت 2026 يوم 22 أغسطس',desc:'تنطلق فعاليات البطولة الرياضية وفق الإعلان الرسمي للجنة المنظمة.',img:'assets/tournament.jpg'})}

setTimeout(()=>{try{renderGroups();renderStandings();renderMatches();renderHome();renderNews();}catch(e){console.error(e)}},0);
