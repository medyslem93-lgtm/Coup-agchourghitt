(() => {
  "use strict";
  const LIVE = "مباشر";
  let liveMatches = [];
  function kickoff(m){if(!m?.match_date||!m?.match_time)return NaN;return Date.parse(`${m.match_date}T${String(m.match_time).slice(0,8)}Z`)}
  function minute(m){const s=kickoff(m);if(!Number.isFinite(s))return Number(m?.minute)||1;return Math.max(Number(m?.minute)||1,Math.floor((Date.now()-s)/60000)+1)}
  function routeId(){return (location.hash.match(/match\/([^/?#]+)/)||[])[1]||""}
  function setMinute(el,n){if(!el)return;el.classList.add('live-minute');el.textContent=`${n}′`;}
  function paint(){
    document.querySelectorAll('[data-route^="match/"]').forEach(card=>{const id=String(card.getAttribute('data-route')||'').replace(/^match\//,'');const m=liveMatches.find(x=>String(x.id)===id);if(!m)return;const n=minute(m);const sm=card.querySelector('.score-block small,.match-score small,.match-minute,.minute,.live-minute');if(sm)setMinute(sm,n);const p=card.querySelector('.status-pill');if(p&&p.textContent.includes(LIVE))p.innerHTML=`<span class="live-dot"></span>${LIVE} · <b class="live-minute">${n}′</b>`});
    const id=routeId(),m=liveMatches.find(x=>String(x.id)===id);if(!m)return;const n=minute(m);
    document.querySelectorAll('.match-hero,.match-detail,.match-center,.match-overview,.score-hero,#appMain').forEach(box=>{
      box.querySelectorAll('.live-minute,.match-minute,.minute,[data-live-minute]').forEach(el=>setMinute(el,n));
      [...box.querySelectorAll('small,span,b,strong')].forEach(el=>{if(el.children.length)return;const t=el.textContent.trim();if(/^\d{1,3}[′’']$/.test(t)||/^الدقيقة\s*\d{1,3}$/.test(t))setMinute(el,n);});
      [...box.querySelectorAll('*')].filter(el=>el.children.length===0&&el.textContent.trim()===LIVE).forEach(status=>status.innerHTML=`${LIVE} · <b class="live-minute">${n}′</b>`);
    });
  }
  async function start(){const c=window.AGCH_CONFIG||{},db=window.supabase?.createClient?.(c.supabaseUrl,c.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}});if(!db)return;async function reload(){const r=await db.from('matches').select('id,status,match_date,match_time,minute').eq('status',LIVE);if(!r.error)liveMatches=r.data||[];paint()}await reload();const root=document.getElementById('appMain');if(root)new MutationObserver(paint).observe(root,{childList:true,subtree:true});setInterval(paint,1000);setInterval(reload,15000);db.channel('live-match-clock-v3').on('postgres_changes',{event:'*',schema:'public',table:'matches'},reload).subscribe();}
  window.addEventListener('DOMContentLoaded',start,{once:true});
})();
