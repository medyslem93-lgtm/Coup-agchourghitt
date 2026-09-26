(()=>{
  'use strict';
  const cfg=window.AGCH_CONFIG||{};
  const SUPABASE_URL=cfg.supabaseUrl||'https://vbdfyxwzugaqerkcnqzk.supabase.co';
  const SUPABASE_KEY=cfg.supabaseKey||'sb_publishable_WXQXUIk-FQ5SAyzIcslXtA_zo1NPp22';
  const ADMIN_STORAGE_KEY='agch-admin-auth-v2';
  const form=document.getElementById('adminLogin');
  const status=document.getElementById('loginStatus');
  const button=document.getElementById('loginButton');
  const forgot=document.getElementById('forgotPassword');
  const updateForm=document.getElementById('updatePasswordForm');
  const recoveryStatus=document.getElementById('recoveryStatus');
  const pageTitle=document.getElementById('pageTitle');
  const pageIntro=document.getElementById('pageIntro');
  const backToLogin=document.getElementById('backToLogin');

  const recoveryInUrl=()=>{
    try{
      const search=new URLSearchParams(location.search);
      const hash=new URLSearchParams(location.hash.replace(/^#/,''));
      return search.get('mode')==='recovery'||search.get('type')==='recovery'||hash.get('type')==='recovery';
    }catch{return false;}
  };
  let recoveryActive=recoveryInUrl();

  const friendlyError=err=>{
    const message=String(err?.message||'');
    if(err?.status===402||/exceed_(cached_)?egress_quota|service for this project is restricted/i.test(message))
      return 'تعذر تسجيل الدخول بسبب تقييد خدمة Supabase. لا يعني ذلك أن كلمة المرور خاطئة؛ أعد المحاولة بعد قليل.';
    if(/invalid login credentials/i.test(message))return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    if(/email not confirmed/i.test(message))return 'البريد الإلكتروني يحتاج إلى تأكيد أولاً.';
    if(/expired|otp.*expired|invalid.*token|token.*invalid/i.test(message))return 'رابط تغيير كلمة المرور منتهي أو غير صالح. اطلب رابطًا جديدًا من صفحة الدخول.';
    return 'تعذر إكمال العملية الآن: '+(message||'خطأ غير معروف');
  };

  if(!window.supabase||!form){
    if(status){status.textContent='تعذر تحميل خدمة تسجيل الدخول. أعد تحميل الصفحة.';status.className='login-status error';}
    return;
  }

  const client=window.AGCH_SUPABASE_CLIENT||window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:ADMIN_STORAGE_KEY},
    global:{headers:{'x-client-info':'aghchorguit-2026-admin-login'}}
  });

  const recoveryMode=(message='اكتب كلمة المرور الجديدة ثم احفظها. بعد الحفظ ستدخل إلى لوحة الإدارة مباشرة.')=>{
    recoveryActive=true;
    form.classList.add('hidden');
    updateForm.classList.remove('hidden');
    pageTitle.textContent='تعيين كلمة مرور الإدارة';
    pageIntro.textContent=message;
  };

  const loginMode=()=>{
    recoveryActive=false;
    updateForm.classList.add('hidden');
    form.classList.remove('hidden');
    pageTitle.textContent='إدارة كأس أغشوركيت 2026';
    pageIntro.textContent='أدخل بريد الإدارة وكلمة المرور مباشرة للوصول إلى لوحة الإدارة.';
    recoveryStatus.textContent='';
    try{history.replaceState({},document.title,location.pathname);}catch{}
  };

  if(recoveryActive)recoveryMode('تم فتح رابط تغيير كلمة المرور. اكتب كلمة المرور الجديدة ثم أكدها واحفظها.');

  client.auth.onAuthStateChange((event)=>{
    if(event==='PASSWORD_RECOVERY')recoveryMode('تم التحقق من رابط Supabase. اكتب كلمة المرور الجديدة ثم احفظها.');
    if(event==='SIGNED_IN'&&!recoveryActive&&!recoveryInUrl()){
      setTimeout(()=>location.replace('./'),120);
    }
  });

  (async()=>{
    try{
      const {data,error}=await client.auth.getSession();
      if(error)throw error;
      if(recoveryActive){
        if(data?.session){
          recoveryStatus.textContent='تم التحقق من الرابط. يمكنك الآن تعيين كلمة المرور الجديدة.';
          recoveryStatus.className='login-status ok';
        }else{
          setTimeout(async()=>{
            try{
              const again=await client.auth.getSession();
              if(again?.data?.session){
                recoveryStatus.textContent='تم التحقق من الرابط. يمكنك الآن تعيين كلمة المرور الجديدة.';
                recoveryStatus.className='login-status ok';
              }
            }catch{}
          },500);
        }
        return;
      }
      if(data?.session)location.replace('./');
    }catch(err){
      const msg=String(err?.message||'');
      if(/refresh[_ ]?token.*not found|invalid refresh token|refresh_token_not_found/i.test(msg)){
        try{localStorage.removeItem(ADMIN_STORAGE_KEY);}catch{}
        try{sessionStorage.removeItem(ADMIN_STORAGE_KEY);}catch{}
      }
    }
  })();

  form.addEventListener('submit',async(e)=>{
    e.preventDefault();
    const email=document.getElementById('email').value.trim();
    const password=document.getElementById('password').value;
    status.textContent='جارٍ التحقق من بيانات الدخول…';
    status.className='login-status';
    button.disabled=true;
    try{
      const {data,error}=await client.auth.signInWithPassword({email,password});
      if(error)throw error;
      if(!data?.session)throw new Error('لم يتم إنشاء جلسة دخول.');
      status.textContent='تم تسجيل الدخول بنجاح. جارٍ فتح لوحة الإدارة…';
      status.className='login-status ok';
      location.replace('./');
    }catch(err){
      status.textContent=friendlyError(err);
      status.className='login-status error';
      button.disabled=false;
    }
  });

  forgot?.addEventListener('click',async()=>{
    const email=document.getElementById('email').value.trim();
    if(!email){
      status.textContent='أدخل بريد الإدارة أولاً ثم اضغط «تعيين / تغيير كلمة مرور الإدارة».';
      status.className='login-status error';
      return;
    }
    forgot.disabled=true;
    status.textContent='جارٍ إرسال رابط تعيين كلمة المرور إلى بريد الإدارة…';
    status.className='login-status';
    const redirectTo=location.origin+location.pathname+'?mode=recovery';
    try{
      const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo});
      if(error)throw error;
      status.textContent='تم إرسال الرابط. افتح رسالة Supabase واضغط الرابط؛ ستعود إلى هذه الصفحة لتكتب كلمة المرور الجديدة بنفسك.';
      status.className='login-status ok';
    }catch(err){
      status.textContent=friendlyError(err);
      status.className='login-status error';
    }finally{
      forgot.disabled=false;
    }
  });

  updateForm.addEventListener('submit',async(e)=>{
    e.preventDefault();
    const password=document.getElementById('newPassword').value;
    const confirm=document.getElementById('confirmPassword').value;
    if(password.length<8){
      recoveryStatus.textContent='كلمة المرور يجب أن تكون 8 أحرف على الأقل.';
      recoveryStatus.className='login-status error';
      return;
    }
    if(password!==confirm){
      recoveryStatus.textContent='كلمتا المرور غير متطابقتين.';
      recoveryStatus.className='login-status error';
      return;
    }
    const updateButton=document.getElementById('updatePasswordButton');
    updateButton.disabled=true;
    recoveryStatus.textContent='جارٍ حفظ كلمة المرور الجديدة…';
    recoveryStatus.className='login-status';
    try{
      let session=(await client.auth.getSession())?.data?.session;
      if(!session){
        await new Promise(r=>setTimeout(r,450));
        session=(await client.auth.getSession())?.data?.session;
      }
      if(!session)throw new Error('رابط تغيير كلمة المرور غير صالح أو انتهت صلاحيته.');
      const {error}=await client.auth.updateUser({password});
      if(error)throw error;
      recoveryStatus.textContent='تم حفظ كلمة المرور بنجاح. جارٍ فتح لوحة الإدارة…';
      recoveryStatus.className='login-status ok';
      try{history.replaceState({},document.title,location.pathname);}catch{}
      setTimeout(()=>location.replace('./'),550);
    }catch(err){
      recoveryStatus.textContent=friendlyError(err);
      recoveryStatus.className='login-status error';
      updateButton.disabled=false;
    }
  });

  backToLogin?.addEventListener('click',loginMode);
})();
