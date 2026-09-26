window.AGCH_CONFIG={
  supabaseUrl:'https://vbdfyxwzugaqerkcnqzk.supabase.co',
  supabaseKey:'sb_publishable_WXQXUIk-FQ5SAyzIcslXtA_zo1NPp22',
  mediaBucket:'tournament-media',
  legacySupabaseUrl:'https://pncjlbsflsgshmzgiiqu.supabase.co'
};

(() => {
  if (!window.supabase?.createClient || window.AGCH_SUPABASE_CLIENT) return;
  const nativeCreateClient = window.supabase.createClient.bind(window.supabase);
  const config = window.AGCH_CONFIG;
  const currentOrigin = String(config.supabaseUrl).replace(/\/+$/,'');
  const legacyOrigin = String(config.legacySupabaseUrl||'').replace(/\/+$/,'');
  const isAdminPage = /^\/admin(?:\/|$)/.test(location.pathname);
  const auth = isAdminPage ? {
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true,
    storageKey:'agch-admin-auth-v2'
  } : {
    persistSession:false,
    autoRefreshToken:false,
    detectSessionInUrl:false,
    storageKey:'agch-public-auth-v1'
  };

  const client = nativeCreateClient(config.supabaseUrl, config.supabaseKey, {
    auth,
    global:{headers:{'x-client-info':isAdminPage?'aghchorguit-2026-admin':'aghchorguit-2026-web'}}
  });
  window.AGCH_SUPABASE_CLIENT=client;
  window.aghDb=client;

  if (isAdminPage) {
    const showProviderMaintenance=(status=0)=>{
      const render=()=>{
        if(document.getElementById('adminProviderMaintenance')) return;
        const node=document.createElement('div');
        node.id='adminProviderMaintenance';
        node.setAttribute('role','alert');
        node.style.cssText='position:fixed;z-index:2147483647;inset:0;display:grid;place-items:center;padding:24px;background:rgba(5,10,14,.94);font-family:Cairo,Arial,sans-serif;direction:rtl;color:#fff;text-align:center';
        node.innerHTML=`<div style="max-width:560px;width:100%;padding:28px;border:1px solid rgba(255,255,255,.16);border-radius:22px;background:#101820"><div style="font-size:34px;margin-bottom:8px">⚠️</div><h2>خدمة الإدارة متوقفة مؤقتًا</h2><p>تعذر الاتصال بقاعدة البيانات${status?` (HTTP ${status})`:''}. لم يتم اعتبار هذا العطل رفضًا لصلاحيتك.</p><button type="button" onclick="location.reload()" style="border:0;border-radius:14px;padding:12px 18px;background:#20a878;color:white;font:inherit;font-weight:800">إعادة فحص الاتصال</button></div>`;
        document.body.appendChild(node);
      };
      if(document.body) render(); else document.addEventListener('DOMContentLoaded',render,{once:true});
    };
    const gatewayCheck=fetch(`${currentOrigin}/rest/v1/tournaments?select=id&limit=1`,{
      headers:{apikey:config.supabaseKey,Accept:'application/json'},
      cache:'no-store',
      signal:AbortSignal.timeout?AbortSignal.timeout(6000):undefined
    }).then(response=>({status:response.status,blocked:response.status===402||response.status===408||response.status===429||response.status>=500})).catch(()=>({status:0,blocked:true}));
    window.AGCH_ADMIN_GATEWAY_CHECK=gatewayCheck;
    const originalFrom=client.from.bind(client);
    client.from=(relation)=>{
      const builder=originalFrom(relation);
      if(relation!=='admin_emails') return builder;
      const originalSelect=builder.select.bind(builder);
      builder.select=(...selectArgs)=>{
        const selected=originalSelect(...selectArgs);
        const originalLimit=selected.limit.bind(selected);
        selected.limit=(...limitArgs)=>{
          const query=originalLimit(...limitArgs);
          return gatewayCheck.then(state=>{
            if(state.blocked){showProviderMaintenance(state.status);const error=new Error(`admin_provider_unavailable_${state.status||'network'}`);error.name='AdminProviderUnavailableError';throw error;}
            return query;
          });
        };
        return selected;
      };
      return builder;
    };
  }

  window.supabase.createClient=(url,key,...args)=>{
    const origin=String(url||'').replace(/\/+$/,'');
    if(origin===currentOrigin||origin===legacyOrigin) return client;
    return nativeCreateClient(url,key,...args);
  };
})();

(() => {
  if (/^\/admin(?:\/|$)/.test(location.pathname)) return;
  const src='/public-network-guard.js?v=20260926-publicfix2';
  if(document.readyState==='loading'){document.write(`<script src="${src}"><\/script>`);return;}
  const script=document.createElement('script');script.src=src;script.async=false;document.head.appendChild(script);
})();
