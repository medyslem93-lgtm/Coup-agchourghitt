(() => {
  'use strict';
  const SDK='https://cdn.jsdelivr.net/npm/livekit-client@2.15.6/dist/livekit-client.umd.min.js';
  let sdkPromise, room, previewStream, currentMatchId, activeMatchId, facing='environment', busy=false;
  const $=id=>document.getElementById(id);
  const loadSdk=()=>window.LivekitClient?Promise.resolve(window.LivekitClient):(sdkPromise||(sdkPromise=new Promise((ok,no)=>{const s=document.createElement('script');s.src=SDK;s.async=true;s.crossOrigin='anonymous';s.onload=()=>window.LivekitClient?ok(window.LivekitClient):no(new Error('تعذر تحميل LiveKit'));s.onerror=()=>no(new Error('تعذر تحميل LiveKit'));document.head.appendChild(s)})));
  const client=()=>window.adminControl?.client||window.AGCH_SUPABASE_CLIENT||window.aghDb;
  const state=(text,ok=true)=>{const el=$('lkState');if(el){el.textContent=text;el.style.color=ok?'#177a54':'#b42318'}};
  const friendlyError=error=>{const message=String(error?.message||error||'');if(/invalid token/i.test(message))return new Error('تعذر اعتماد البث: إعدادات LiveKit في الخادم لا تطابق مشروع البث.');if(/permission|not allowed/i.test(message))return new Error('تعذر الوصول إلى الكاميرا أو الميكروفون. تحقق من أذونات المتصفح.');if(/network|signal|connect/i.test(message))return new Error('تعذر الاتصال بخدمة البث الآن. تحقق من الإنترنت ثم أعد المحاولة.');return error instanceof Error?error:new Error(message||'تعذر تنفيذ العملية')};
  const session=async()=>{const sb=client();if(!sb)throw new Error('جلسة الإدارة غير متاحة');const {data}=await sb.auth.getSession();if(!data?.session?.access_token)throw new Error('يجب تسجيل الدخول كمسؤول');return data.session.access_token};
  const token=async(matchId)=>{const access=await session();const r=await fetch('/api/livekit-token',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${access}`},body:JSON.stringify({matchId,identity:`camera-${Date.now()}`,role:'publisher'})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error==='livekit_not_configured'?'خدمة البث غير مهيأة على الخادم':j.error||'تعذر إنشاء جلسة البث');return j};
  const stopPreview=()=>{previewStream?.getTracks().forEach(t=>t.stop());previewStream=null;const v=$('lkCameraPreview');if(v)v.srcObject=null};
  async function openCamera(){
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('هذا المتصفح لا يدعم الوصول إلى الكاميرا');
    facing=$('lkFacing')?.value||facing; stopPreview();
    previewStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1280,max:1280},height:{ideal:720,max:720},frameRate:{ideal:24,max:30}},audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    previewStream.getVideoTracks().forEach(track=>{try{track.contentHint='motion'}catch{}});
    const v=$('lkCameraPreview'); if(v){v.srcObject=previewStream;v.muted=true;await v.play().catch(()=>{})}
    $('lkStart')?.removeAttribute('disabled');
    state('الكاميرا والميكروفون جاهزان');
  }
  async function start(){
    if(!currentMatchId)throw new Error('لم يتم تحديد المباراة');
    if(room&&activeMatchId)throw new Error(activeMatchId===currentMatchId?'البث يعمل بالفعل من هذا الجهاز':'أوقف البث الجاري قبل بدء مباراة أخرى');
    if(busy)return;busy=true;
    try{
      if(!previewStream)await openCamera();
      state('جارٍ بدء البث…');
      const LK=await loadSdk(), auth=await token(currentMatchId);
      room=new LK.Room({adaptiveStream:true,dynacast:true,disconnectOnPageLeave:true});
      try{await room.connect(auth.url,auth.token)}catch(error){try{await room.disconnect()}catch{}room=null;throw friendlyError(error)}
      const video=previewStream.getVideoTracks()[0], audio=previewStream.getAudioTracks()[0];
      if(video)await room.localParticipant.publishTrack(video,{source:LK.Track.Source.Camera});
      if(audio)await room.localParticipant.publishTrack(audio,{source:LK.Track.Source.Microphone});
      const sb=client();
      const {error}=await sb.from('matches').update({stream_enabled:true,stream_status:'live',stream_type:'livekit',stream_url:null,updated_at:new Date().toISOString()}).eq('id',currentMatchId);
      if(error){await room.disconnect();room=null;throw error}
      activeMatchId=currentMatchId;
      if($('mfStreamEnabled'))$('mfStreamEnabled').value='true';
      if($('mfStreamStatus'))$('mfStreamStatus').value='live';
      if($('mfStreamType'))$('mfStreamType').value='livekit';
      if($('mfStreamUrl'))$('mfStreamUrl').value='';
      $('lkStart').disabled=true;$('lkStop').disabled=false;state('🔴 البث مباشر الآن');
      window.adminControl?.patchMatch(currentMatchId,{stream_enabled:true,stream_status:'live',stream_type:'livekit',stream_url:null,updated_at:new Date().toISOString()});
    }finally{busy=false}
  }
  async function stop(){
    if(busy)return;busy=true;
    try{
      try{await room?.disconnect()}catch{} room=null; stopPreview();
      const sb=client(),matchId=activeMatchId||currentMatchId;
      if(matchId){const {error}=await sb.from('matches').update({stream_status:'ended',stream_enabled:false,updated_at:new Date().toISOString()}).eq('id',matchId);if(error)throw error}
      activeMatchId=null;
      if($('mfStreamEnabled'))$('mfStreamEnabled').value='false';
      if($('mfStreamStatus'))$('mfStreamStatus').value='ended';
      if($('lkStart'))$('lkStart').disabled=false;if($('lkStop'))$('lkStop').disabled=true;state('تم إيقاف البث');
      window.adminControl?.patchMatch(matchId,{stream_status:'ended',stream_enabled:false,updated_at:new Date().toISOString()});
    }finally{busy=false}
  }
  function mount(matchId,hostArg){
    const host=hostArg||document.getElementById('livekitCameraBox');if(!host)return;
    if(room&&activeMatchId&&activeMatchId!==matchId){host.innerHTML='<div class="livekit-camera-card"><div class="livekit-camera-heading"><div><span>PHONE CAMERA</span><b>يوجد بث آخر يعمل من هذا الجهاز</b></div><em>مباشر الآن</em></div><p>ارجع إلى المباراة التي بدأ منها البث وأوقفها قبل فتح كاميرا مباراة أخرى.</p></div>';return}
    currentMatchId=matchId;
    const match=window.adminControl?.state?.matches?.find(item=>item.id===matchId);
    const isLive=Boolean(match?.stream_enabled&&match?.stream_status==='live'&&match?.stream_type==='livekit');
    host.innerHTML=`<div class="livekit-camera-card"><div class="livekit-camera-heading"><div><span>PHONE CAMERA</span><b>📷 بث مباشر من كاميرا الهاتف</b></div><em>${isLive?'مباشر الآن':'جاهز عند الطلب'}</em></div><p>يبقى YouTube وFacebook وHLS وEmbed متاحًا. افتح الكاميرا ثم ابدأ البث، ويظهر الفيديو فورًا في صفحة المباراة.</p><video id="lkCameraPreview" playsinline muted></video><div class="livekit-camera-actions"><select id="lkFacing"><option value="environment">الكاميرا الخلفية</option><option value="user">الكاميرا الأمامية</option></select><button type="button" class="ghost" id="lkOpen">فتح الكاميرا</button><button type="button" class="primary" id="lkStart" disabled>🔴 بدء البث</button><button type="button" class="danger" id="lkStop" ${isLive?'':'disabled'}>إيقاف البث</button></div><small id="lkState">${isLive?'البث مسجل كمباشر. افتح الكاميرا ثم اضغط بدء البث لإعادة الاتصال من هذا الجهاز.':'لن تُرسل الكاميرا أو الميكروفون قبل الضغط على «بدء البث».'}</small></div>`;
    const run=fn=>async(event)=>{const control=event?.currentTarget;if(control)control.disabled=true;try{await fn()}catch(error){state(friendlyError(error).message,false)}finally{if(control?.id==='lkOpen'||control?.id==='lkFacing'||(control?.id==='lkStart'&&!room)||(control?.id==='lkStop'&&room))control.disabled=false}};
    $('lkOpen').onclick=run(openCamera);$('lkFacing').onchange=run(openCamera);$('lkStart').onclick=run(start);$('lkStop').onclick=run(stop);
  }
  window.addEventListener('admin:panel-close',()=>{if(!room)stopPreview()});
  window.addEventListener('beforeunload',()=>{try{room?.disconnect()}catch{} stopPreview()});
  window.AGCH_LIVEKIT_CAMERA={mount,openCamera,start,stop};
})();
