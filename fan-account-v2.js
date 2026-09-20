(() => {
  'use strict';

  const cfg = window.AGCH_CONFIG || {};
  if (!window.supabase?.createClient || !cfg.supabaseUrl || !cfg.supabaseKey) return;

  const TOURNAMENT_ID = '4b420e85-19b3-479c-bd79-e0fef79a105f';
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    global: { headers: { 'x-client-info': 'aghchorguit-fan-account-v2' } },
  });

  const S = { user: null, myVote: null, pending: '', busy: false, syncTimer: 0, voteUser: '' };
  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const nameOf = u => (u?.user_metadata?.full_name || u?.user_metadata?.name || u?.user_metadata?.display_name || String(u?.email || '').split('@')[0] || 'مشجع أغشوركيت').trim();
  const providerOf = u => ({ google:'Google', apple:'Apple', email:'البريد الإلكتروني' }[String(u?.app_metadata?.provider || 'email').toLowerCase()] || 'حساب');
  const route = () => decodeURIComponent(location.hash || '').replace(/^#\/?/, '').split(/[/?]/)[0];

  function styles() {
    if (document.getElementById('aghFanAccountV2Styles')) return;
    const x = document.createElement('style');
    x.id = 'aghFanAccountV2Styles';
    x.textContent = `
      .agh-account-btn{border:1px solid rgba(199,255,55,.25);background:linear-gradient(145deg,#132019,#080c09);color:#fff;min-height:40px;padding:5px 9px;border-radius:13px;display:inline-flex;align-items:center;gap:7px;font-family:inherit;cursor:pointer}.agh-account-btn:hover{border-color:#c7ff37}.agh-account-avatar{width:29px;height:29px;border-radius:9px;background:#c7ff37;color:#081008;display:grid;place-items:center;font-weight:1000;flex:0 0 29px}.agh-account-copy{display:grid;text-align:right;line-height:1.1}.agh-account-copy small{color:#9da9a1;font-size:8.5px}.agh-account-copy b{font-size:10.5px;max-width:86px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .agh-account-layer{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.77);backdrop-filter:blur(10px);display:grid;place-items:center;padding:14px}.agh-account-layer[hidden]{display:none!important}.agh-account-box{width:min(470px,100%);max-height:92dvh;overflow:auto;background:linear-gradient(160deg,#121a15,#070a08 55%,#050706);border:1px solid rgba(199,255,55,.24);border-radius:24px;padding:17px;color:#fff;box-shadow:0 28px 80px rgba(0,0,0,.52);font-family:Cairo,system-ui,sans-serif;direction:rtl}.agh-account-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:13px}.agh-account-head small{color:#c7ff37;font-weight:900;font-size:9px}.agh-account-head h2{margin:2px 0;font-size:21px}.agh-account-head p{margin:0;color:#a7b1aa;font-size:10.5px;line-height:1.7}.agh-account-close{width:36px;height:36px;border:0;border-radius:11px;background:#1b221d;color:#fff;font-size:22px;cursor:pointer}
      .agh-account-form{display:grid;gap:9px}.agh-account-label{display:grid;gap:5px;font-size:10.5px;font-weight:900;color:#dce2dd}.agh-account-input{width:100%;min-height:47px;border-radius:13px;border:1px solid rgba(255,255,255,.12);background:#0b100d;color:#fff;padding:0 12px;font:700 13px Cairo,system-ui;outline:none}.agh-account-input:focus{border-color:#c7ff37;box-shadow:0 0 0 3px rgba(199,255,55,.08)}.agh-account-primary,.agh-account-secondary,.agh-account-google,.agh-account-link{font-family:inherit;cursor:pointer}.agh-account-primary{border:0;min-height:48px;border-radius:14px;background:#c7ff37;color:#081008;font-weight:1000}.agh-account-primary:disabled{opacity:.5}.agh-account-secondary{border:1px solid rgba(255,255,255,.1);min-height:43px;border-radius:12px;background:#1a211c;color:#fff;font-weight:900}.agh-account-google{border:0;min-height:44px;border-radius:12px;background:#fff;color:#111;font-weight:900}.agh-account-link{border:0;background:transparent;color:#c7ff37;padding:5px;font-size:10.5px;font-weight:900}.agh-account-row{display:grid;grid-template-columns:1fr 1fr;gap:7px}.agh-account-sep{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;color:#778178;font-size:9px}.agh-account-sep:before,.agh-account-sep:after{content:"";height:1px;background:rgba(255,255,255,.09)}.agh-account-msg{min-height:17px;font-size:10px;color:#b8c0ba;line-height:1.6}.agh-account-msg.err{color:#ff9898}.agh-account-msg.ok{color:#c7ff37}
      .agh-account-user{display:grid;grid-template-columns:50px minmax(0,1fr);gap:10px;align-items:center;padding:12px;border-radius:16px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.09);margin:8px 0 13px}.agh-account-user .agh-account-avatar{width:50px;height:50px;border-radius:15px;font-size:17px}.agh-account-user-info{display:grid;gap:2px;min-width:0}.agh-account-user-info b,.agh-account-user-info span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.agh-account-user-info span{font-size:10.5px;color:#a5afa8}.agh-account-logout{background:#231414!important;color:#ffb4b4!important;border-color:rgba(255,100,100,.18)!important}
      .agh-account-voted{margin-top:10px;padding:11px 12px;border-radius:13px;background:rgba(199,255,55,.08);border:1px solid rgba(199,255,55,.2);color:#e7ffad;text-align:center;font-size:10.5px;font-weight:900}.agh-account-profile-card{margin:0 auto 16px;max-width:1180px;padding:13px;border:1px solid rgba(199,255,55,.18);border-radius:19px;background:linear-gradient(135deg,rgba(18,27,21,.96),rgba(7,11,8,.96));display:grid;grid-template-columns:50px minmax(0,1fr) auto;gap:11px;align-items:center;color:#fff}.agh-account-profile-card .agh-account-avatar{width:50px;height:50px;border-radius:15px}.agh-account-profile-info{min-width:0;display:grid;gap:2px}.agh-account-profile-info b,.agh-account-profile-info span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.agh-account-profile-info span{font-size:10px;color:#a7b1aa}.agh-account-manage{border:1px solid rgba(199,255,55,.25);background:rgba(199,255,55,.09);color:#e4ffa1;border-radius:11px;padding:9px 11px;font:900 10.5px Cairo,system-ui;cursor:pointer}.agh-account-toast{position:fixed;left:50%;bottom:calc(82px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:100100;background:#111713;color:#fff;border:1px solid rgba(199,255,55,.25);border-radius:13px;padding:10px 13px;font:800 10.5px Cairo,system-ui;box-shadow:0 14px 40px rgba(0,0,0,.42);max-width:min(92vw,440px);text-align:center}
      @media(max-width:640px){.agh-account-copy small{display:none}.agh-account-copy b{font-size:9px;max-width:55px}.agh-account-btn{padding:5px 6px;min-height:37px}.agh-account-avatar{width:27px;height:27px;flex-basis:27px}.agh-account-layer{padding:8px;align-items:end}.agh-account-box{border-radius:21px 21px 13px 13px;padding:14px}.agh-account-row{grid-template-columns:1fr}.agh-account-profile-card{grid-template-columns:45px minmax(0,1fr)}.agh-account-profile-card .agh-account-avatar{width:45px;height:45px}.agh-account-manage{grid-column:1/-1;width:100%}}@media(max-width:390px){.agh-account-copy{display:none}.agh-account-btn{padding:5px}}
    `;
    document.head.appendChild(x);
  }

  function toast(t) {
    document.querySelector('.agh-account-toast')?.remove();
    const x = document.createElement('div'); x.className = 'agh-account-toast'; x.textContent = t; document.body.appendChild(x); setTimeout(() => x.remove(), 2600);
  }

  function ensureButton() {
    const host = document.querySelector('.header-actions'); if (!host) return;
    let b = document.getElementById('aghAccountBtn');
    if (!b) { b = document.createElement('button'); b.id='aghAccountBtn'; b.type='button'; b.className='agh-account-btn'; b.addEventListener('click', () => openModal()); host.prepend(b); }
    const n = S.user ? nameOf(S.user) : 'دخول'; const key = `${S.user?.id || 'guest'}|${n}`;
    if (b.dataset.key === key) return;
    b.dataset.key = key; b.innerHTML = `<span class="agh-account-avatar">${esc(S.user ? (n[0] || 'م') : '👤')}</span><span class="agh-account-copy"><small>${S.user ? 'حساب المشجع' : 'صوّت بحسابك'}</small><b>${esc(n)}</b></span>`;
  }

  function ensureModal() {
    let m = document.getElementById('aghAccountLayer');
    if (m) return m;
    m = document.createElement('div'); m.id='aghAccountLayer'; m.className='agh-account-layer'; m.hidden=true; m.innerHTML='<section class="agh-account-box" role="dialog" aria-modal="true"><div id="aghAccountBody"></div></section>';
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-ac-close]')) closeModal(); }); document.body.appendChild(m); return m;
  }
  function closeModal(){ const m=document.getElementById('aghAccountLayer'); if(m)m.hidden=true; document.body.style.overflow=''; }
  function msg(body,text,type=''){ const x=body.querySelector('[data-ac-msg]'); if(!x)return; x.className=`agh-account-msg ${type}`; x.textContent=text||''; }
  function errText(e){ const t=String(e?.message||e||''); if(/invalid login credentials/i.test(t))return'البريد أو كلمة المرور غير صحيحة.'; if(/email not confirmed/i.test(t))return'أكّد بريدك الإلكتروني أولًا.'; if(/already registered/i.test(t))return'هذا البريد مسجل بالفعل.'; if(/rate limit|security purposes/i.test(t))return'محاولات كثيرة. انتظر قليلًا ثم حاول.'; if(/provider.*not.*enabled|unsupported provider/i.test(t))return'تسجيل Google غير مفعّل حاليًا.'; return t||'تعذر إكمال العملية.'; }

  function renderModal(note='') {
    const m=ensureModal(), body=m.querySelector('#aghAccountBody');
    if (S.user) {
      const n=nameOf(S.user), email=S.user.email||'';
      body.innerHTML=`<div class="agh-account-head"><div><small>حسابك</small><h2>أهلًا ${esc(n)}</h2><p>حساب واحد = صوت واحد في التصويت.</p></div><button class="agh-account-close" data-ac-close type="button">×</button></div><div class="agh-account-user"><span class="agh-account-avatar">${esc(n[0]||'م')}</span><span class="agh-account-user-info"><b>${esc(n)}</b><span>${esc(email)}</span><span>${esc(providerOf(S.user))}</span></span></div><div class="agh-account-form"><button class="agh-account-secondary" data-ac-profile type="button">فتح ملفي</button><button class="agh-account-secondary agh-account-logout" data-ac-logout type="button">تسجيل الخروج</button></div>`;
      body.querySelector('[data-ac-profile]').onclick=()=>{closeModal();location.hash='#/profile'};
      body.querySelector('[data-ac-logout]').onclick=async()=>{await db.auth.signOut();closeModal();toast('تم تسجيل الخروج')};
      return;
    }
    body.innerHTML=`<div class="agh-account-head"><div><small>AGCHOURGHIT FAN ACCOUNT</small><h2>حساب المشجع</h2><p>${esc(note||'سجّل الدخول للتصويت بحسابك بدل الاسم ورقم الهاتف.')}</p></div><button class="agh-account-close" data-ac-close type="button">×</button></div><form class="agh-account-form" data-ac-form><label class="agh-account-label">البريد الإلكتروني<input class="agh-account-input" name="email" type="email" autocomplete="email" required placeholder="name@example.com"></label><label class="agh-account-label">كلمة المرور<input class="agh-account-input" name="password" type="password" autocomplete="current-password" minlength="6" placeholder="••••••••"></label><button class="agh-account-primary" data-ac-login type="submit">تسجيل الدخول</button><div class="agh-account-row"><button class="agh-account-secondary" data-ac-signup type="button">إنشاء حساب</button><button class="agh-account-secondary" data-ac-magic type="button">رابط دخول بالبريد</button></div><button class="agh-account-link" data-ac-reset type="button">نسيت كلمة المرور؟</button><div class="agh-account-sep">أو</div><button class="agh-account-google" data-ac-google type="button">G &nbsp; المتابعة بحساب Google</button><div class="agh-account-msg" data-ac-msg></div></form>`;
    const f=body.querySelector('[data-ac-form]'), email=()=>f.elements.email.value.trim(), pass=()=>f.elements.password.value;
    f.onsubmit=async e=>{e.preventDefault();if(S.busy)return;S.busy=true;const b=body.querySelector('[data-ac-login]');b.disabled=true;b.textContent='جارٍ الدخول…';try{const{error}=await db.auth.signInWithPassword({email:email(),password:pass()});if(error)throw error}catch(x){msg(body,errText(x),'err')}finally{S.busy=false;b.disabled=false;b.textContent='تسجيل الدخول'}};
    body.querySelector('[data-ac-signup]').onclick=async()=>{if(!email()||pass().length<6){msg(body,'اكتب بريدًا صحيحًا وكلمة مرور من 6 أحرف على الأقل.','err');return}try{msg(body,'جارٍ إنشاء الحساب…');const{data,error}=await db.auth.signUp({email:email(),password:pass(),options:{emailRedirectTo:`${location.origin}${location.pathname}`,data:{display_name:email().split('@')[0]}}});if(error)throw error;msg(body,data?.session?'تم إنشاء الحساب وتسجيل الدخول.':'تم إنشاء الحساب. افتح بريدك واضغط رابط التأكيد.','ok')}catch(x){msg(body,errText(x),'err')}};
    body.querySelector('[data-ac-magic]').onclick=async()=>{if(!email()){msg(body,'اكتب بريدك أولًا.','err');return}try{const{error}=await db.auth.signInWithOtp({email:email(),options:{emailRedirectTo:`${location.origin}${location.pathname}`}});if(error)throw error;msg(body,'تم إرسال رابط الدخول إلى بريدك.','ok')}catch(x){msg(body,errText(x),'err')}};
    body.querySelector('[data-ac-reset]').onclick=async()=>{if(!email()){msg(body,'اكتب بريدك أولًا.','err');return}try{const{error}=await db.auth.resetPasswordForEmail(email(),{redirectTo:`${location.origin}${location.pathname}`});if(error)throw error;msg(body,'أرسلنا رابط تغيير كلمة المرور.','ok')}catch(x){msg(body,errText(x),'err')}};
    body.querySelector('[data-ac-google]').onclick=async()=>{try{const{error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${location.origin}${location.pathname}`}});if(error)throw error}catch(x){msg(body,errText(x),'err')}};
  }
  function openModal(note=''){const m=ensureModal();renderModal(note);m.hidden=false;document.body.style.overflow='hidden'}

  async function refreshVote(force=false){
    if(!S.user){S.myVote=null;S.voteUser='';applyVoteUI();return}
    if(!force&&S.voteUser===S.user.id){applyVoteUI();return}
    S.voteUser=S.user.id;
    try{const{data,error}=await db.rpc('get_player_tournament_account_my_vote',{p_tournament_id:TOURNAMENT_ID});if(error)throw error;S.myVote=data||null}catch{S.myVote=null}
    applyVoteUI();
  }

  function candidateName(id){for(const el of document.querySelectorAll('#aghPlayerTournamentVote [data-pot-profile-card]'))if(el.dataset.potProfileCard===id)return el.querySelector('.agh-pot-player b')?.textContent?.trim()||'مرشحك';return'مرشحك'}
  function applyVoteUI(){
    const root=document.getElementById('aghPlayerTournamentVote');if(!root)return;
    const meta=root.querySelector('.agh-pot-meta'), spans=meta?.querySelectorAll('span');
    if(spans?.length){const x=spans[spans.length-1], html='🔐 <b>حساب واحد = صوت واحد</b>';if(x.innerHTML!==html)x.innerHTML=html}
    const cta=root.querySelector('[data-pot-open]'), current=root.querySelector('.agh-account-voted');
    if(S.user&&S.myVote){if(cta)cta.style.display='none';const text=`✓ تم تسجيل صوت هذا الحساب لـ ${candidateName(S.myVote)}`;if(current){if(current.textContent!==text)current.textContent=text}else{const n=document.createElement('div');n.className='agh-account-voted';n.dataset.vote=S.myVote;n.textContent=text;(cta?.parentNode||root).appendChild(n)}}
    else{if(cta){cta.style.display='';const a=cta.querySelector('span'),b=cta.querySelector('b'),t=S.user?'اختر مرشحك':'سجّل الدخول ثم اختر مرشحك';if(a&&a.textContent!==t)a.textContent=t;if(b&&b.textContent!=='صوّت بحسابك ←')b.textContent='صوّت بحسابك ←'}if(current)current.remove()}
  }

  async function vote(id){
    if(!id||S.busy)return;if(!S.user){S.pending=id;openModal('سجّل الدخول أو أنشئ حسابًا لإرسال صوتك.');return}if(S.myVote){toast('سبق أن صوّت هذا الحساب.');return}
    S.busy=true;try{const{error}=await db.rpc('save_player_tournament_account_vote',{p_tournament_id:TOURNAMENT_ID,p_candidate_id:id});if(error)throw error;S.myVote=id;S.pending='';const sh=document.getElementById('aghPotSheet');if(sh)sh.hidden=true;applyVoteUI();toast('تم تسجيل صوتك بنجاح ✓');setTimeout(()=>location.reload(),850)}catch(e){const t=String(e?.message||e||'');if(/ALREADY_VOTED/i.test(t)){await refreshVote(true);toast('سبق أن صوّت هذا الحساب.')}else if(/VOTING_CLOSED/i.test(t))toast('انتهى التصويت.');else if(/AUTH_REQUIRED/i.test(t))openModal('انتهت جلسة الدخول. سجّل الدخول مرة أخرى.');else toast('تعذر إرسال التصويت. حاول مرة أخرى.')}finally{S.busy=false}
  }

  function intercept(){
    document.addEventListener('click',e=>{const c=e.target.closest?.('#aghPotSheet [data-pot-confirm]');if(c){e.preventDefault();e.stopImmediatePropagation();const s=document.querySelector('#aghPotSheet [data-pot-candidate].selected');const id=s?.dataset?.potCandidate||'';if(!id){toast('اختر لاعبًا أولًا.');return}S.pending=id;vote(id);return}const o=e.target.closest?.('#aghPlayerTournamentVote [data-pot-open]');if(o&&S.user&&S.myVote){e.preventDefault();e.stopImmediatePropagation();toast('سبق أن صوّت هذا الحساب.')}},true);
    document.addEventListener('submit',e=>{if(!e.target.matches?.('#aghPotSheet [data-pot-form]'))return;e.preventDefault();e.stopImmediatePropagation();openModal('التصويت أصبح الآن بالحساب بدل الاسم ورقم الهاتف.')},true);
  }

  function profileCard(){
    const main=document.getElementById('appMain');if(!main)return;let card=document.getElementById('aghAccountProfileCard');if(route()!=='profile'){card?.remove();return}
    const key=S.user?`u:${S.user.id}:${S.user.email||''}`:'guest';if(card?.dataset.key===key)return;
    if(!card){card=document.createElement('section');card.id='aghAccountProfileCard';card.className='agh-account-profile-card';main.prepend(card)}
    card.dataset.key=key;
    if(S.user){const n=nameOf(S.user);card.innerHTML=`<span class="agh-account-avatar">${esc(n[0]||'م')}</span><span class="agh-account-profile-info"><b>${esc(n)}</b><span>${esc(S.user.email||'')} · ${esc(providerOf(S.user))}</span></span><button class="agh-account-manage" type="button">إدارة الحساب</button>`}
    else card.innerHTML='<span class="agh-account-avatar">👤</span><span class="agh-account-profile-info"><b>اربط ملفك بحساب</b><span>التصويت أصبح بحساب موثوق بدل الاسم ورقم الهاتف.</span></span><button class="agh-account-manage" type="button">تسجيل الدخول</button>';
    card.querySelector('button').onclick=()=>openModal();
  }

  function sync(){clearTimeout(S.syncTimer);S.syncTimer=setTimeout(()=>{ensureButton();applyVoteUI();profileCard()},40)}
  async function setSession(session,event=''){
    const old=S.user?.id||'';S.user=session?.user||null;if((S.user?.id||'')!==old){S.voteUser='';S.myVote=null}ensureButton();if(!document.getElementById('aghAccountLayer')?.hidden)renderModal();await refreshVote(true);profileCard();
    if(S.user&&S.pending&&!S.myVote){const p=S.pending;closeModal();setTimeout(()=>vote(p),100)}else if(event==='SIGNED_IN'){closeModal();toast('تم تسجيل الدخول بنجاح')}
  }
  async function init(){styles();ensureButton();ensureModal();intercept();const{data}=await db.auth.getSession();await setSession(data?.session||null);db.auth.onAuthStateChange((e,s)=>setTimeout(()=>setSession(s,e),0));window.addEventListener('hashchange',sync);new MutationObserver(sync).observe(document.body,{childList:true,subtree:true});sync()}
  init();
})();