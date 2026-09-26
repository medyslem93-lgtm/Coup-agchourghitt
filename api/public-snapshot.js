const SUPABASE='https://vbdfyxwzugaqerkcnqzk.supabase.co';
const API_KEY='sb_publishable_WXQXUIk-FQ5SAyzIcslXtA_zo1NPp22';
const CACHE_MS=10*60*1000;
let memoryPayload=null;
let memoryAt=0;

const corePaths={
  tournaments:'tournaments?select=*&order=sort_order.asc.nullslast',
  teams:'teams?select=*&order=name.asc',
  players:'players?select=*&order=name.asc',
  matches:'matches?select=*&order=match_date.desc.nullslast,match_time.desc.nullslast',
  events:'match_events?select=*&order=created_at.asc'
};
const optionalPaths={
  lineups:'match_lineups?select=*',
  lineupPlayers:'match_lineup_players?select=*',
  matchStats:'match_stats?select=*',
  standings:'tournament_standings?select=*',
  playerStats:'player_tournament_stats?select=*',
  news:'news?select=*&order=featured.desc.nullslast,sort_order.asc.nullslast,publish_date.desc.nullslast',
  awards:'awards?select=*',
  media:'media_assets?select=*&entity_type=eq.match&order=created_at.asc',
  settings:'site_settings?select=*&id=eq.main&limit=1',
  referees:'referees?select=*&order=name.asc',
  assignments:'referee_assignments?select=*',
  refereeMatchStats:'referee_match_stats?select=*',
  featureFlags:'site_feature_flags?select=*',
  liveClocks:'match_live_clocks?select=match_id,elapsed_seconds,anchor_at,running'
};

async function readRest(path){
  const response=await fetch(`${SUPABASE}/rest/v1/${path}`,{
    headers:{apikey:API_KEY,Accept:'application/json'},
    cache:'no-store',
    signal:AbortSignal.timeout(10000)
  });
  if(!response.ok) throw new Error(`manama_rest_${response.status}_${path.split('?')[0]}`);
  return response.json();
}

async function readSnapshot(){
  const coreEntries=await Promise.all(Object.entries(corePaths).map(async([key,path])=>[key,await readRest(path)]));
  const payload=Object.fromEntries(coreEntries);
  const optionalEntries=await Promise.all(Object.entries(optionalPaths).map(async([key,path])=>{
    try{return [key,await readRest(path)];}catch(error){console.warn('Optional Supabase collection unavailable:',key,error?.message||error);return [key,[]];}
  }));
  Object.assign(payload,Object.fromEntries(optionalEntries));
  payload.settings=Array.isArray(payload.settings)?(payload.settings[0]||{}):(payload.settings||{});
  const clockByMatch=new Map((payload.liveClocks||[]).map(row=>[row.match_id,row]));
  for(const match of payload.matches||[]){
    const clock=clockByMatch.get(match.id);
    if(clock) Object.assign(match,{clock_elapsed_seconds:clock.elapsed_seconds,clock_anchor_at:clock.anchor_at,clock_running:clock.running});
  }
  return payload;
}

function validPayload(payload){return payload&&Array.isArray(payload.tournaments)&&Array.isArray(payload.teams)&&Array.isArray(payload.players)&&Array.isArray(payload.matches)&&Array.isArray(payload.events);}
function send(res,payload,source='manama-supabase-rest',stale=false){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control',stale?'public, max-age=15, stale-while-revalidate=300':'public, max-age=60, stale-while-revalidate=600');
  res.setHeader('Vercel-CDN-Cache-Control',stale?'public, s-maxage=60, stale-while-revalidate=3600':'public, s-maxage=600, stale-while-revalidate=3600');
  res.setHeader('X-Data-Source',source);
  res.setHeader('X-Supabase-Project','vbdfyxwzugaqerkcnqzk');
  if(stale) res.setHeader('Warning','110 - stale snapshot');
  return res.status(200).json(payload);
}

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
  if(memoryPayload&&Date.now()-memoryAt<CACHE_MS) return send(res,memoryPayload,'memory-cache');
  try{
    const payload=await readSnapshot();
    if(!validPayload(payload)) throw new Error('invalid_manama_payload');
    memoryPayload=payload;memoryAt=Date.now();
    return send(res,payload);
  }catch(error){
    console.error('Manama public snapshot failed:',error?.message||error);
    if(memoryPayload) return send(res,memoryPayload,'memory-stale',true);
    res.setHeader('Cache-Control','no-store');
    return res.status(503).json({error:'supabase_unavailable',project:'vbdfyxwzugaqerkcnqzk'});
  }
}
