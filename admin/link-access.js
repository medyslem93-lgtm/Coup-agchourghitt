(() => {
  'use strict';
  const STORAGE_KEY='aghchorguit_admin_link';
  const u=new URL(location.href);
  const incoming=u.searchParams.get('access');
  if(incoming&&incoming.length>20){
    localStorage.setItem(STORAGE_KEY,incoming);
    u.searchParams.delete('access');
    history.replaceState({},'',u.pathname+u.search+u.hash);
  }
  const token=localStorage.getItem(STORAGE_KEY)||'';
  if(!token||!window.supabase?.createClient)return;
  const originalCreate=window.supabase.createClient.bind(window.supabase);
  window.supabase.createClient=(supabaseUrl,supabaseKey,options={})=>{
    const globalOpts=options.global||{};
    const headers={...(globalOpts.headers||{}),'x-agh-admin-link':token};
    const client=originalCreate(supabaseUrl,supabaseKey,{...options,global:{...globalOpts,headers}});
    const realGetSession=client.auth.getSession.bind(client.auth);
    const realSignOut=client.auth.signOut.bind(client.auth);
    client.auth.getSession=async()=>{
      try{
        const probe=await client.from('audit_logs').select('id').limit(1);
        if(!probe.error)return {data:{session:{user:{email:'الدخول عبر الرابط الخاص'}}},error:null};
      }catch(_e){}
      return realGetSession();
    };
    client.auth.signOut=async(...args)=>{
      localStorage.removeItem(STORAGE_KEY);
      return realSignOut(...args);
    };
    return client;
  };
  window.AGCH_ADMIN_LINK_ACTIVE=true;
})();
