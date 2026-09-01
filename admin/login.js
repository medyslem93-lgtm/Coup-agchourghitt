(()=>{
  'use strict';
  const SUPABASE_URL='https://pncjlbsflsgshmzgiiqu.supabase.co';
  const SUPABASE_KEY='sb_publishable_fnl_v042_IqkcFPpP5oVLA_F_CrpRZX';
  const form=document.getElementById('adminLogin');
  const status=document.getElementById('loginStatus');
  const button=document.getElementById('loginButton');
  if(!window.supabase||!form){ if(status){status.textContent='تعذر تحميل خدمة تسجيل الدخول. أعد تحميل الصفحة.';status.className='login-status error';} return; }
  const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  client.auth.getSession().then(({data})=>{if(data&&data.session) location.replace('./');});
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
})();
