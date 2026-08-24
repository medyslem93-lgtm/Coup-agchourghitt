(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG;if(!cfg||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const normImg=u=>!u?'assets/tournament.jpg':/^(https?:|data:|blob:)/i.test(u)?u:String(u).replace(/^\.\.\//,'').replace(/^\.\//,'');
  const img=(u,a='')=>`<img src="${esc(normImg(u))}" alt="${esc(a)}" onerror="this.onerror=null;this.src='assets/tournament.jpg'">`;
  const fmtDate=d=>{try{return new Intl.DateTimeFormat('ar-MR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(d+'T12:00:00Z'))}catch{return d||''}};
  const startAt=m=>m.match_date&&m.match_time?new Date(`${m.match_date}T${String(m.match_time).slice(0,8)}Z`):null;
  const hasTeams=m=>!!(m.team_a_id&&m.team_b_id&&m.team_a&&m.team_b);
  const isOpen=m=>['الكبار','الوسط'].includes(m.category)&&hasTeams(m)&&m.status==='قادمة'&&startAt(m)&&Date.now()<startAt(m).getTime();
  const normalizePhone=v=>{let s=String(v||'').replace(/\D/g,'');if(s.startsWith('222')&&s.length===11)s=s.slice(3);return s};
  const errorText=e=>{const s=String(e?.message||e||'');if(s.includes('DUPLICATE_PREDICTION'))return'لقد قمت بإرسال توقعك لهذه المباراة مسبقًا.';if(s.includes('PREDICTIONS_CLOSED'))return'تم إغلاق التوقعات لهذه المباراة 🔒';if(s.includes('PREDICTIONS_NOT_AVAILABLE'))return'سيفتح التوقع بعد تحديد الفريقين رسميًا.';if(s.includes('INVALID_PHONE'))return'أدخل رقم هاتف موريتاني صحيحًا من 8 أرقام.';if(s.includes('INVALID_NAME'))return'أدخل اسمك الكامل.';if(s.includes('INVALID_SCORE'))return'أدخل نتيجة صحيحة للفريقين.';return'تعذر إرسال التوقع. حاول مرة أخرى.'};
  let pendingId=null,current=null,busy=false;

  document.addEventListener('click',e=>{
    const card=e.target.closest('[data-open-match]');if(card)pendingId=card.dataset.openMatch;
    const regular=e.target.closest('[data-v2-pane]');if(regular){document.getElementById('v2-predictions')?.classList.remove('active');document.querySelector('[data-pred-pane]')?.classList.remove('active')}
    const pred=e.target.closest('[data-pred-pane]');if(!pred)return;
    e.preventDefault();document.querySelectorAll('[data-v2-pane]').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.pane').forEach(x=>x.classList.remove('active'));pred.classList.add('active');document.getElementById('v2-predictions')?.classList.add('active');if(current)render(current);
  },true);

  const observer=new MutationObserver(()=>enhance());
  const startWatch=()=>{const p=document.getElementById('sheetPanel');if(p)observer.observe(p,{childList:true,subtree:true});else setTimeout(startWatch,200)};startWatch();

  async function enhance(){
    if(busy||!pendingId)return;const panel=document.getElementById('sheetPanel');if(!panel?.querySelector('.match-detail')||panel.querySelector('[data-pred-pane]'))return;busy=true;
    try{const {data:m,error}=await sb.from('matches').select('*,team_a:teams!matches_team_a_id_fkey(id,name,logo_url),team_b:teams!matches_team_b_id_fkey(id,name,logo_url)').eq('id',pendingId).single();if(error||!m||!['الكبار','الوسط'].includes(m.category))return;current=m;const tabs=panel.querySelector('.detail-tabs');if(!tabs)return;const btn=document.createElement('button');btn.setAttribute('data-pred-pane','');btn.innerHTML='التوقعات <span aria-hidden="true">🏆</span>';tabs.appendChild(btn);const pane=document.createElement('div');pane.id='v2-predictions';pane.className='pane';pane.innerHTML='<div class="pred-loading">جارٍ تحميل التوقعات...</div>';panel.appendChild(pane)}finally{busy=false}
  }

  const header=m=>`<div class="pred-card"><div class="pred-match-head"><div class="pred-team">${img(m.team_a?.logo_url,m.team_a?.name)}<b>${esc(m.team_a?.name||m.team_a_placeholder||'لم يتحدد بعد')}</b></div><div class="pred-vs"><strong>VS</strong><em class="pred-status ${m.status==='مباشر'?'live':''}">${esc(m.status||'قادمة')}</em><span>${esc(fmtDate(m.match_date))}</span><small>${esc(String(m.match_time||'').slice(0,5)||'الوقت غير محدد')}</small></div><div class="pred-team">${img(m.team_b?.logo_url,m.team_b?.name)}<b>${esc(m.team_b?.name||m.team_b_placeholder||'لم يتحدد بعد')}</b></div></div>`;

  async function render(m){
    const pane=document.getElementById('v2-predictions');if(!pane)return;pane.innerHTML='<div class="pred-loading">جارٍ تحميل التوقعات...</div>';
    const {data:pub,error}=await sb.rpc('get_match_prediction_public',{p_match_id:m.id});if(error){pane.innerHTML='<div class="pred-state"><b>تعذر تحميل التوقعات</b><span>حاول مرة أخرى.</span></div>';return}
    const total=Number(pub?.total||0),finished=!!pub?.finished,winners=Array.isArray(pub?.winners)?pub.winners:[];
    if(!hasTeams(m)&&!finished){pane.innerHTML=header(m)+`<div class="pred-title"><span>⏳</span><h3>التوقع سيفتح بعد تحديد الفريقين</h3><p>سيظهر نموذج التوقع تلقائيًا فور اعتماد طرفي المباراة رسميًا.</p></div></div>`;return}
    if(finished){pane.innerHTML=header(m)+`<div class="pred-title"><span>🏆</span><h3>أصحاب التوقعات الصحيحة</h3><p>تمت مقارنة جميع التوقعات بالنتيجة النهائية تلقائيًا.</p></div>${winners.length?`<div class="winner-list">${winners.map(w=>`<div class="winner"><span>🏆</span><div><b>${esc(w.name)}</b><small>التوقع: <strong dir="ltr">${w.predictionA} - ${w.predictionB}</strong></small></div></div>`).join('')}</div>`:'<div class="pred-closed">لم يتمكن أي مشارك من توقع النتيجة الصحيحة لهذه المباراة.</div>'}<div class="pred-total">إجمالي المشاركات: <b>${total}</b></div></div>`;return}
    if(!isOpen(m)){pane.innerHTML=header(m)+`<div class="pred-title"><span>🔒</span><h3>تم إغلاق التوقعات لهذه المباراة</h3><p>سيتم إعلان أصحاب التوقعات الصحيحة بعد نهاية المباراة.</p></div><div class="pred-total">إجمالي المشاركات: <b>${total}</b></div></div>`;return}
    pane.innerHTML=header(m)+`<div class="pred-title"><span>🏆</span><h3>توقع النتيجة واربح التحدي</h3><p>اكتب معلوماتك وتوقع النتيجة النهائية للمباراة قبل انطلاقها.</p></div><form id="predictionForm" class="pred-form" novalidate><div class="pred-fields"><label><span>الاسم الكامل</span><input id="predName" autocomplete="name" maxlength="120" placeholder="أدخل اسمك الكامل"></label><label><span>رقم الهاتف</span><input id="predPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="16" placeholder="أدخل رقم هاتفك"></label></div><div class="score-pick"><div>${img(m.team_a.logo_url,m.team_a.name)}<b>${esc(m.team_a.name)}</b><input id="predA" aria-label="توقع أهداف ${esc(m.team_a.name)}" type="number" inputmode="numeric" min="0" max="30" placeholder="0"></div><span>—</span><div>${img(m.team_b.logo_url,m.team_b.name)}<b>${esc(m.team_b.name)}</b><input id="predB" aria-label="توقع أهداف ${esc(m.team_b.name)}" type="number" inputmode="numeric" min="0" max="30" placeholder="0"></div></div><button class="pred-submit" type="submit">إرسال التوقع ⚽</button><div id="predMsg" class="pred-msg" aria-live="polite"></div></form><div class="pred-total">تم تسجيل <b>${total}</b> توقع حتى الآن</div></div>`;
    document.getElementById('predictionForm')?.addEventListener('submit',e=>submit(e,m));
  }

  async function submit(e,m){
    e.preventDefault();const form=e.currentTarget,name=document.getElementById('predName')?.value.trim()||'',phone=normalizePhone(document.getElementById('predPhone')?.value||''),a=document.getElementById('predA')?.value,b=document.getElementById('predB')?.value,msg=document.getElementById('predMsg'),btn=form.querySelector('button[type="submit"]');const fail=t=>{msg.textContent=t;msg.className='pred-msg error'};
    if(name.length<2)return fail('أدخل اسمك الكامل.');if(!/^\d{8}$/.test(phone))return fail('أدخل رقم هاتف موريتاني صحيحًا من 8 أرقام.');if(a===''||b===''||+a<0||+b<0||+a>30||+b>30)return fail('أدخل نتيجة صحيحة للفريقين.');if(!isOpen(m))return fail('تم إغلاق التوقعات لهذه المباراة 🔒');
    btn.disabled=true;btn.textContent='جارٍ إرسال التوقع...';const {error}=await sb.rpc('submit_match_prediction',{p_match_id:m.id,p_user_name:name,p_phone:phone,p_prediction_a:+a,p_prediction_b:+b});if(error){fail(errorText(error));btn.disabled=false;btn.textContent='إرسال التوقع ⚽';return}form.innerHTML='<div class="pred-success"><span>✅</span><b>تم تسجيل توقعك بنجاح</b><p>بالتوفيق في تحدي توقعات كأس أغشوركيت 🏆</p></div>';
  }
})();