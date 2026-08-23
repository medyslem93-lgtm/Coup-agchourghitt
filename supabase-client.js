/* Supabase live bridge: one source of truth + realtime updates + safe bundled fallback. */
const SUPABASE_URL='https://pncjlbsflsgshmzgiiqu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_fnl_v042_IqkcFPpP5oVLA_F_CrpRZX';
const dbClient=window.supabase?.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
window.aghDb=dbClient;
window.aghData=window.aghData||{};

const dbStatusToUi=s=>s==='انتهت'?'FINISHED':s==='مباشر'?'LIVE':s==='مؤجلة'?'POSTPONED':s==='ملغاة'?'CANCELLED':'UPCOMING';
const dbEventToUi=t=>({'هدف':'goal','هدف عكسي':'own_goal','ركلة جزاء مسجلة':'penalty_goal','ركلة جزاء ضائعة':'penalty_miss','تمريرة حاسمة':'assist','بطاقة صفراء':'yellow','بطاقة حمراء':'red','تبديل':'sub','رجل المباراة':'motm','بداية المباراة':'kickoff','نهاية الشوط':'halftime','نهاية المباراة':'fulltime'}[t]||t);
const dbTime=t=>t?String(t).slice(0,5):'';
const assetUrl=u=>!u?'':(/^https?:\/\//i.test(u)?u:u.replace(/^\.\//,''));
const escHtml=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let dbLoading=false,dbReloadTimer=null;

async function loadOfficialData(){
  if(!dbClient||dbLoading)return;
  dbLoading=true;
  try{
    const [tr,pr,mr,er,sr,nr,rr,ar,lr,lpr,medr]=await Promise.all([
      dbClient.from('teams').select('*').order('category').order('name'),
      dbClient.from('players').select('*').order('created_at'),
      dbClient.from('matches').select('*,team_a:teams!matches_team_a_id_fkey(id,name,logo_url),team_b:teams!matches_team_b_id_fkey(id,name,logo_url)').order('match_date',{ascending:true,nullsFirst:false}),
      dbClient.from('match_events').select('*').order('created_at'),
      dbClient.from('match_stats').select('*'),
      dbClient.from('news').select('*').order('publish_date',{ascending:false}),
      dbClient.from('referee_assignments').select('*').order('category'),
      dbClient.from('awards').select('*').order('award_date',{ascending:false,nullsFirst:false}),
      dbClient.from('match_lineups').select('*'),
      dbClient.from('match_lineup_players').select('*').order('sort_order',{ascending:true,nullsFirst:false}),
      dbClient.from('media_assets').select('*').order('created_at',{ascending:false})
    ]);
    const all=[tr,pr,mr,er,sr,nr,rr,ar,lr,lpr,medr],failed=all.find(x=>x.error);if(failed)throw failed.error;

    const teams=tr.data||[],players=pr.data||[],matches=mr.data||[],events=er.data||[],stats=sr.data||[];
    const teamById=new Map(teams.map(t=>[t.id,t])),playerById=new Map(players.map(p=>[p.id,p])),statsByMatch=new Map(stats.map(s=>[s.match_id,s]));

    teams.forEach(t=>{
      if(t.logo_url)embeddedLogos[t.name]=assetUrl(t.logo_url);
      if(typeof teamMeta==='object')teamMeta[t.name]={...(teamMeta[t.name]||{}),coach:t.coach||'',captain:t.captain||''};
    });

    D={الكبار:{},الوسط:{},الصغار:{}};
    teams.forEach(t=>{if(D[t.category])D[t.category][t.name]=[]});
    players.forEach(p=>{const t=teamById.get(p.team_id);if(!t||!D[t.category])return;(D[t.category][t.name]||=[]).push({id:p.id,name:p.name,num:p.number??'',position:p.position||'',captain:!!p.is_captain,photo:assetUrl(p.photo_url||''),notes:p.notes||''})});

    ['A','B','C'].forEach(g=>groups[g].splice(0,groups[g].length,...teams.filter(t=>t.category==='الكبار'&&t.group_name===g).map(t=>t.name)));

    const evByMatch=new Map();events.forEach(e=>{const a=evByMatch.get(e.match_id)||[];a.push(e);evByMatch.set(e.match_id,a)});
    const mapped=matches.map(m=>{
      const e=(evByMatch.get(m.id)||[]).map(x=>({type:dbEventToUi(x.type),team:teamById.get(x.team_id)?.name||'',player:x.player_name||playerById.get(x.player_id)?.name||'',assist:x.assist_name||playerById.get(x.assist_player_id)?.name||'',minute:x.minute,note:x.note||''}));
      const motm=e.find(x=>x.type==='motm');
      return {id:m.id,cat:m.category,stage:m.stage||'',date:m.match_date||'',time:dbTime(m.match_time),group:m.group_name||'',a:m.team_a?.name||teamById.get(m.team_a_id)?.name||'غير محدد',b:m.team_b?.name||teamById.get(m.team_b_id)?.name||'غير محدد',status:dbStatusToUi(m.status),scoreA:m.score_a,scoreB:m.score_b,venue:m.venue||'',minute:m.minute,cover:assetUrl(m.cover_image_url||''),events:e,stats:statsByMatch.get(m.id)||null,motm:motm?{player:motm.player,team:motm.team,position:motm.note||''}:null};
    });
    seniorMatches.splice(0,seniorMatches.length,...mapped.filter(m=>m.cat==='الكبار'));
    middleMatches.splice(0,middleMatches.length,...mapped.filter(m=>m.cat==='الوسط'));
    smallMatches.splice(0,smallMatches.length,...mapped.filter(m=>m.cat==='الصغار'));

    Object.keys(refereeAssignments).forEach(k=>delete refereeAssignments[k]);
    (rr.data||[]).forEach(r=>{refereeAssignments[r.category]||={};refereeAssignments[r.category][r.role]=r.name});
    ['الكبار','الوسط','الصغار'].forEach(c=>{refereeAssignments[c]||={};refereeAssignments[c].main||='سيتم الإعلان عنه لاحقًا';refereeAssignments[c].assistant||='سيتم الإعلان عنه لاحقًا'});

    if(Array.isArray(news))news.splice(0,news.length,...(nr.data||[]).map(n=>({id:n.id,date:n.publish_date,title:n.title,desc:n.description||'',content:n.content||'',img:assetUrl(n.image_url||'assets/tournament.jpg'),video:assetUrl(n.video_url||''),type:n.type||'',category:n.category||''})));

    window.aghData={teams,players,matches:mapped,events,stats,news:nr.data||[],referees:rr.data||[],awards:ar.data||[],lineups:lr.data||[],lineupPlayers:lpr.data||[],media:medr.data||[],updatedAt:new Date().toISOString()};

    try{renderGroups?.();renderStandings?.();renderMatches?.();renderHome?.();renderNews?.();renderTeams?.();renderReferees?.();renderFavorite?.()}catch(e){console.warn('Render after Supabase sync',e)}
    document.documentElement.dataset.dataSource='supabase';
    document.documentElement.dataset.lastSync=String(Date.now());
  }catch(err){console.warn('Supabase unavailable; using bundled official data.',err);document.documentElement.dataset.dataSource='bundled'}
  finally{dbLoading=false}
}

function scheduleDbReload(){clearTimeout(dbReloadTimer);dbReloadTimer=setTimeout(loadOfficialData,250)}

if(typeof newsCard==='function')newsCard=function(n){const hasVideo=!!n.video;return `<button class="card news-card ${hasVideo?'news-card-video':''}" onclick="openArticle('${n.id}')"><div style="position:relative"><img src="${n.img||'assets/tournament.jpg'}" loading="lazy" onerror="this.onerror=null;this.src='assets/tournament.jpg'">${hasVideo?'<span class="video-pill">▶ فيديو</span>':''}</div><div class="news-body"><h3>${escHtml(n.title)}</h3><p>${escHtml(n.desc)}</p><small>${escHtml(n.date||'')}</small></div></button>`};
if(typeof openArticle==='function')openArticle=function(id){const n=news.find(x=>String(x.id)===String(id));if(!n)return;const video=n.video?`<video class="article-video" controls playsinline preload="metadata" poster="${n.img||'assets/tournament.jpg'}"><source src="${n.video}" type="video/mp4">المتصفح لا يدعم تشغيل الفيديو.</video>`:'';const body=n.content?`<p>${escHtml(n.content).replace(/\n/g,'<br>')}</p>`:(n.desc?`<p>${escHtml(n.desc)}</p>`:'');showSheet(`<div class="article"><div class="backrow"><button onclick="closeSheet()">إغلاق</button><button onclick="shareText('${escHtml(n.title)}')">مشاركة</button></div>${video||`<img class="article-cover" src="${n.img||'assets/tournament.jpg'}">`}<h1>${escHtml(n.title)}</h1><small style="color:var(--gold)">${escHtml(n.date||'')}</small>${body}</div>`)};

if(!document.getElementById('agh-live-style'))document.head.insertAdjacentHTML('beforeend','<style id="agh-live-style">.news-card>div:first-child{position:relative}.video-pill{position:absolute;left:10px;bottom:10px;background:#071713e8;color:#fff;border:1px solid #ffffff25;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:800}.article-video{width:100%;max-height:70vh;background:#000;border-radius:20px;display:block}.news-card-video img{filter:brightness(.86)}</style>');

loadOfficialData();
if(dbClient){
  const ch=dbClient.channel('aghchorguit-public-live');
  ['teams','players','matches','match_events','match_stats','news','referee_assignments','awards','match_lineups','match_lineup_players','media_assets'].forEach(table=>ch.on('postgres_changes',{event:'*',schema:'public',table},scheduleDbReload));
  ch.subscribe(status=>{document.documentElement.dataset.realtime=status==='SUBSCRIBED'?'on':'connecting'});
  window.aghRealtimeChannel=ch;
}
setInterval(loadOfficialData,60000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadOfficialData()});
window.addEventListener('online',loadOfficialData);
