(() => {
  'use strict';

  const STORAGE_KEY='aghchorguit_admin_link';
  const u=new URL(location.href);
  const incoming=(u.searchParams.get('access')||'').trim();

  if(incoming.length>20){
    localStorage.setItem(STORAGE_KEY,incoming);
    u.searchParams.delete('access');
    history.replaceState({},'',u.pathname+u.search+u.hash);
  }

  const token=(localStorage.getItem(STORAGE_KEY)||'').trim();
  if(!token||!window.supabase?.createClient){
    window.AGCH_ADMIN_LINK_ACTIVE=false;
    return;
  }

  const originalCreate=window.supabase.createClient.bind(window.supabase);

  window.supabase.createClient=(supabaseUrl,supabaseKey,options={})=>{
    const globalOpts=options.global||{};
    const headers={
      ...(globalOpts.headers||{}),
      'x-agh-admin-link':token
    };

    // مهم: لوحة الإدارة تعمل عبر رابط خاص وليس عبر جلسة Supabase Auth.
    // لذلك نمنع أي جلسة قديمة محفوظة في المتصفح من تحويل الطلبات إلى role=authenticated
    // لأن سياسات الرابط الخاص مصممة للـ anon + x-agh-admin-link.
    const client=originalCreate(supabaseUrl,supabaseKey,{
      ...options,
      auth:{
        ...(options.auth||{}),
        persistSession:false,
        autoRefreshToken:false,
        detectSessionInUrl:false
      },
      global:{...globalOpts,headers}
    });

    client.auth.getSession=async()=>({
      data:{session:{user:{email:'الدخول عبر رابط الإدارة الخاص'}}},
      error:null
    });

    client.auth.signOut=async()=>{
      localStorage.removeItem(STORAGE_KEY);
      return {error:null};
    };

    return client;
  };

  window.AGCH_ADMIN_LINK_ACTIVE=true;
})();
