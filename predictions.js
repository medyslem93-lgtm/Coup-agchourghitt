(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG;
  if(!cfg||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let pendingMatchId=null,currentMatch=null,observerBusy=false;
  const fmtDate=d=>{try{return new Intl.DateTimeFormat('ar-MR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(d+'T12:00:00Z'))}catch{return d||''}};
  const img=(u,a='')=>`<img src="${esc(u||'assets/tournament.jpg')}" alt="${esc(a)}" onerror="this.onerror=null;this.src='assets/tournament.jpg'">`;
  const startAt=m=>m.match_date&&m.match_time?new Date(`${m.match_date}T${String(m.match_time).slice(0,8)}Z`):null;
  const isOpen=m=>m.category&&['الكبار','الوسط'].includes(m.category)&&m.status==='قادمة'&&startAt(m)&&Date.now()<startAt(m).getTime();
  const normalizePhone=v=>{let s=String(v||'').replace(/\D/g,'');if(s.startsWith('222')&&s.length===11)s=s.slice(3);return s};
  const msgFromError=e=>{const s=String(e?.message||e||'');if(s.includes('DUPLICATE_PREDICTION'))return'لقد قمت بإرسال توقعك لهذه المباراة مسبقًا.';if(s.includes('PREDICTIONS_CLOSED'))return'تم إغلاق التوقعات لهذه المباراة 🔒';if(s.includes('INVALID_PHONE'))return'أدخل رقم هاتف موريتاني صحيحًا من 8 أرقام.';if(s.includes('INVALID_NAME'))return'أدخل اسمك الكامل.';if(s.includes('INVALID_SCORE'))return'أدخل نتيجة صحيحة للفريقين.';return'تعذر إرسال التوقع. حاول مرة أخرى.'};

  document.addEventListener('click',e=>{
    const card=e.target.closest('[data-open-match]');
    if(card)pendingMatchId=card.dataset.openMatch;
    const normal=e.target.closest('[data-v2-pane]');
    if(normal){document.getElementById('v2-predictions')?.classList.remove('active');document.querySelector('[data-pred-pane]')?.classList.remove('active');}
    const pred=e.target.closest('[data-pred-pane]');
    if(pred){
      e.preventDefault();
      document.querySelectorAll('[data-v2-pane]').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.pane').forEach(x=>x.classList.remove('active'));
      pred.classList.add('active');
      const pane=document.getElementById('v2-predictions');if(pane)pane.classList.add('active');
      if(currentMatch)renderPrediction(currentMatch);
    }
  },true);

  const obs=new MutationObserver(()=>enhanceSheet());
  const watch=()=>{const panel=document.getElementById('sheetPanel');if(panel)obs.observe(panel,{childList:true,subtree:true});else setTimeout(watch,200)};watch();

  async function enhanceSheet(){
    if(observerBusy||!pendingMatchId)return;
    const panel=document.getElementById('sheetPanel');
    if(!panel?.querySelector('.match-detail')||panel.querySelector('[data-pred-pane]'))return;
    observerBusy=true;
    try{
      const {data:m,error}=await sb.from('matches').select('*,team_a:teams!matches_team_a_id_fkey(id,name,logo_url),team_b:teams!matches_team_b_id_fkey(id,name,logo_url)').eq('id',pendingMatchId).single();
      if(error||!m||!['الكبار','الوسط'].includes(m.category))return;
      currentMatch=m;
      const tabs=panel.querySelector('.detail-tabs');if(!tabs)return;
      const b=document.createElement('button');b.setAttribute('data-pred-pane','');b.textContent='التوقعات 🏆';tabs.appendChild(b);
      const pane=document.createElement('div');pane.id='v2-predictions';pane.className='pane';pane.innerHTML='<div class="pred-loading">جارٍ تحميل التوقعات...</div>';panel.appendChild(pane);
    }finally{observerBusy=false}
  }

  async function renderPrediction(m){
    const pane=document.getElementById('v2-predictions');if(!pane)return;
    const {data:pub,error}=await sb.rpc('get_match_prediction_public',{p_match_id:m.id});
    if(error){pane.innerHTML='<div class="pred-state"><b>تعذر تحميل التوقعات</b><span>حاول مرة أخرى.</span></div>';return}
    const total=Number(pub?.total||0),finished=!!pub?.finished,winners=Array.isArray(pub?.winners)?pub.winners:[];
    const head=`<div class="pred-card"><div class="pred-match-head"><div class="pred-team">${img(m.team_a?.logo_url,m.team_a?.name)}<b>${esc(m.team_a?.name||'الفريق الأول')}</b></div><div class="pred-vs"><strong>VS</strong><span>${esc(fmtDate(m.match_date))}</span><small>${esc(String(m.match_time||'').slice(0,5))}</small></div><div class="pred-team">${img(m.team_b?.logo_url,m.team_b?.name)}<b>${esc(m.team_b?.name||'الفريق الثاني')}</b></div></div>`;
    if(finished){
      pane.innerHTML=head+`<div class="pred-title"><span>🏆</span><h3>أصحاب التوقعات الصحيحة</h3><p>تمت مقارنة جميع التوقعات بالنتيجة النهائية تلقائيًا.</p></div>${winners.length?`<div class="winner-list">${winners.map(w=>`<div class="winner"><span>🏆</span><div><b>${esc(w.name)}</b><small>التوقع: <strong dir="ltr">${w.predictionA} - ${w.predictionB}</strong></small></div></div>`).join('')}</div>`:'<div class="pred-closed">لم يتمكن أي مشارك من توقع النتيجة الصحيحة لهذه المباراة.</div>'}<div class="pred-total">إجمالي المشاركات: <b>${total}</b></div></div>`;return;
    }
    if(!isOpen(m)){
      pane.innerHTML=head+`<div class="pred-title"><span>🔒</span><h3>تم إغلاق التوقعات لهذه المباراة</h3><p>سيتم إعلان أصحاب التوقعات الصحيحة بعد نهاية المباراة.</p></div><div class="pred-total">إجمالي المشاركات: <b>${total}</b></div></div>`;return;
    }
    pane.innerHTML=head+`<div class="pred-title"><span>🏆</span><h3>توقع النتيجة واربح التحدي</h3><p>اكتب معلوماتك وتوقع النتيجة النهائية للمباراة قبل انطلاقها.</p></div><form id="predictionForm" class="pred-form" novalidate><div class="pred-fields"><label><span>الاسم الكامل</span><input id="predName" autocomplete="name" maxlength="120" placeholder="أدخل اسمك الكامل"></label><label><span>رقم الهاتف</span><input id="predPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="16" placeholder="أدخل رقم هاتفك"></label></div><div class="score-pick"><div>${img(m.team_a?.logo_url,m.team_a?.name)}<b>${esc(m.team_a?.name||'')}</b><input id="predA" type="number" inputmode="numeric" min="0" max="30" placeholder="0"></div><span>—</span><div>${img(m.team_b?.logo_url,m.team_b?.name)}<b>${esc(m.team_b?.name||'')}</b><input id="predB" type="number" inputmode="numeric" min="0" max="30" placeholder="0"></div></div><button class="pred-submit" type="submit">إرسال التوقع ⚽</button><div id="predMsg" class="pred-msg" aria-live="polite"></div></form><div class="pred-total">تم تسجيل <b>${total}</b> توقع حتى الآن</div></div>`;
    document.getElementById('predictionForm')?.addEventListener('submit',e=>submitPrediction(e,m));
  }

  async function submitPrediction(e,m){
    e.preventDefault();
    const name=document.getElementById('predName')?.value.trim()||'',phoneRaw=document.getElementById('predPhone')?.value||'',phone=normalizePhone(phoneRaw),a=document.getElementById('predA')?.value,b=document.getElementById('predB')?.value,msg=document.getElementById('predMsg'),btn=e.currentTarget.querySelector('button[type="submit"]');
    const fail=t=>{msg.textContent=t;msg.className='pred-msg error'};
    if(name.length<2)return fail('أدخل اسمك الكامل.');
    if(!/^\d{8}$/.test(phone))return fail('أدخل رقم هاتف موريتاني صحيحًا من 8 أرقام.');
    if(a===''||b===''||+a<0||+b<0)return fail('أدخل نتيجة للفريقين.');
    if(!isOpen(m))return fail('تم إغلاق التوقعات لهذه المباراة 🔒');
    btn.disabled=true;btn.textContent='جارٍ إرسال التوقع...';
    const {error}=await sb.rpc('submit_match_prediction',{p_match_id:m.id,p_user_name:name,p_phone:phone,p_prediction_a:+a,p_prediction_b:+b});
    if(error){fail(msgFromError(error));btn.disabled=false;btn.textContent='إرسال التوقع ⚽';return}
    e.currentTarget.innerHTML='<div class="pred-success"><span>✅</span><b>تم تسجيل توقعك بنجاح</b><p>بالتوفيق في تحدي توقعات كأس أغشوركيت 🏆</p></div>';
  }
})();