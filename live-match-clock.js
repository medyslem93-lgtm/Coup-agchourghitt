(() => {
  "use strict";
  const LIVE = "مباشر";
  let liveMatches = [];
  function kickoff(m){if(!m?.match_date||!m?.match_time)return NaN;return Date.parse(`${m.match_date}T${String(m.match_time).slice(0,8)}Z`)}
  function minute(m){const s=kickoff(m);if(!Number.isFinite(s))return Number(m?.minute)||1;return Math.max(Number(m?.minute)||1,Math.floor((Date.now()-s)/60000)+1)}
  function routeId(){return (location.hash.match(/match\/([^/?#]+)/)||[])[1]||""}
  function setMinute(el,n){if(!el)return;const value=`${n}′`;if(el.textContent===value&&el.classList.contains('live-minute'))return;el.classList.add('live-minute');el.textContent=value;}
  function paint(){
    document.querySelectorAll('[data-route^="match/"]').forEach(card=>{const id=String(card.getAttribute('data-route')||'').replace(/^match\//,'');const m=liveMatches.find(x=>String(x.id)===id);if(!m)return;const n=minute(m);const sm=card.querySelector('.score-block small,.match-score small,.match-minute,.minute,.live-minute');if(sm)setMinute(sm,n);const p=card.querySelector('.status-pill');if(p&&p.textContent.includes(LIVE)&&p.querySelector('.live-minute')?.textContent!==`${n}′`)p.innerHTML=`<span class="live-dot"></span>${LIVE} · <b class="live-minute">${n}′</b>`});
    const id=routeId(),m=liveMatches.find(x=>String(x.id)===id);if(!m)return;const n=minute(m);
    document.querySelectorAll('.match-hero,.match-detail,.match-center,.match-overview,.score-hero,#appMain').forEach(box=>{
      box.querySelectorAll('.live-minute,.match-minute,.minute,[data-live-minute]').forEach(el=>setMinute(el,n));
      [...box.querySelectorAll('small,span,b,strong')].forEach(el=>{if(el.children.length)return;const t=el.textContent.trim();if(/^\d{1,3}[′’']$/.test(t)||/^الدقيقة\s*\d{1,3}$/.test(t))setMinute(el,n);});
      [...box.querySelectorAll('*')].filter(el=>el.children.length===0&&el.textContent.trim()===LIVE).forEach(status=>status.innerHTML=`${LIVE} · <b class="live-minute">${n}′</b>`);
    });
  }
  function start(){
    const root=document.getElementById('appMain');
    if(root){let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;paint()})}).observe(root,{childList:true,subtree:true})}
    window.addEventListener('agh:live-state',event=>{
      liveMatches=(event.detail?.matches||[]).filter(match=>match.status===LIVE);
      paint();
    });
    setInterval(()=>{if(!document.hidden)paint()},1000);
  }
  window.addEventListener('DOMContentLoaded',start,{once:true});
})();
