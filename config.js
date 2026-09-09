window.AGCH_CONFIG={
  supabaseUrl:'https://pncjlbsflsgshmzgiiqu.supabase.co',
  supabaseKey:'sb_publishable_fnl_v042_IqkcFPpP5oVLA_F_CrpRZX',
  mediaBucket:'tournament-media'
};

/* Keep one Supabase/Auth client per page. Feature modules share this instance so
   realtime subscriptions and the authenticated admin session cannot compete. */
(() => {
  if (!window.supabase?.createClient || window.AGCH_SUPABASE_CLIENT) return;
  const createClient = window.supabase.createClient.bind(window.supabase);
  const config = window.AGCH_CONFIG;
  const client = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: { headers: { 'x-client-info': 'aghchorguit-2026-web' } },
  });
  window.AGCH_SUPABASE_CLIENT = client;
  window.aghDb = client;
  window.supabase.createClient = (url, key) => {
    if (url === config.supabaseUrl && key === config.supabaseKey) return client;
    return createClient(url, key);
  };
})();
