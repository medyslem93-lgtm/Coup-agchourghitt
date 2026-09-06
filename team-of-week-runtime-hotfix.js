(()=>{'use strict';
const cfg=window.AGCH_CONFIG||{};
if(!cfg.supabaseUrl||!cfg.supabaseKey)return;
const nativeFetch=window.fetch.bind(window);
const supa=(path)=>`${cfg.supabaseUrl}/rest/v1/${path}`;
const headers={apikey:cfg.supabaseKey,Authorization:`Bearer ${cfg.supabaseKey}`,'Content-Type':'application/json'};
const norm=v=>{const s=String(v??'').trim().toLowerCase();if(!s)return'غير محدد';if(s.includes('حارس')||['gk','goalkeeper','keeper'].includes(s))return'حارس مرمى';if(s.includes('دفاع')||s.includes('مدافع')||['def','defender','defence','defense'].includes(s))return'دفاع';if(s.includes('وسط')||['mid','midfielder','midfield'].includes(s))return'وسط';if(s.includes('هجوم')||s.includes('مهاجم')||s.includes('حربة')||['fwd','fw','forward','attacker','striker'].includes(s))return'هجوم';return'غير محدد'};
const cache=new Map();
async function fallbackPlayers(roundId){if(cache.has(roundId))return cache.get(roundId);try{
 const rr=await nativeFetch(supa(`weekly_lineup_rounds?id=eq.${encodeURIComponent(roundId)}&select=id,tournament_id`),{headers,cache:'no-store'}); if(!rr.ok) return [];
 const rounds=await rr.json(); const tid=rounds?.[0]?.tournament_id; if(!tid)return [];
 const tr=await nativeFetch(supa(`teams?tournament_id=eq.${encodeURIComponent(tid)}&select=id,name,logo_url`),{headers,cache:'no-store'}); if(!tr.ok)return [];
 const teams=await tr.json(); const teamIds=(teams||[]).map(t=>t.id); if(!teamIds.length)return [];
 const pr=await nativeFetch(supa(`players?team_id=in.(${teamIds.join(',')})&select=id,name,photo_url,number,position,team_id`),{headers,cache:'no-store'}); if(!pr.ok)return [];
 const ps=await pr.json(); const tm=new Map(teams.map(t=>[t.id,t]));
 const out=(ps||[]).map(p=>({player_id:p.id,player_name:p.name,photo_url:p.photo_url,shirt_number:p.number,player_position:norm(p.position),team_id:p.team_id,team_name:tm.get(p.team_id)?.name||'',team_logo:tm.get(p.team_id)?.logo_url||''}));
 cache.set(roundId,out); return out;
 }catch{return []}}
window.fetch=async(...args)=>{
 const req=args[0]; const url=String(req?.url||req||'');
 const res=await nativeFetch(...args);
 if(!url.includes('/rpc/get_weekly_eligible_players'))return res;
 try{
   const bodyArg=args[1]?.body; let roundId=''; try{roundId=JSON.parse(bodyArg||'{}')?.p_round_id||''}catch{}
   const clone=res.clone(); let data=[]; try{data=await clone.json()}catch{}
   if(Array.isArray(data)&&data.length){const fixed=data.map(p=>({...p,player_position:norm(p.player_position??p.position??p.position_group)}));return new Response(JSON.stringify(fixed),{status:res.status,statusText:res.statusText,headers:res.headers});}
   const fb=await fallbackPlayers(roundId);
   if(fb.length)return new Response(JSON.stringify(fb),{status:200,headers:{'Content-Type':'application/json'}});
 }catch{}
 return res;
};
})();