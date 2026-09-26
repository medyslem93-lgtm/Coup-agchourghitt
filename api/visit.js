const SUPABASE='https://vbdfyxwzugaqerkcnqzk.supabase.co';
const API_KEY='sb_publishable_WXQXUIk-FQ5SAyzIcslXtA_zo1NPp22';
const clean=(value,max)=>typeof value==='string'?value.slice(0,max):null;

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  res.setHeader('Cache-Control','no-store');
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const visitor_id=clean(body.visitor_id,128);
    const session_id=clean(body.session_id,128);
    if(!visitor_id||!session_id) return res.status(204).end();
    await fetch(`${SUPABASE}/rest/v1/site_visits`,{
      method:'POST',
      headers:{apikey:API_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify({visitor_id,session_id,path:clean(body.path,500)||'/',referrer_host:clean(body.referrer_host,255)}),
      signal:AbortSignal.timeout(3000)
    });
  }catch(_){/* Analytics never blocks the site. */}
  return res.status(204).end();
}
