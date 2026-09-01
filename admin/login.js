(()=>{
  'use strict';
  const SUPABASE_URL='https://pncjlbsflsgshmzgiiqu.supabase.co';
  const SUPABASE_KEY='sb_publishable_fnl_v042_IqkcFPpP5oVLA_F_CrpRZX';
  const form=document.getElementById('adminLogin');
  const status=document.getElementById('loginStatus');
  const button=document.getElementById('loginButton');
  const forgot=document.getElementById('forgotPassword');
  const updateForm=document.getElementById('updatePasswordForm');
  const recoveryStatus=document.getElementById('recoveryStatus');
  const pageTitle=document.getElementById('pageTitle');
  const pageIntro=document.getElementById('pageIntro');
  if(!window.supabase||!form){ if(status){status.textContent='تعذر تحميل خدمة تسجيل الدخول. أعد تحميل الصفحة.';status.className='login-status error';} return; }
  const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  const recoveryMode=()=>{
    form.classList.add('hidden');updateForm.classList.remove('hidden');
    pageTitle.textContent='تعيين كلمة مرور جديدة';
    pageIntro.textContent='أدخل كلمة المرور الجديدة ثم احفظها للعودة إلى لوحة الإدارة.';
  };
  client.auth.onAuthStateChange((event)=>{ if(event==='PASSWORD_RECOVERY') recoveryMode(); });
  client.auth.getSession().then(({data})=>{
    if(location.hash&&/access_token|type=recovery/.test(location.hash)) return;
    if(data&&data.session) location.replace('./');
  });
  form.addEventListener('submit',async(e)=>{
    e.preventDefault();
    const email=document.getElementById('email').value.trim();
    const password=document.getElementById('password').value;
    status.textContent='جارٍ التحقق من بيانات الدخول…';status.className='login-status';button.disabled=true;
    try{
      const {data,error}=await client.auth.signInWithPassword({email,password});
      if(error) throw error;
      if(!data.session) throw new Error('لم يتم إنشاء جلسة دخول.');
      localStorage.setItem('aghchorguit_admin_link','supabase-auth');
      status.textContent='تم تسجيل الدخول بنجاح. جارٍ فتح لوحة الإدارة…';status.className='login-status ok';
      location.replace('./');
    }catch(err){
      const msg=(err&&err.message)||'';
      status.textContent=/invalid login credentials/i.test(msg)?'البريد الإلكتروني أو كلمة المرور غير صحيحة.':'تعذر تسجيل الدخول الآن: '+msg;
      status.className='login-status error';button.disabled=false;
    }
  });
  forgot.addEventListener('click',async()=>{
    const email=document.getElementById('email').value.trim();
    if(!email){status.textContent='أدخل بريدك الإلكتروني أولاً ثم اضغط «نسيت كلمة المرور؟».';status.className='login-status error';return;}
    forgot.disabled=true;status.textContent='جارٍ إرسال رابط تغيير كلمة المرور إلى بريدك…';status.className='login-status';
    const redirectTo=location.origin+location.pathname;
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo});
    if(error){status.textContent='تعذر إرسال الرابط: '+error.message;status.className='login-status error';forgot.disabled=false;return;}
    status.textContent='تم إرسال رابط تغيير كلمة المرور. افتح بريدك واضغط على الرابط ثم عُد لتعيين كلمة مرور جديدة.';status.className='login-status ok';forgot.disabled=false;
  });
  updateForm.addEventListener('submit',async(e)=>{
    e.preventDefault();
    const password=document.getElementById('newPassword').value;
    const confirm=document.getElementById('confirmPassword').value;
    if(password.length<8){recoveryStatus.textContent='كلمة المرور يجب أن تكون 8 أحرف على الأقل.';recoveryStatus.className='login-status error';return;}
    if(password!==confirm){recoveryStatus.textContent='كلمتا المرور غير متطابقتين.';recoveryStatus.className='login-status error';return;}
    const updateButton=document.getElementById('updatePasswordButton');updateButton.disabled=true;
    recoveryStatus.textContent='جارٍ حفظ كلمة المرور الجديدة…';recoveryStatus.className='login-status';
    const {error}=await client.auth.updateUser({password});
    if(error){recoveryStatus.textContent='تعذر تغيير كلمة المرور: '+error.message;recoveryStatus.className='login-status error';updateButton.disabled=false;return;}
    localStorage.setItem('aghchorguit_admin_link','supabase-auth');
    recoveryStatus.textContent='تم تغيير كلمة المرور بنجاح. جارٍ فتح لوحة الإدارة…';recoveryStatus.className='login-status ok';
    setTimeout(()=>location.replace('./'),700);
  });
})();
