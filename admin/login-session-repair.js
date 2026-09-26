(()=>{
  'use strict';
  if(!window.supabase?.createClient||window.__AGCH_LOGIN_SESSION_REPAIR__)return;
  window.__AGCH_LOGIN_SESSION_REPAIR__=true;

  const originalCreateClient=window.supabase.createClient.bind(window.supabase);
  const messageOf=value=>String(value?.message||value?.error_description||value||'');
  const isBrokenSession=value=>/refresh[_ ]?token.*not found|invalid refresh token|refresh_token_not_found/i.test(messageOf(value));

  window.supabase.createClient=(url,...rest)=>{
    const client=originalCreateClient(url,...rest);
    if(!client?.auth||client.__agchSessionRepair)return client;
    client.__agchSessionRepair=true;

    const storageKeys=new Set(['agch-admin-auth-v2']);
    try{storageKeys.add(`sb-${new URL(url).hostname.split('.')[0]}-auth-token`);}catch{}
    try{
      const configured=rest?.[1]?.auth?.storageKey;
      if(configured)storageKeys.add(configured);
    }catch{}

    const clearLocal=async()=>{
      for(const key of storageKeys){
        try{localStorage.removeItem(key);}catch{}
        try{sessionStorage.removeItem(key);}catch{}
      }
      try{await client.auth.signOut({scope:'local'});}catch{}
    };

    const getSession=client.auth.getSession.bind(client.auth);
    client.auth.getSession=async(...args)=>{
      try{
        const result=await getSession(...args);
        if(result?.error&&isBrokenSession(result.error)){
          await clearLocal();
          return{data:{session:null},error:null};
        }
        return result;
      }catch(error){
        if(isBrokenSession(error)){
          await clearLocal();
          return{data:{session:null},error:null};
        }
        throw error;
      }
    };

    const signIn=client.auth.signInWithPassword.bind(client.auth);
    client.auth.signInWithPassword=async(credentials)=>{
      let result=await signIn(credentials);
      if(result?.error&&isBrokenSession(result.error)){
        await clearLocal();
        result=await signIn(credentials);
      }
      return result;
    };

    return client;
  };
})();
