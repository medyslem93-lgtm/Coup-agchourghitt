(() => {
  'use strict';

  const normalize = (value = '') => String(value).trim().replace(/ـ/g, '').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/\s+/g, ' ');
  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function installMobileLayoutFix(){
    if(document.getElementById('agchTournamentMobileLayoutFix')) return;
    const style=document.createElement('style');
    style.id='agchTournamentMobileLayoutFix';
    style.textContent=`
      .tx-enhanced .app-tabs.tournament-subtabs,.tx-enhanced .tournament-subtabs{
        display:flex!important;flex-wrap:nowrap!important;justify-content:flex-start!important;gap:8px!important;
        width:100%!important;max-width:100%!important;box-sizing:border-box!important;overflow-x:auto!important;overflow-y:hidden!important;
        padding:8px 12px!important;scroll-padding-inline:12px;scroll-snap-type:x proximity;overscroll-behavior-inline:contain;
        -webkit-overflow-scrolling:touch;scrollbar-width:none;
      }
      .tx-enhanced .tournament-subtabs::-webkit-scrollbar{display:none!important}
      .tx-enhanced .tournament-subtabs .tab-btn{flex:0 0 auto!important;min-width:104px!important;width:auto!important;max-width:none!important;scroll-snap-align:center;white-space:nowrap}
      .tx-enhanced #appMain,.tx-enhanced #home-view{padding-bottom:calc(112px + env(safe-area-inset-bottom))!important}
      @media(max-width:640px){
        .tx-enhanced .tournament-subtabs{margin-inline:0!important;padding-inline:10px!important}
        .tx-enhanced .tournament-subtabs .tab-btn{min-width:96px!important;padding-inline:16px!important}
        #tournamentBracketRoot{margin-inline:0!important;max-width:100%!important;overflow:hidden}
        .rtc-stage-tabs{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
        .rtc-stage-tabs::-webkit-scrollbar{display:none}
      }
    `;
    document.head.appendChild(style);
  }

  function hasRealFinishedFinal(bracket) {
    const rounds = [...bracket.querySelectorAll('.rtc-round')];
    return rounds.some(round => {
      const label = normalize(round.querySelector('.rtc-round-head b')?.textContent || '');
      if (label !== 'النهائي' && label !== 'نهائي') return false;
      return [...round.querySelectorAll('.rtc-match')].some(match => normalize(match.querySelector('.rtc-match-head b')?.textContent || '') === 'انتهت');
    });
  }

  function fixChampionBanner() {
    document.querySelectorAll('.rtc-bracket-shell').forEach(bracket => {
      const champion = bracket.querySelector(':scope > .rtc-champion');
      if (champion && !hasRealFinishedFinal(bracket)) champion.remove();
    });
    document.querySelectorAll('.rtc-road-shell').forEach(road => {
      const champion = road.querySelector(':scope > .rtc-champion');
      if (!champion) return;
      const finalStep = [...road.querySelectorAll('.rtc-road-step')].find(step => {
        const label = normalize(step.querySelector('.rtc-stage-badge')?.childNodes?.[0]?.textContent || '');
        return label === 'النهائي' || label === 'نهائي';
      });
      if (!finalStep || !normalize(finalStep.textContent).includes('🏆 بطل')) champion.remove();
    });
  }

  const isFinal = label => ['النهائي','نهائي','المباراه النهائيه'].includes(normalize(label));
  const isKnockout = label => {
    const s=normalize(label);
    if(!s || s.includes('دوري المجموعات') || s.includes('مرحله المجموعات')) return false;
    return isFinal(label)||['نصف','ربع','ثمن','دور 16','الدور الاول','الدور الثاني','المركز الثالث','الفاصله'].some(k=>s.includes(normalize(k)));
  };
  const stageRank = label => {
    const s=normalize(label);
    if(s.includes('الدور الاول')) return 10;
    if(s.includes('الدور الثاني')) return 20;
    if(s.includes('دور 16')||s.includes('ثمن')) return 30;
    if(s.includes('ربع')) return 40;
    if(s.includes('نصف')) return 50;
    if(s.includes('المركز الثالث')) return 60;
    if(isFinal(label)) return 70;
    return 35;
  };
  const currentTournamentSlug = () => {
    const match=location.hash.match(/^#\/?tournament\/([^/]+)(?:\/([^/]+))?/i);
    return match && (!match[2] || match[2]==='overview') ? decodeURIComponent(match[1]) : '';
  };
  const winnerId = m => {
    if(m.status!=='انتهت') return null;
    const pa=Number(m.home_penalty_score), pb=Number(m.away_penalty_score);
    if(Number.isFinite(pa)&&Number.isFinite(pb)&&pa!==pb) return pa>pb?m.team_a_id:m.team_b_id;
    const a=Number(m.score_a), b=Number(m.score_b);
    if(Number.isFinite(a)&&Number.isFinite(b)&&a!==b) return a>b?m.team_a_id:m.team_b_id;
    return null;
  };
  const teamLogo = team => team?.logo_url ? `<img src="${esc(team.logo_url)}" alt="">` : '<span class="rtc-logo-fallback">⚽</span>';
  const statusText = m => m.status==='مباشر'?`🔴 LIVE${m.minute!=null?` • ${esc(m.minute)}′`:''}`:m.status==='مؤجلة'?'⏸ مؤجلة':m.status==='قادمة'?'⏳ قادمة':esc(m.status||'انتهت');

  function snapshotMatchCard(m,teams){
    const a=teams.get(m.team_a_id)||{name:m.team_a_placeholder||'لم يتحدد بعد',logo_url:''};
    const b=teams.get(m.team_b_id)||{name:m.team_b_placeholder||'لم يتحدد بعد',logo_url:''};
    const win=winnerId(m);
    const pending=['قادمة','مؤجلة','ملغاة'].includes(m.status);
    const penalties=(m.home_penalty_score!=null&&m.away_penalty_score!=null)?`ركلات الترجيح: ${m.home_penalty_score} — ${m.away_penalty_score}`:'';
    return `<article class="rtc-match ${isFinal(m.stage||m.round_name||'')?'is-final':''}" data-rtc-match="${esc(m.id)}" tabindex="0">
      <div class="rtc-match-head"><span>${esc(m.stage||m.round_name||'مرحلة إقصائية')}</span><b>${statusText(m)}</b></div>
      <div class="rtc-team-row ${win===m.team_a_id?'is-winner':''}">${teamLogo(a)}<span>${esc(a.name)}</span><strong>${pending?'':esc(m.score_a??'')}</strong></div>
      <div class="rtc-team-row ${win===m.team_b_id?'is-winner':''}">${teamLogo(b)}<span>${esc(b.name)}</span><strong>${pending?'':esc(m.score_b??'')}</strong></div>
      ${penalties?`<div class="rtc-penalties">${esc(penalties)}</div>`:''}
      <div class="rtc-match-foot"><span>${esc(m.match_date||'موعد غير محدد')}${m.match_time?` • ${esc(String(m.match_time).slice(0,5))}`:''}</span><span>تفاصيل المباراة ←</span></div>
    </article>`;
  }

  function renderSnapshotBracket(root,tournament,matches,teams,requested=''){
    const grouped=new Map();
    matches.filter(m=>isKnockout(m.stage||m.round_name||'')).forEach(m=>{
      const label=m.stage||m.round_name||'مرحلة إقصائية';
      if(!grouped.has(label)) grouped.set(label,[]);
      grouped.get(label).push(m);
    });
    const stages=[...grouped.entries()].map(([label,items])=>({label,items:items.sort((a,b)=>Number(a.display_order??999)-Number(b.display_order??999)),rank:stageRank(label)})).sort((a,b)=>a.rank-b.rank);
    if(!stages.length){root.innerHTML='<section class="rtc-shell rtc-bracket-shell"><div class="rtc-title"><span>TOURNAMENT BRACKET</span><h2>طريق النهائي</h2></div><div class="rtc-empty">لم تبدأ الأدوار الإقصائية بعد.</div></section>';return;}
    let selected=stages.find(s=>s.label===requested)||stages.find(s=>s.items.some(m=>m.status==='مباشر'))||[...stages].reverse().find(s=>s.items.some(m=>m.status==='قادمة'||m.status==='مؤجلة'))||[...stages].reverse().find(s=>s.items.some(m=>m.status==='انتهت'))||stages[0];
    const tabs=stages.map((stage,index)=>`<button type="button" class="rtc-stage-tab ${stage.label===selected.label?'is-active':''}" data-agch-snapshot-stage="${index}" aria-pressed="${stage.label===selected.label?'true':'false'}">${esc(stage.label)}</button>`).join('');
    root.innerHTML=`<section class="rtc-shell rtc-bracket-shell"><div class="rtc-title"><span>TOURNAMENT BRACKET</span><h2>طريق النهائي</h2><p>${esc(tournament.name||'كأس أغشوركيت')}</p></div><div class="rtc-stage-tabs" role="tablist" aria-label="أدوار البطولة">${tabs}</div><div class="rtc-bracket"><section class="rtc-round ${isFinal(selected.label)?'is-final-round':''}"><div class="rtc-round-head"><b>${esc(selected.label)}</b><span>${selected.items.length} ${selected.items.length===1?'مباراة':'مباريات'}</span></div><div class="rtc-round-list">${selected.items.map(m=>snapshotMatchCard(m,teams)).join('')}</div></section></div></section>`;
    root.dataset.agchSnapshotRepair='1';
    root._agchSnapshotState={tournament,matches,teams,stages};
  }

  let repairing=false;
  async function repairBracketIfNeeded(force=false){
    const slug=currentTournamentSlug();
    const root=document.getElementById('tournamentBracketRoot');
    if(!slug||!root||repairing) return;
    const failed=!!root.querySelector('.rtc-error');
    const stuck=!!root.querySelector('.rtc-loading');
    if(!force&&!failed&&!stuck) return;
    repairing=true;
    try{
      const response=await fetch('/api/public-snapshot',{headers:{Accept:'application/json'},cache:'no-store'});
      if(!response.ok) throw new Error(`snapshot_${response.status}`);
      const snapshot=await response.json();
      const tournament=(snapshot.tournaments||[]).find(t=>t.slug===slug);
      if(!tournament) throw new Error('tournament_not_found');
      const teams=new Map((snapshot.teams||[]).map(team=>[team.id,team]));
      const matches=(snapshot.matches||[]).filter(match=>match.tournament_id===tournament.id);
      renderSnapshotBracket(root,tournament,matches,teams);
    }catch(error){console.warn('Bracket snapshot repair failed',error);}
    finally{repairing=false;}
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-agch-snapshot-stage]');
    if(!button) return;
    const root=document.getElementById('tournamentBracketRoot');
    const state=root?._agchSnapshotState;
    const stage=state?.stages?.[Number(button.dataset.agchSnapshotStage)];
    if(root&&state&&stage) renderSnapshotBracket(root,state.tournament,state.matches,state.teams,stage.label);
  });

  installMobileLayoutFix();
  const observer = new MutationObserver(()=>{fixChampionBanner();setTimeout(()=>repairBracketIfNeeded(false),0);});
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => {setTimeout(fixChampionBanner,0);setTimeout(()=>repairBracketIfNeeded(true),1400);});
  document.addEventListener('DOMContentLoaded',()=>{fixChampionBanner();setTimeout(()=>repairBracketIfNeeded(true),1600);});
  fixChampionBanner();
  setTimeout(()=>repairBracketIfNeeded(true),1800);
})();
