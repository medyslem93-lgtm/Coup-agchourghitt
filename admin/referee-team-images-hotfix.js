(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG;
  if(!cfg||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
  const bucket='tournament-media';
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const upload=async(file,kind,id)=>{
    if(!file)return null;
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
    const path=`admin/${kind}/${id||crypto.randomUUID()}-${Date.now()}.${ext}`;
    const {error}=await sb.storage.from(bucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
    if(error)throw error;
    return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };
  const toast=(msg,ok=true)=>{const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.style.borderColor=ok?'#32634c':'#813c42';t.style.background=ok?'#193d2d':'#431e22';t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2600)};
  const getId=(btn,attr)=>btn?.getAttribute(attr)||null;

  document.addEventListener('click',async e=>{
    const refBtn=e.target.closest('[data-edit-ref]');
    if(refBtn){
      const id=getId(refBtn,'data-edit-ref');
      setTimeout(async()=>{
        const panel=document.getElementById('panel'); if(!panel||panel.querySelector('#rfPhoto'))return;
        const {data:r}=await sb.from('referee_assignments').select('photo_url').eq('id',id).maybeSingle();
        const bar=panel.querySelector('.savebar'); if(!bar)return;
        const box=document.createElement('div'); box.className='uploadbox';
        box.innerHTML=`${r?.photo_url?`<img src="${esc(r.photo_url)}" alt="صورة الحكم">`:''}<div><label>صورة الحكم</label><input id="rfPhoto" type="file" accept="image/*"><small>يمكن رفع صورة الحكم من الهاتف أو الكمبيوتر</small></div>`;
        bar.before(box);
      },0);
    }
    const addRef=e.target.closest('#addRef');
    if(addRef){setTimeout(()=>{const panel=document.getElementById('panel');if(!panel||panel.querySelector('#rfPhoto'))return;const bar=panel.querySelector('.savebar');if(!bar)return;const box=document.createElement('div');box.className='uploadbox';box.innerHTML='<div><label>صورة الحكم</label><input id="rfPhoto" type="file" accept="image/*"><small>يمكن رفع صورة الحكم من الهاتف أو الكمبيوتر</small></div>';bar.before(box)},0)}

    const saveRef=e.target.closest('#saveRef');
    if(saveRef){
      const file=document.getElementById('rfPhoto')?.files?.[0]; if(!file)return;
      e.preventDefault();e.stopImmediatePropagation();
      try{
        const name=document.getElementById('rfName')?.value?.trim();
        const category=document.getElementById('rfCat')?.value;
        const role=document.getElementById('rfRole')?.value;
        if(!name)return toast('اسم الحكم مطلوب',false);
        let id=document.querySelector('[data-edit-ref][data-current]')?.dataset?.editRef||null;
        let q=sb.from('referee_assignments').select('id,photo_url').eq('name',name).eq('category',category).eq('role',role).limit(1);
        const {data:found}=await q;
        id=found?.[0]?.id||id;
        const photo_url=await upload(file,'referee-photo',id);
        if(id){const {error}=await sb.from('referee_assignments').update({photo_url}).eq('id',id);if(error)throw error;}
        else {const {error}=await sb.from('referee_assignments').insert({name,category,role,photo_url});if(error)throw error;}
        toast('تم حفظ صورة الحكم'); setTimeout(()=>location.reload(),500);
      }catch(err){toast('تعذر حفظ صورة الحكم: '+err.message,false)}
    }

    const editTeam=e.target.closest('[data-edit-team]');
    if(editTeam){setTimeout(async()=>{const panel=document.getElementById('panel');const input=panel?.querySelector('#tfTeamPhoto');if(!input)return;const id=getId(editTeam,'data-edit-team');const {data:t}=await sb.from('teams').select('team_photo_url').eq('id',id).maybeSingle();const field=input.closest('.field');if(t?.team_photo_url&&!field.querySelector('.team-bg-preview')){const im=document.createElement('img');im.className='team-bg-preview';im.src=t.team_photo_url;im.alt='خلفية الفريق الحالية';im.style.cssText='width:100%;max-height:160px;object-fit:cover;border-radius:14px;margin-bottom:8px';field.prepend(im)}const label=field?.querySelector('label');if(label)label.textContent='خلفية الفريق / صورة اللاعبين';},0)}
  },true);
})();

(() => {
  if(document.querySelector('script[data-middle-draw-admin]'))return;
  const s=document.createElement('script');
  s.src='/admin/middle-draw-admin.js?v=20260910-2';
  s.dataset.middleDrawAdmin='1';
  document.body.appendChild(s);
})();