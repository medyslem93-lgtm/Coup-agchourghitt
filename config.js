window.AGCH_CONFIG={
  supabaseUrl:'https://pncjlbsflsgshmzgiiqu.supabase.co',
  supabaseKey:'sb_publishable_fnl_v042_IqkcFPpP5oVLA_F_CrpRZX',
  mediaBucket:'tournament-media'
};

/* Keep one Supabase client per page, but never let the public site own or
   refresh the administrator session. Admin pages use a dedicated storage key. */
(() => {
  if (!window.supabase?.createClient || window.AGCH_SUPABASE_CLIENT) return;
  const createClient = window.supabase.createClient.bind(window.supabase);
  const config = window.AGCH_CONFIG;
  const isAdminPage = /^\/admin(?:\/|$)/.test(location.pathname);
  const auth = isAdminPage
    ? {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'agch-admin-auth-v2',
      }
    : {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'agch-public-auth-v1',
      };

  const client = createClient(config.supabaseUrl, config.supabaseKey, {
    auth,
    global: { headers: { 'x-client-info': isAdminPage ? 'aghchorguit-2026-admin' : 'aghchorguit-2026-web' } },
  });

  window.AGCH_SUPABASE_CLIENT = client;
  window.aghDb = client;

  /*
    The dashboard authorisation guard reads admin_emails before it loads any
    management data. During a Supabase quota/gateway outage that read can return
    HTTP 402/429/5xx. The legacy guard used to treat every transport error as a
    rejected administrator and sign the user out, creating a login -> logout
    loop. Probe the public REST gateway first and, only when the provider itself
    is unavailable, stop the guard before it destroys the valid auth session.
    We do NOT manufacture an admin_emails result and we do NOT bypass the
    allow-list: normal authorisation still runs whenever the gateway is healthy.
  */
  if (isAdminPage) {
    const showProviderMaintenance = (status = 0) => {
      if (document.getElementById('adminProviderMaintenance')) return;
      const render = () => {
        if (document.getElementById('adminProviderMaintenance')) return;
        const node = document.createElement('div');
        node.id = 'adminProviderMaintenance';
        node.setAttribute('role', 'alert');
        node.style.cssText = 'position:fixed;z-index:2147483647;inset:0;display:grid;place-items:center;padding:24px;background:rgba(5,10,14,.94);font-family:Cairo,Arial,sans-serif;direction:rtl;color:#fff;text-align:center';
        node.innerHTML = `<div style="max-width:560px;width:100%;padding:28px;border:1px solid rgba(255,255,255,.16);border-radius:22px;background:#101820;box-shadow:0 24px 70px rgba(0,0,0,.45)"><div style="font-size:34px;margin-bottom:8px">⚠️</div><h2 style="margin:0 0 10px">خدمة الإدارة متوقفة مؤقتًا</h2><p style="margin:0 0 8px;line-height:1.9;color:#d5dde5">Supabase لا يقبل طلبات قاعدة البيانات الآن${status ? ` (HTTP ${status})` : ''}. حافظنا على جلسة دخولك ولم نعتبر العطل رفضًا لصلاحيتك.</p><p style="margin:0 0 18px;line-height:1.8;color:#9fb0bf">لن يتم السماح بالحفظ أو التعديل قبل عودة اتصال قاعدة البيانات، حتى لا تضيع أي تغييرات.</p><button type="button" onclick="location.reload()" style="border:0;border-radius:14px;padding:12px 18px;background:#20a878;color:white;font:inherit;font-weight:800;cursor:pointer">إعادة فحص الاتصال</button><a href="../" style="display:inline-block;margin-right:10px;color:#d6a84b;text-decoration:none;font-weight:800">فتح الموقع العام</a></div>`;
        document.body.appendChild(node);
      };
      if (document.body) render();
      else document.addEventListener('DOMContentLoaded', render, { once: true });
    };

    const gatewayCheck = fetch(`${config.supabaseUrl}/rest/v1/tournaments?select=id&limit=1`, {
      headers: {
        apikey: config.supabaseKey,
        Authorization: `Bearer ${config.supabaseKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined,
    }).then(response => ({
      status: response.status,
      blocked: response.status === 402 || response.status === 408 || response.status === 429 || response.status >= 500,
    })).catch(() => ({ status: 0, blocked: true }));

    window.AGCH_ADMIN_GATEWAY_CHECK = gatewayCheck;
    const originalFrom = client.from.bind(client);
    client.from = (relation) => {
      const builder = originalFrom(relation);
      if (relation !== 'admin_emails') return builder;
      const originalSelect = builder.select.bind(builder);
      builder.select = (...selectArgs) => {
        const selected = originalSelect(...selectArgs);
        const originalLimit = selected.limit.bind(selected);
        selected.limit = (...limitArgs) => {
          const query = originalLimit(...limitArgs);
          return gatewayCheck.then(state => {
            if (state.blocked) {
              showProviderMaintenance(state.status);
              const error = new Error(`admin_provider_unavailable_${state.status || 'network'}`);
              error.name = 'AdminProviderUnavailableError';
              throw error;
            }
            return query;
          });
        };
        return selected;
      };
      return builder;
    };
  }

  window.supabase.createClient = (url, key) => {
    if (url === config.supabaseUrl && key === config.supabaseKey) return client;
    return createClient(url, key);
  };
})();
