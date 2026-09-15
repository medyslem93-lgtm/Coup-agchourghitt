(() => {
  'use strict';
  const SDK='https://cdn.jsdelivr.net/npm/livekit-client@2.15.6/dist/livekit-client.umd.min.js';
  let sdkPromise, room, previewStream, currentMatchId, facing='environment';
  const $=id=>document.getElementById(id);
  const loadSdk=()=>window.LivekitClient?Promise.resolve(window.LivekitClient):(sdkPromise||(sdkPromise=new Promise((ok,no)=>{const s=document.createElement('script');s.src=SDK;s.async=true;s.crossOrigin='anonymous';s.onload=()=>window.LivekitClient?ok(window.LivekitClient):no(new Error('تعذر تحميل LiveKit'));s.onerror=()=>no(new Error('تعذر تحميل LiveKit'));document.head.appendChild(s)})));
  const session=async()=>{const sb=window.AGCH_SUPABASE_CLIENT||window.aghDb;if(!sb)throw new Error('جلسة الإدارة غير متاحة');const {data}=await sb.auth.getSession();if(!data?.session?.access_token)throw new Error('يجب تسجيل الدخول كمسؤول');return data.session.access_token};
  const token=async(matchId)=>{const access=await session();const r=await fetch('/api/livekit-token',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${access}`},body:JSON.stringify({room:`match-${matchId}`,identity:`camera-${Date.now()}`,role:'publisher'})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'تعذر إنشاء جلسة البث');return j};
  const stopPreview=()=>{previewStream?.getTracks().forEach(t=>t.stop());previewStream=null;const v=$('lkCameraPreview');if(v)v.srcObject=null};
  async function openCamera(){
    facing=$('lkFacing')?.value||facing; stopPreview();
    previewStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing}},audio:true});
    const v=$('lkCameraPreview'); if(v){v.srcObject=previewStream;v.muted=true;await v.play().catch(()=>{})}
    $('lkStart')?.removeAttribute('disabled');
  }
  async function start(){
    if(!currentMatchId)throw new Error('لم يتم تحديد المباراة');
    if(!previewStream)await openCamera();
    const LK=await loadSdk(), auth=await token(currentMatchId);
    room=new LK.Room({adaptiveStream:true,dynacast:true});
    await room.connect(auth.url,auth.token);
    const video=previewStream.getVideoTracks()[0], audio=previewStream.getAudioTracks()[0];
    if(video)await room.localParticipant.publishTrack(video,{source:LK.Track.Source.Camera});
    if(audio)await room.localParticipant.publishTrack(audio,{source:LK.Track.Source.Microphone});
    const sb=window.AGCH_SUPABASE_CLIENT||window.aghDb;
    await sb.from('matches').update({stream_enabled:true,stream_status:'live',stream_type:'livekit',stream_url:`livekit://match-${currentMatchId}`}).eq('id',currentMatchId);
    $('lkStart').disabled=true;$('lkStop').disabled=false;$('lkState').textContent='🔴 البث مباشر الآن';
  }
  async function stop(){
    try{await room?.disconnect()}catch{} room=null; stopPreview();
    const sb=window.AGCH_SUPABASE_CLIENT||window.aghDb;
    if(currentMatchId)await sb.from('matches').update({stream_status:'ended',stream_enabled:false}).eq('id',currentMatchId);
    if($('lkStart'))$('lkStart').disabled=false;if($('lkStop'))$('lkStop').disabled=true;if($('lkState'))$('lkState').textContent='تم إيقاف البث';
  }
  function mount(matchId){
    currentMatchId=matchId;
    const host=document.getElementById('livekitCameraBox');if(!host)return;
    host.innerHTML=`<div style="margin-top:16px;padding:14px;border:1px solid #dce4ed;border-radius:16px;background:#f8fafc"><b>📷 بث مباشر من كاميرا الهاتف</b><p style="font-size:12px;color:#64748b">يبقى YouTube وFacebook وHLS وEmbed متاحًا كما هو. هذا الخيار يبث الكاميرا والميكروفون مباشرة عبر LiveKit.</p><video id="lkCameraPreview" playsinline muted style="width:100%;max-height:320px;background:#0b1220;border-radius:12px;object-fit:cover"></video><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><select id="lkFacing"><option value="environment">الكاميرا الخلفية</option><option value="user">الكاميرا الأمامية</option></select><button type="button" class="ghost" id="lkOpen">فتح الكاميرا</button><button type="button" class="primary" id="lkStart" disabled>🔴 بدء البث</button><button type="button" class="danger" id="lkStop" disabled>إيقاف البث</button></div><small id="lkState"></small></div>`;
    $('lkOpen').onclick=()=>openCamera().catch(e=>alert(e.message));$('lkFacing').onchange=()=>openCamera().catch(e=>alert(e.message));$('lkStart').onclick=()=>start().catch(e=>alert(e.message));$('lkStop').onclick=()=>stop().catch(e=>alert(e.message));
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-edit-match]');if(!b)return;setTimeout(()=>{const save=document.getElementById('saveMatch');if(!save||document.getElementById('livekitCameraBox'))return;const box=document.createElement('div');box.id='livekitCameraBox';save.closest('.savebar')?.before(box);mount(b.dataset.editMatch)},80)});
  window.addEventListener('beforeunload',()=>{try{room?.disconnect()}catch{} stopPreview()});
  window.AGCH_LIVEKIT_CAMERA={mount,openCamera,start,stop};
})();