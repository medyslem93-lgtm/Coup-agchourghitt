(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG;if(!cfg||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const SESSION_KEY='agh_prediction_session_v1';
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const img=(u,a='')=>`<img src="${esc(u||'assets/tournament.jpg')}" alt="${esc(a)}" onerror="this.onerror=null;this.src='assets/tournament.jpg'">`;
  const token=()=>localStorage.getItem(SESSION_KEY)||'';
  const setToken=v=>{if(v)localStorage.setItem(SESSION_KEY,String(v))};
  const fmtDate=d=>{try{return new Intl.DateTimeFormat('ar-MR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(d+'T12:00:00Z'))}catch{return d||''}};
  const normalizePhone=v=>{let s=String(v||'').replace(/\D/g,'');if(s.startsWith('222')&&s.length===11)s=s.slice(3);return s};
  const startAt=m=>m?.match_date&&m?.match_time?new Date(`${m.match_date}T${String(m.match_time).slice(0,8)}Z`):null;
  const eligible=m=>['الكبار','الوسط'].includes(m?.category);
  const errorText=e=>{const s=String(e?.message||e||'');if(s.includes('USER_SESSION_REQUIRED'))return'هذا الرقم مسجل سابقًا على جهاز آخر. استخدم نفس الجهاز الذي سجلت منه أول مرة.';if(s.includes('PREDICTIONS_CLOSED'))return'انتهى وقت التوقع لهذه المباراة 🔒';if(s.includes('INVALID_PHONE'))return'أدخل رقم هاتف موريتاني صحيحًا من 8 أرقام.';if(s.includes('INVALID_NAME'))return'أدخل اسمك الكامل.';if(s.includes('INVALID_SCORE'))return'أدخل نتيجة صحيحة للفريقين.';if(s.includes('INVALID_PLAYER'))return'اختيار اللاعب غير صالح لهذه المباراة.';return'تعذر حفظ التوقع. حاول مرة أخرى.'};
  let matches=new Map(),pendingId=null,current=null,autoOpen=null,busy=false,countdownTimer=null;

  async function loadMatches(){
    const {data}=await sb.from('matches').select('id,category,status,match_date,match_time,team_a_id,team_b_id').in('category',['الكبار','الوسط']);
    matches=new Map((data||[]).map(m=>[m.id,m]));enhanceCards();
  }

  function enhanceCards(){
    document.querySelectorAll('[data-open-match]').forEach(card=>{
      const id=card.dataset.openMatch,m=matches.get(id);if(!m||!eligible(m)||card.querySelector('[data-prediction-cta]'))return;
      if(m.status==='انتهت')return;
      const c=document.createElement('span');c.dataset.predictionCta='1';c.className='prediction-card-cta '+(m.status==='قادمة'?'open':'locked');c.textContent=m.status==='قادمة'?'✨ توقع المباراة واكسب النقاط':'🔒 انتهى وقت التوقع';c.setAttribute('role','button');c.tabIndex=0;
      c.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();autoOpen=id;pendingId=id;card.click();setTimeout(tryAutoOpen,120)});
      card.appendChild(c);
    });
  }

  document.addEventListener('click',e=>{
    const card=e.target.closest('[data-open-match]');if(card)pendingId=card.dataset.openMatch;
    const normal=e.target.closest('[data-v2-pane]');if(normal){document.getElementById('v2-predictions')?.classList.remove('active');document.querySelector('[data-pred-pane]')?.classList.remove('active')}
    const pred=e.target.closest('[data-pred-pane]');if(!pred)return;
    e.preventDefault();document.querySelectorAll('[data-v2-pane]').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.pane').forEach(x=>x.classList.remove('active'));pred.classList.add('active');document.getElementById('v2-predictions')?.classList.add('active');if(current)renderPrediction(current);
  },true);

  const observer=new MutationObserver(()=>{enhanceCards();enhanceSheet();tryAutoOpen()});
  const watch=()=>{observer.observe(document.body,{childList:true,subtree:true});enhanceSheet()};

  async function enhanceSheet(){
    if(busy||!pendingId)return;const panel=document.getElementById('sheetPanel');if(!panel?.querySelector('.match-detail')||panel.querySelector('[data-pred-pane]'))return;busy=true;
    try{
      const {data:m,error}=await sb.from('matches').select('*,team_a:teams!matches_team_a_id_fkey(id,name,logo_url),team_b:teams!matches_team_b_id_fkey(id,name,logo_url)').eq('id',pendingId).single();
      if(error||!m||!eligible(m))return;current=m;
      const tabs=panel.querySelector('.detail-tabs');if(!tabs)return;const btn=document.createElement('button');btn.setAttribute('data-pred-pane','');btn.innerHTML='التوقعات <span aria-hidden="true">🏆</span>';tabs.appendChild(btn);
      const pane=document.createElement('div');pane.id='v2-predictions';pane.className='pane';pane.innerHTML='<div class="pred-skeleton"></div>';panel.appendChild(pane);
      tryAutoOpen();
    }finally{busy=false}
  }

  function tryAutoOpen(){if(!autoOpen||!current||current.id!==autoOpen)return;const b=document.querySelector('[data-pred-pane]');if(b){autoOpen=null;b.click()}}

  function statusLabel(m,ctx){if(m.status==='انتهت')return'انتهت';if(m.status==='مباشر')return'بدأت';return ctx?.open?'قادمة':'مغلقة'}
  function header(m,ctx){return `<div class="pred-hero"><div class="pred-stadium"></div><div class="pred-hero-top"><span class="pred-chip">${esc(m.stage||'كأس أغشوركيت 2026')}${m.group_name?' · المجموعة '+esc(m.group_name):''}</span><span class="pred-state ${m.status==='مباشر'?'live':''}">${statusLabel(m,ctx)}</span></div><div class="pred-matchup"><div>${img(m.team_a?.logo_url,m.team_a?.name)}<b>${esc(m.team_a?.name||m.team_a_placeholder||'لم يتحدد')}</b></div><strong>×</strong><div>${img(m.team_b?.logo_url,m.team_b?.name)}<b>${esc(m.team_b?.name||m.team_b_placeholder||'لم يتحدد')}</b></div></div><div class="pred-meta"><span>📅 ${esc(fmtDate(m.match_date))}</span><span>⏰ ${esc(String(m.match_time||'').slice(0,5)||'—')}</span><span>📍 ${esc(m.venue||'الملعب غير محدد')}</span><span>👥 ${Number(ctx?.total||0)} مشارك</span></div></div>`}

  function countdown(deadline){if(!deadline)return'';return `<section class="countdown-card"><h3>🔥 يوم المباراة يقترب!</h3><p>المباراة تبدأ بعد</p><div class="countdown" data-countdown="${esc(deadline)}"><span><b data-d>0</b><small>يوم</small></span><span><b data-h>00</b><small>ساعة</small></span><span><b data-m>00</b><small>دقيقة</small></span><span><b data-s>00</b><small>ثانية</small></span></div></section>`}
  function runCountdown(){clearInterval(countdownTimer);const box=document.querySelector('[data-countdown]');if(!box)return;const end=new Date(box.dataset.countdown).getTime();let reloaded=false;const tick=()=>{const diff=Math.max(0,end-Date.now()),d=Math.floor(diff/86400000),h=Math.floor(diff%86400000/3600000),m=Math.floor(diff%3600000/60000),s=Math.floor(diff%60000/1000);box.querySelector('[data-d]').textContent=d;box.querySelector('[data-h]').textContent=String(h).padStart(2,'0');box.querySelector('[data-m]').textContent=String(m).padStart(2,'0');box.querySelector('[data-s]').textContent=String(s).padStart(2,'0');if(diff<=0&&!reloaded){reloaded=true;clearInterval(countdownTimer);setTimeout(()=>current&&renderPrediction(current),400)}};tick();countdownTimer=setInterval(tick,1000)}

  async function playerOptions(m,enabled){if(!enabled||!m.team_a_id||!m.team_b_id)return[];const {data}=await sb.from('players').select('id,name,number,photo_url,team_id').in('team_id',[m.team_a_id,m.team_b_id]).order('name');return data||[]}
  const optionList=(players,value)=>`<option value="">— اختر لاعبًا —</option>${players.map(p=>`<option value="${p.id}" ${value===p.id?'selected':''}>${esc(p.name)}${p.number!=null?' · #'+p.number:''}</option>`).join('')}`;
  function stepper(team,value,key){return `<div class="score-team">${img(team.logo_url,team.name)}<b>${esc(team.name)}</b><div class="score-stepper"><button type="button" data-step="${key}" data-dir="-1">−</button><input id="${key}" readonly inputmode="numeric" value="${Number(value||0)}"><button type="button" data-step="${key}" data-dir="1">+</button></div></div>`}
  function pointsInfo(settings){const p=settings||{};return `<section class="points-info"><h3>كيف تحتسب النقاط؟</h3><div><span>النتيجة الدقيقة الصحيحة</span><b>+${p.exactScore??100}</b></div><div><span>الفائز الصحيح / التعادل الصحيح</span><b>+${p.winner??50}</b></div><div><span>الهداف الصحيح</span><b>+${p.scorer??50}</b></div><div><span>صانع الهدف الصحيح</span><b>+${p.assist??40}</b></div><div><span>أفضل لاعب</span><b>+${p.motm??75}</b></div><div><span>مكافأة التوقع الكامل</span><b>+${p.fullBonus??100}</b></div></section>`}

  async function renderPrediction(m){
    const pane=document.getElementById('v2-predictions');if(!pane)return;pane.innerHTML='<div class="pred-skeleton"></div>';
    const {data:ctx,error}=await sb.rpc('get_prediction_match_context',{p_match_id:m.id,p_session_token:token()||null});if(error){pane.innerHTML='<div class="pred-empty">تعذر تحميل نظام التوقعات.</div>';return}
    const players=await playerOptions(m,ctx.playerPredictionsEnabled);const pred=ctx.prediction||{},user=ctx.user||null;
    let body='';
    if(ctx.finished){
      const actual=ctx.actualScore||{},b=ctx.breakdown||{};
      body=`<section class="prediction-result"><h2>نتيجة توقعك</h2>${pred.id?`<div class="result-compare"><span>توقعك <b dir="ltr">${pred.a} - ${pred.b}</b></span><span>النتيجة الفعلية <b dir="ltr">${actual.a??'—'} - ${actual.b??'—'}</b></span></div><div class="earned">حصلت على <strong>${pred.points||0}</strong> نقطة</div><div class="breakdown"><span class="${b.winner?'ok':'no'}">${b.winner?'✅':'❌'} الفائز الصحيح <b>+${b.winner||0}</b></span><span class="${b.exactScore?'ok':'no'}">${b.exactScore?'✅':'❌'} النتيجة الدقيقة <b>+${b.exactScore||0}</b></span>${ctx.playerPredictionsEnabled?`<span class="${b.scorer?'ok':'no'}">${b.scorer?'✅':'❌'} الهداف <b>+${b.scorer||0}</b></span><span class="${b.assist?'ok':'no'}">${b.assist?'✅':'❌'} صانع الهدف <b>+${b.assist||0}</b></span><span class="${b.motm?'ok':'no'}">${b.motm?'✅':'❌'} أفضل لاعب <b>+${b.motm||0}</b></span>`:''}${b.bonus?`<span class="ok">✨ مكافأة التوقع الكامل <b>+${b.bonus}</b></span>`:''}</div>`:'<div class="pred-empty">لم تسجل توقعًا لهذه المباراة.</div>'}</section><section class="winners"><h2>أصحاب التوقعات الصحيحة 🏆</h2>${(ctx.winners||[]).length?(ctx.winners||[]).map((w,i)=>`<div class="winner-row"><span>${i<3?'🏆':'✓'}</span><b>${esc(w.name)}</b><strong dir="ltr">${w.predictionA} - ${w.predictionB}</strong></div>`).join(''):'<div class="pred-empty">لم يتمكن أي مشارك من توقع النتيجة الصحيحة لهذه المباراة.</div>'}</section>`;
    }else if(!ctx.open){
      body=`<section class="pred-locked"><span>🔒</span><h2>تم إغلاق التوقعات لهذه المباراة</h2><p>سيتم إعلان النقاط وأصحاب التوقعات الصحيحة بعد نهاية المباراة.</p>${pred.id?`<div class="saved-pred">توقعك المحفوظ: <b dir="ltr">${pred.a} - ${pred.b}</b></div>`:''}</section>`;
    }else{
      body=`${countdown(ctx.deadline)}<section class="prediction-box"><div class="prediction-title"><span>+100 نقطة</span><div><h2>توقع النتيجة</h2><p>توقع النتيجة الصحيحة واربح النقاط</p></div></div>${user?`<div class="known-user"><span>👤</span><div><b>${esc(user.name)}</b><small>${user.totalPoints||0} نقطة</small></div></div>`:`<div class="identity-fields"><label>الاسم الكامل<input id="predName" maxlength="120" placeholder="أدخل اسمك الكامل"></label><label>رقم الهاتف<input id="predPhone" type="tel" inputmode="tel" maxlength="16" placeholder="أدخل رقم هاتفك"></label></div>`}<div class="score-picker">${stepper(m.team_a,pred.a??0,'predA')}<strong>—</strong>${stepper(m.team_b,pred.b??0,'predB')}</div>${ctx.playerPredictionsEnabled&&players.length?`<div class="player-predictions"><h3>توقعات اللاعبين</h3><label>الهداف المتوقع<select id="predScorer">${optionList(players,pred.scorerId)}</select></label><label>صانع الهدف المتوقع<select id="predAssist">${optionList(players,pred.assistId)}</select></label><label>أفضل لاعب في المباراة<select id="predMotm">${optionList(players,pred.motmId)}</select></label></div>`:''}<button id="savePrediction" class="save-prediction">${pred.id?'تحديث التوقع':'حفظ التوقع'}</button><div id="predMessage" class="pred-message"></div></section>${pointsInfo(ctx.pointsSettings)}`;
    }
    pane.innerHTML=header(m,ctx)+body;
    pane.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{const input=document.getElementById(b.dataset.step),next=Math.max(0,Math.min(30,Number(input.value||0)+Number(b.dataset.dir)));input.value=next;input.classList.remove('pulse');requestAnimationFrame(()=>input.classList.add('pulse'))});
    document.getElementById('savePrediction')?.addEventListener('click',()=>save(m,ctx));
    runCountdown();
  }

  async function save(m,ctx){
    const btn=document.getElementById('savePrediction'),msg=document.getElementById('predMessage');if(!btn||!msg)return;
    const name=document.getElementById('predName')?.value.trim()||null,phone=document.getElementById('predPhone')?normalizePhone(document.getElementById('predPhone').value):null;
    if(!ctx.user&&(!name||name.length<2)){msg.textContent='أدخل اسمك الكامل.';msg.className='pred-message error';return}
    if(!ctx.user&&!/^\d{8}$/.test(phone||'')){msg.textContent='أدخل رقم هاتف موريتاني صحيحًا من 8 أرقام.';msg.className='pred-message error';return}
    btn.disabled=true;btn.textContent='جارٍ الحفظ...';
    const args={p_match_id:m.id,p_prediction_a:Number(document.getElementById('predA').value),p_prediction_b:Number(document.getElementById('predB').value),p_user_name:name,p_phone:phone,p_session_token:token()||null,p_scorer_id:document.getElementById('predScorer')?.value||null,p_assist_id:document.getElementById('predAssist')?.value||null,p_motm_id:document.getElementById('predMotm')?.value||null};
    const {data,error}=await sb.rpc('save_match_prediction',args);if(error){msg.textContent=errorText(error);msg.className='pred-message error';btn.disabled=false;btn.textContent=ctx.prediction?'تحديث التوقع':'حفظ التوقع';return}
    setToken(data?.sessionToken);msg.textContent=data?.updated?'✅ تم تحديث توقعك بنجاح':'✅ تم حفظ توقعك بنجاح';msg.className='pred-message success';btn.textContent=data?.updated?'تم التحديث ✓':'تم الحفظ ✓';setTimeout(()=>renderPrediction(m),700);
  }

  async function renderLeaderboard(mode='points'){
    const host=document.getElementById('predictionLeaderboard');if(!host)return;host.innerHTML='<div class="pred-skeleton"></div>';
    const {data,error}=await sb.rpc('get_prediction_leaderboard',{p_session_token:token()||null,p_limit:100});if(error){host.innerHTML='<div class="pred-empty">تعذر تحميل لوحة الشرف.</div>';return}
    const rows=[...(data?.rows||[])];if(mode==='attendance')rows.sort((a,b)=>(b.attendance||0)-(a.attendance||0)||(a.rank||999)-(b.rank||999));const current=data?.current;
    host.innerHTML=`<div class="leader-tabs"><button data-leader-mode="points" class="${mode==='points'?'active':''}">النقاط</button><button data-leader-mode="attendance" class="${mode==='attendance'?'active':''}">الحضور</button></div>${current?`<div class="my-rank"><span>ترتيبك الحالي</span><b>#${current.rank}</b><strong>${mode==='points'?current.points+' نقطة':current.attendance+' حضور'}</strong></div>`:''}<div class="leader-list">${rows.length?rows.map((r,i)=>`<div class="leader-row top-${i+1}"><span class="rank">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(mode==='points'?r.rank:i+1)}</span><div class="leader-avatar">${r.avatar?img(r.avatar,r.name):'👤'}</div><div><b>${esc(r.name)}</b><small>${r.matches||0} مباراة · ${r.exactScores||0} نتيجة دقيقة</small></div><strong>${mode==='points'?(r.points||0)+' نقطة':(r.attendance||0)+' حضور'}</strong></div>`).join(''):`<div class="pred-empty">${mode==='attendance'?'تم تجهيز نظام الحضور، ولا توجد تسجيلات حضور بعد.':'لا توجد مشاركات حتى الآن.'}</div>`}</div>`;
    host.querySelectorAll('[data-leader-mode]').forEach(b=>b.onclick=()=>renderLeaderboard(b.dataset.leaderMode));
  }

  function initLeaderboardPage(){const btn=document.getElementById('openLeaderboard');if(btn)btn.onclick=()=>{if(window.go)window.go('leaderboard');renderLeaderboard()};document.addEventListener('click',e=>{if(e.target.closest('[data-page="leaderboard"]'))renderLeaderboard()})}

  window.PREDICTIONS={renderLeaderboard,openMatchPrediction:id=>{const card=document.querySelector(`[data-open-match="${CSS.escape(id)}"]`);if(card){autoOpen=id;pendingId=id;card.click()}}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{watch();loadMatches();initLeaderboardPage()});else{watch();loadMatches();initLeaderboardPage()}
})();