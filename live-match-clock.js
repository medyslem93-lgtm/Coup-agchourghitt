(() => {
  "use strict";
  const LIVE = "مباشر";
  let liveMatches = [];
  function kickoff(m){if(!m?.match_date||!m?.match_time)return NaN;return Date.parse(`${m.match_date}T${String(m.match_time).slice(0,8)}Z`)}
  function minute(m){const s=kickoff(m);if(!Number.isFinite(s))return Number(m?.minute)||1;return Math.max(1,Math.floor((Date.now()-s)/60000)+1)}
  function routeId(){return (location.hash.match(/match\/([^/?#]+)/)||[])[1]||""}
  function paint(){
    document.querySelectorAll('[data-route^="match/"]').forEach(card=>{const id=String(card.getAttribute('data-route')||'').replace(/^match\//,'');const m=liveMatches.find(x=>String(x.id)===id);if(!m)return;const n=minute(m);const sm=card.querySelector('.score-block small,.match-score small');if(sm)sm.textContent=`${n}′`;const p=card.querySelector('.status-pill');if(p&&p.textContent.includes(LIVE))p.innerHTML=`<span class="live-dot"></span>${LIVE} · ${n}′`});
    const id=routeId(),m=liveMatches.find(x=>String(x.id)===id);if(!m)return;const n=minute(m);
    document.querySelectorAll('.match-hero,.match-detail,.match-center,.match-overview,.score-hero').forEach(box=>{
      const status=[...box.querySelectorAll('*')].find(el=>el.children.length===0&&el.textContent.trim()===LIVE);
      if(status) status.innerHTML=`${LIVE} · <b class="live-minute">${n}′</b>`;
      const candidates=[...box.querySelectorAll('small,.match-minute,.minute')];
      const zero=candidates.find(el=>/^0[′’']?$/.test(el.textContent.trim()));
      if(zero){zero.classList.add('live-minute');zero.textContent=`${n}′`;}
    });
  }
  async function start(){const c=window.AGCH_CONFIG||{},db=window.AGCH_PUBLIC_SB||window.supabase?.createClient?.(c.supabaseUrl,c.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}});if(!db)return;window.AGCH_PUBLIC_SB=db;async function reload(){const r=await db.from('matches').select('id,status,match_date,match_time,minute').eq('status',LIVE);if(!r.error)liveMatches=r.data||[];paint()}await reload();const root=document.getElementById('appMain');if(root)new MutationObserver(paint).observe(root,{childList:true,subtree:true});setInterval(paint,1000);db.channel('live-match-clock-v2').on('postgres_changes',{event:'*',schema:'public',table:'matches'},reload).subscribe();}
  window.addEventListener('DOMContentLoaded',start,{once:true});
})();
