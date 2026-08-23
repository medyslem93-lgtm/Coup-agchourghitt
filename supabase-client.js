/* Supabase live data bridge — public read only. Falls back to bundled official data if offline. */
const SUPABASE_URL='https://pncjlbsflsgshmzgiiqu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_fnl_v042_IqkcFPpP5oVLA_F_CrpRZX';
const dbClient=window.supabase?.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
window.aghDb=dbClient;

const dbStatusToUi=s=>s==='انتهت'?'FINISHED':s==='مباشر'?'LIVE':s==='مؤجلة'?'POSTPONED':s==='ملغاة'?'CANCELLED':'UPCOMING';
const dbEventToUi=t=>({
  'هدف':'goal','هدف عكسي':'own_goal','ركلة جزاء مسجلة':'penalty_goal','ركلة جزاء ضائعة':'penalty_miss',
  'تمريرة حاسمة':'assist','بطاقة صفراء':'yellow','بطاقة حمراء':'red','تبديل':'sub','رجل المباراة':'motm',
  'بداية المباراة':'kickoff','نهاية الشوط':'halftime','نهاية المباراة':'fulltime'
}[t]||t);
const dbTime=t=>t?String(t).slice(0,5):'';

async function loadOfficialData(){
  if(!dbClient) return;
  try{
    const [tr,pr,mr,er,nr,rr]=await Promise.all([
      dbClient.from('teams').select('*').order('category').order('name'),
      dbClient.from('players').select('*').order('created_at'),
      dbClient.from('matches').select('*,team_a:teams!matches_team_a_id_fkey(id,name,logo_url),team_b:teams!matches_team_b_id_fkey(id,name,logo_url)').order('match_date',{ascending:true,nullsFirst:false}),
      dbClient.from('match_events').select('*').order('created_at'),
      dbClient.from('news').select('*').order('publish_date',{ascending:false}),
      dbClient.from('referee_assignments').select('*').order('category')
    ]);
    const failed=[tr,pr,mr,er,nr,rr].find(x=>x.error);
    if(failed) throw failed.error;

    const teams=tr.data||[], players=pr.data||[], matches=mr.data||[], events=er.data||[];
    const teamById=new Map(teams.map(t=>[t.id,t]));
    const playerById=new Map(players.map(p=>[p.id,p]));

    teams.forEach(t=>{ if(t.logo_url) embeddedLogos[t.name]=t.logo_url; });

    D={الكبار:{},الوسط:{},الصغار:{}};
    teams.forEach(t=>{ if(D[t.category]) D[t.category][t.name]=[]; });
    players.forEach(p=>{
      const t=teamById.get(p.team_id); if(!t||!D[t.category]) return;
      (D[t.category][t.name] ||= []).push({name:p.name,num:p.number??'',position:p.position||'',captain:!!p.is_captain,photo:p.photo_url||'',id:p.id});
    });

    ['A','B','C'].forEach(g=>groups[g].splice(0,groups[g].length,...teams.filter(t=>t.category==='الكبار'&&t.group_name===g).map(t=>t.name)));

    const evByMatch=new Map();
    events.forEach(e=>{ const a=evByMatch.get(e.match_id)||[]; a.push(e); evByMatch.set(e.match_id,a); });
    const mapped=matches.map(m=>{
      const e=(evByMatch.get(m.id)||[]).map(x=>({
        type:dbEventToUi(x.type),
        team:teamById.get(x.team_id)?.name||'',
        player:x.player_name||playerById.get(x.player_id)?.name||'',
        assist:x.assist_name||playerById.get(x.assist_player_id)?.name||'',
        minute:x.minute,
        note:x.note||''
      }));
      const motmEvent=e.find(x=>x.type==='motm');
      return {
        id:m.id,cat:m.category,stage:m.stage||'',date:m.match_date||'',time:dbTime(m.match_time),group:m.group_name||'',
        a:m.team_a?.name||teamById.get(m.team_a_id)?.name||'غير محدد',
        b:m.team_b?.name||teamById.get(m.team_b_id)?.name||'غير محدد',
        status:dbStatusToUi(m.status),scoreA:m.score_a,scoreB:m.score_b,venue:m.venue||'',cover:m.cover_image_url||'',events:e,
        motm:motmEvent?{player:motmEvent.player,team:motmEvent.team,position:motmEvent.note||''}:null
      };
    });
    seniorMatches.splice(0,seniorMatches.length,...mapped.filter(m=>m.cat==='الكبار'));
    middleMatches.splice(0,middleMatches.length,...mapped.filter(m=>m.cat==='الوسط'));
    smallMatches.splice(0,smallMatches.length,...mapped.filter(m=>m.cat==='الصغار'));

    Object.keys(refereeAssignments).forEach(k=>delete refereeAssignments[k]);
    (rr.data||[]).forEach(r=>{ refereeAssignments[r.category] ||= {}; refereeAssignments[r.category][r.role]=r.name; });
    ['الكبار','الوسط','الصغار'].forEach(c=>{ refereeAssignments[c] ||= {}; if(!refereeAssignments[c].main) refereeAssignments[c].main='سيتم الإعلان عنه لاحقًا'; if(!refereeAssignments[c].assistant) refereeAssignments[c].assistant='سيتم الإعلان عنه لاحقًا'; });

    if(Array.isArray(news)){
      news.splice(0,news.length,...(nr.data||[]).map(n=>({id:n.id,date:n.publish_date,title:n.title,desc:n.description||'',content:n.content||'',img:n.image_url||'',type:n.type||'',category:n.category||''})));
    }

    try{renderGroups();renderStandings();renderMatches();renderHome();renderNews();renderTeams?.();renderReferees?.();}catch(e){console.warn('Render after Supabase sync',e)}
    document.documentElement.dataset.dataSource='supabase';
  }catch(err){
    console.warn('Supabase unavailable; using bundled official data.',err);
    document.documentElement.dataset.dataSource='bundled';
  }
}

loadOfficialData();
setInterval(loadOfficialData,20000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadOfficialData()});
