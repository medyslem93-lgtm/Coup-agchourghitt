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

  window.supabase.createClient = (url, key) => {
    if (url === config.supabaseUrl && key === config.supabaseKey) return client;
    return createClient(url, key);
  };
})();
