(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG;
  const sb=(cfg&&window.supabase)?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}}):null;
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  const style=document.createElement('style');
  style.textContent=`
    .prediction-system-heading{display:flex;align-items:center;gap:12px;margin:0 0 12px;padding:14px 16px;border:1px solid rgba(226,184,62,.42);border-radius:18px;background:linear-gradient(135deg,#0d1725,#111c2c);color:#fff;box-shadow:0 12px 30px rgba(0,0,0,.16)}
    .prediction-system-heading>span{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;background:linear-gradient(135deg,#f6c72e,#c99308);font-size:21px}.prediction-system-heading h2{margin:0;font-size:17px}.prediction-system-heading p{margin:2px 0 0;color:#9eabb9;font-size:10px}
    .pred-matchup .vs-latin{font-weight:900;letter-spacing:1px;color:#f4c530;font-size:14px}
    .pred-message.success small{display:block;margin-top:5px;color:#d8e0e9;font-size:10px}.pred-message.error{line-height:1.65}
    .player-select-preview{display:flex;align-items:center;gap:9px;margin:7px 0 6px;padding:8px 10px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.035);min-height:44px}
    .player-select-preview img,.player-select-preview .avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;background:#223047;display:grid;place-items:center;color:#f4c530;font-weight:900}.player-select-preview b{font-size:10px;color:#fff}.player-select-preview span{font-size:9px;color:#9eabb9}.player-select-preview.empty{opacity:.68}
    @media(max-width:430px){.prediction-system-heading{padding:12px}.prediction-system-heading h2{font-size:15px}.prediction-system-heading>span{width:38px;height:38px}}
  `;
  document.head.appendChild(style);

  async function updatePlayerPreview(select){
    if(!sb||!select)return;
    const label=select.closest('label');if(!label)return;
    let box=label.querySelector('.player-select-preview');
    if(!box){box=document.createElement('div');box.className='player-select-preview empty';select.before(box)}
    const id=select.value;
    if(!id){if(box.dataset.playerId!==''){box.dataset.playerId='';box.className='player-select-preview empty';box.innerHTML='<span>اختر لاعبًا لعرض بياناته</span>'}return}
    if(box.dataset.playerId===id)return;
    box.dataset.playerId=id;
    const {data}=await sb.from('players').select('id,name,number,photo_url').eq('id',id).maybeSingle();
    if(!data){box.className='player-select-preview empty';box.innerHTML='<span>تعذر تحميل بيانات اللاعب</span>';return}
    box.className='player-select-preview';
    box.innerHTML=`${data.photo_url?`<img src="${esc(data.photo_url)}" alt="${esc(data.name)}">`:`<div class="avatar">${data.number??'⚽'}</div>`}<div><b>${esc(data.name)}</b><span>${data.number!=null?'الرقم '+esc(data.number):'الرقم غير مسجل'}</span></div>`;
  }

  function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
  function patchPredictionPane(){
    const pane=document.getElementById('v2-predictions');if(!pane)return;
    if(!pane.querySelector('.prediction-system-heading')&&pane.children.length){
      const heading=document.createElement('div');heading.className='prediction-system-heading';heading.innerHTML='<span>🏆</span><div><h2>توقع نتيجة المباراة</h2><p>تحدي توقعات كأس أغشوركيت 2026</p></div>';
      pane.prepend(heading);
    }
    const vs=pane.querySelector('.pred-matchup>strong');if(vs&&!vs.querySelector('.vs-latin'))vs.innerHTML='<span class="vs-latin">VS</span>';
    setText(pane.querySelector('.prediction-title h2'),'توقع النتيجة واربح التحدي 🏆');
    setText(pane.querySelector('.prediction-title p'),'اكتب معلوماتك وتوقع النتيجة النهائية للمباراة قبل انطلاقها.');
    setText(pane.querySelector('.pred-locked p'),'سيتم إعلان أصحاب التوقعات الصحيحة والنقاط بعد نهاية المباراة.');
    const save=document.getElementById('savePrediction');if(save&&!save.disabled){const desired=/تحديث/.test(save.textContent)?'تحديث التوقع ⚽':'حفظ التوقع ⚽';setText(save,desired)}
    const msg=pane.querySelector('.pred-message.error');if(msg&&/هذا الرقم مسجل سابقًا/.test(msg.textContent))setText(msg,'لقد قمت بإرسال توقعك لهذه المباراة مسبقًا. استخدم نفس الجهاز لتحديث التوقع قبل بداية المباراة.');
    const ok=pane.querySelector('.pred-message.success');if(ok&&ok.dataset.fullMessage!=='1'){
      const updated=/تحديث/.test(ok.textContent);ok.dataset.fullMessage='1';ok.innerHTML=updated?'تم تحديث توقعك بنجاح ✅<small>تم حفظ التعديل قبل موعد المباراة.</small>':'تم تسجيل توقعك بنجاح ✅<small>بالتوفيق في تحدي توقعات كأس أغشوركيت 🏆</small>';
    }
    ['predScorer','predAssist','predMotm'].forEach(id=>{const s=document.getElementById(id);if(s&&!s.dataset.previewBound){s.dataset.previewBound='1';s.addEventListener('change',()=>updatePlayerPreview(s));updatePlayerPreview(s)}});
  }

  function patchCards(){document.querySelectorAll('[data-prediction-cta]').forEach(x=>{const desired=x.classList.contains('open')?'✨ توقع المباراة واكسب النقاط':'🔒 انتهى وقت التوقع';setText(x,desired)})}
  let queued=false;
  const apply=()=>{queued=false;patchPredictionPane();patchCards()};
  const obs=new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(apply)}});
  const start=()=>{obs.observe(document.body,{childList:true,subtree:true,characterData:true});apply()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();