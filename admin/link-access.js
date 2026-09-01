(() => {
  'use strict';
  const STORAGE_KEY='aghchorguit_admin_link';
  const u=new URL(location.href);
  const incoming=(u.searchParams.get('access')||'').trim();
  if(incoming.length>20){localStorage.setItem(STORAGE_KEY,incoming);u.searchParams.delete('access');history.replaceState({},'',u.pathname+u.search+u.hash)}
  const token=(localStorage.getItem(STORAGE_KEY)||'').trim();
  const credentialSession=sessionStorage.getItem('agh_admin_session')==='1';
  if(!credentialSession&&!token){window.AGCH_ADMIN_LINK_ACTIVE=false;location.replace('login.html');return}
  if(!window.supabase?.createClient){window.AGCH_ADMIN_LINK_ACTIVE=false;return}
  const originalCreate=window.supabase.createClient.bind(window.supabase);
  window.supabase.createClient=(supabaseUrl,supabaseKey,options={})=>{
    const globalOpts=options.global||{};
    const headers={...(globalOpts.headers||{})};
    if(token)headers['x-agh-admin-link']=token;
    const client=originalCreate(supabaseUrl,supabaseKey,{...options,auth:{...(options.auth||{}),persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{...globalOpts,headers}});
    client.auth.getSession=async()=>({data:{session:{user:{email:'medyslem93@gmail.com'}}},error:null});
    client.auth.signOut=async()=>{sessionStorage.removeItem('agh_admin_session');localStorage.removeItem(STORAGE_KEY);return {error:null}};
    return client;
  };
  window.AGCH_ADMIN_LINK_ACTIVE=true;
})();