(() => {
  'use strict';
  if(!window.supabase||!window.AGCH_CONFIG)return;
  const sb=window.supabase.createClient(window.AGCH_CONFIG.supabaseUrl,window.AGCH_CONFIG.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
  const $=id=>document.getElementById(id);
  const nullable=v=>v===''?null:v;
  let currentEditId=null, enhancing=false;

  document.addEventListener('click',e=>{
    const edit=e.target.closest('[data-edit-match]');if(edit)currentEditId=edit.dataset.editMatch;
    if(e.target.closest('#addMatch'))currentEditId=null;
  },true);

  async function getCurrent(){if(!currentEditId)return null;const {data}=await sb.from('matches').select('*').eq('id',currentEditId).maybeSingle();return data||null}
  async function patchList(){
    const buttons=[...document.querySelectorAll('#matchList [data-edit-match]')];if(!buttons.length)return;
    const ids=buttons.map(b=>b.dataset.editMatch);const {data}=await sb.from('matches').select('id,category,team_a_placeholder,team_b_placeholder').in('id',ids);const map=new Map((data||[]).map(x=>[x.id,x]));
    buttons.forEach(b=>{const m=map.get(b.dataset.editMatch);if(!m||m.category!=='الوسط'||(!m.team_a_placeholder&&!m.team_b_placeholder))return;const item=b.closest('.item'),title=item?.querySelector('.meta b');if(!title)return;const a=m.team_a_placeholder||'غير محدد',bb=m.team_b_placeholder||'غير محدد';if(!title.dataset.placeholderPatched){title.dataset.placeholderPatched='1';title.insertAdjacentHTML('beforeend',`<small style="display:block;color:#d8b75b;margin-top:4px">${a} × ${bb}</small>`)}})
  }

  async function enhanceForm(){
    if(enhancing)return;const cat=$('mfCat'),a=$('mfA'),b=$('mfB'),save=$('saveMatch');if(!cat||!a||!b||!save)return;
    enhancing=true;
    try{
      if(!a.querySelector('option[value=""]'))a.insertAdjacentHTML('afterbegin','<option value="">غير محدد — استخدم وصف المتأهل</option>');
      if(!b.querySelector('option[value=""]'))b.insertAdjacentHTML('afterbegin','<option value="">غير محدد — استخدم وصف المتأهل</option>');
      let box=$('middlePlaceholderFields');
      if(!box){box=document.createElement('div');box.id='middlePlaceholderFields';box.className='row two';box.innerHTML='<div class="field"><label>وصف الطرف الأول عند عدم تحديد الفريق</label><input id="mfPlaceholderA" placeholder="مثال: متأهل مباراة الجمعة"></div><div class="field"><label>وصف الطرف الثاني عند عدم تحديد الفريق</label><input id="mfPlaceholderB" placeholder="مثال: متأهل بالقرعة"></div><div class="field"><label>ترتيب الظهور</label><input id="mfDisplayOrder" type="number" min="0" placeholder="0"></div><div class="field"><label>ملاحظة التأهل</label><input id="mfQualifierNote" placeholder="اختياري"></div>';const scores=$('mfScoreA')?.closest('.row.two');(scores||save.parentElement)?.insertAdjacentElement('beforebegin',box)}
      const m=await getCurrent();if(m){if($('mfPlaceholderA'))$('mfPlaceholderA').value=m.team_a_placeholder||'';if($('mfPlaceholderB'))$('mfPlaceholderB').value=m.team_b_placeholder||'';if($('mfDisplayOrder'))$('mfDisplayOrder').value=m.display_order??0;if($('mfQualifierNote'))$('mfQualifierNote').value=m.qualifier_note||'';if(!m.team_a_id)a.value='';if(!m.team_b_id)b.value=''}
      const toggle=()=>{box.hidden=cat.value!=='الوسط'};cat.addEventListener('change',toggle);toggle();
      if(!save.dataset.middleWrapped){save.dataset.middleWrapped='1';const base=save.onclick;save.onclick=async ev=>{if(cat.value!=='الوسط'){return base?.call(save,ev)}
        const team_a_id=nullable(a.value),team_b_id=nullable(b.value),pa=$('mfPlaceholderA')?.value.trim()||null,pb=$('mfPlaceholderB')?.value.trim()||null;
        if(!team_a_id&&!pa)return alert('اختر الفريق الأول أو اكتب وصف المتأهل');if(!team_b_id&&!pb)return alert('اختر الفريق الثاني أو اكتب وصف المتأهل');if(team_a_id&&team_b_id&&team_a_id===team_b_id)return alert('لا يمكن اختيار الفريق نفسه مرتين');
        const payload={team_a_id,team_b_id,team_a_placeholder:team_a_id?null:pa,team_b_placeholder:team_b_id?null:pb,category:'الوسط',group_name:nullable($('mfGroup')?.value.trim()||''),stage:nullable($('mfStage')?.value.trim()||''),round_name:nullable($('mfRound')?.value.trim()||''),match_date:nullable($('mfDate')?.value||''),match_time:nullable($('mfTime')?.value||''),venue:nullable($('mfVenue')?.value.trim()||''),status:$('mfStatus')?.value||'قادمة',score_a:nullable($('mfScoreA')?.value||'')===null?null:Number($('mfScoreA').value),score_b:nullable($('mfScoreB')?.value||'')===null?null:Number($('mfScoreB').value),display_order:Number($('mfDisplayOrder')?.value||0),qualifier_note:nullable($('mfQualifierNote')?.value.trim()||''),updated_at:new Date().toISOString()};
        const q=currentEditId?sb.from('matches').update(payload).eq('id',currentEditId):sb.from('matches').insert(payload);const {error}=await q;if(error)return alert('تعذر حفظ المباراة: '+error.message);alert('تم حفظ مباراة الوسط');document.querySelector('[data-close]')?.click();setTimeout(()=>location.reload(),350)
      }}
    } finally {enhancing=false}
  }

  const obs=new MutationObserver(()=>{setTimeout(enhanceForm,0);setTimeout(patchList,50)});obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(patchList,800);
})();
