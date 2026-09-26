const SUPABASE='https://vbdfyxwzugaqerkcnqzk.supabase.co';
const API_KEY='sb_publishable_WXQXUIk-FQ5SAyzIcslXtA_zo1NPp22';
const MEMORY_MS=8*1000;
let memoryPayload=null;
let memoryAt=0;

async function readRest(path){
  const response=await fetch(`${SUPABASE}/rest/v1/${path}`,{
    headers:{apikey:API_KEY,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(8000)
  });
  if(!response.ok) throw new Error(`manama_rest_${response.status}`);
  return response.json();
}
function send(res,payload,source='manama-supabase-rest'){
  res.setHeader('Cache-Control','public, max-age=2, stale-while-revalidate=10');
  res.setHeader('Vercel-CDN-Cache-Control','public, s-maxage=8, stale-while-revalidate=20');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Data-Source',source);
  res.setHeader('X-Supabase-Project','vbdfyxwzugaqerkcnqzk');
  return res.status(200).json(payload);
}
export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
  if(memoryPayload&&Date.now()-memoryAt<MEMORY_MS) return send(res,memoryPayload,'memory-cache');
  try{
    const matches=await readRest('matches?select=id,tournament_id,team_a_id,team_b_id,status,match_date,match_time,score_a,score_b,minute,stream_enabled,stream_status,stream_type,stream_url,updated_at&order=updated_at.desc.nullslast&limit=60');
    let clocks=[];
    try{clocks=await readRest('match_live_clocks?select=match_id,elapsed_seconds,anchor_at,running');}catch(_){clocks=[];}
    const clockByMatch=new Map(clocks.map(row=>[row.match_id,row]));
    for(const match of matches){const clock=clockByMatch.get(match.id);if(clock)Object.assign(match,{clock_elapsed_seconds:clock.elapsed_seconds,clock_anchor_at:clock.anchor_at,clock_running:clock.running});}
    const activeMatchIds=matches.filter(match=>match.status==='مباشر'||match.stream_status==='live').map(match=>match.id);
    let events=[];
    if(activeMatchIds.length){const ids=activeMatchIds.map(id=>`"${String(id).replaceAll('"','')}"`).join(',');events=await readRest(`match_events?select=*&match_id=in.(${encodeURIComponent(ids)})&order=created_at.asc`);}
    const payload={matches,events,activeMatchIds};
    memoryPayload=payload;memoryAt=Date.now();
    return send(res,payload);
  }catch(error){
    console.error('Manama live state unavailable',error?.message||error);
    if(memoryPayload) return send(res,memoryPayload,'memory-stale');
    res.setHeader('Cache-Control','no-store');
    return res.status(503).json({error:'live_state_unavailable',project:'vbdfyxwzugaqerkcnqzk'});
  }
}
