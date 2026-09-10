(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG||{};
  const main=document.getElementById('appMain');
  const db=window.supabase?.createClient?.(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
  if(!db||!main)return;
  const MIDDLE='4b420e85-19b3-479c-bd79-e0fef79a105f';
  const REPLAY_MS=12000;
  let draw=null,teams=[],channel=null,timer=null,slug='',replayStartedAt=0;
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byId=id=>teams.find(t=>t.id===id);
  const logo=t=>t?.logo_url?`<img src="${esc(t.logo_url)}" alt="${esc(t.name)}">`:`<span>${esc((t?.name||'?').slice(0,1))}</span>`;
  function routeSlug(){const p=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);return p[0]==='tournament'?p[1]:''}
  function fmtCountdown(ms){if(ms<=0)return'00 : 00 : 00';const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=s%60;return [h,m,x].map(v=>String(v).padStart(2,'0')).join(' : ')}
  function isCompleted(){return !!draw&&(draw.status==='completed'||(draw.completed_at&&Date.now()>=new Date(draw.completed_at).getTime()))}
  async function load(){const [{data:d},{data:t},{data:tour}]=await Promise.all([
    db.from('middle_round_three_draws').select('*').eq('tournament_id',MIDDLE).eq('stage','الدور الثالث').maybeSingle(),
    db.from('teams').select('id,name,logo_url').eq('tournament_id',MIDDLE),
    db.from('tournaments').select('id,slug').eq('id',MIDDLE).maybeSingle()
  ]);draw=d;teams=t||[];slug=tour?.slug||'';}
  function participantCards(){return (draw?.participant_team_ids||[]).map(id=>{const t=byId(id);return `<div class="agh-draw-team"><div class="agh-draw-logo">${logo(t)}</div><b>${esc(t?.name||'فريق')}</b></div>`}).join('')}
  function revealCard(id,label,active=true){const t=byId(id);return `<div class="agh-draw-reveal ${active?'shown':'hidden'}"><small>${esc(label)}</small><div class="agh-draw-logo big">${active?logo(t):'<span>?</span>'}</div><b>${active?esc(t?.name||'—'):'قيد السحب...'}</b></div>`}
  function officialLiveElapsed(){if(!draw?.started_at)return 0;return Math.max(0,Date.now()-new Date(draw.started_at).getTime())}
  function replayElapsed(){if(!replayStartedAt)replayStartedAt=Date.now();return Date.now()-replayStartedAt}
  function renderReplay(el,elapsed){const r1=elapsed>=3000,r2=elapsed>=7000,done=elapsed>=REPLAY_MS;
    if(done){renderFinal(el,true);return}
    el.innerHTML=`<div class="agh-draw-head"><div><span>${isCompleted()?'REPLAY':'LIVE NOW'}</span><h2>قرعة الدور الثالث — بطولة الوسط</h2><p>${isCompleted()?'إعادة العرض الرسمي للقرعة المسجلة.':'القرعة جارية الآن بشكل مباشر.'}</p></div><i class="agh-draw-dot live"></i></div><div class="agh-draw-machine"><div class="agh-draw-balls"><span></span><span></span><span></span></div><div class="agh-draw-reveals">${revealCard(draw.semifinal_team_a_id,'الفريق الأول في نصف النهائي',r1)}${revealCard(draw.semifinal_team_b_id,'الفريق الثاني في نصف النهائي',r2)}${r2?revealCard(draw.direct_finalist_team_id,'المتأهل مباشرة إلى النهائي',true):''}</div></div>${isCompleted()?'<div class="agh-draw-proof"><small>هذه إعادة عرض مرئية فقط؛ النتيجة الرسمية محفوظة ولا تتغير.</small></div>':''}`;
  }
  function renderFinal(el,fromReplay=false){const a=byId(draw.semifinal_team_a_id),b=byId(draw.semifinal_team_b_id),direct=byId(draw.direct_finalist_team_id);
    el.innerHTML=`<div class="agh-draw-head"><div><span>OFFICIAL RESULT</span><h2>نتيجة قرعة الدور الثالث</h2><p>القرعة رسمية ومنتهية.</p></div><i class="agh-draw-seal">✓</i></div><div class="agh-draw-result"><div class="agh-draw-semi"><small>نصف النهائي</small><div>${logo(a)}<b>${esc(a?.name||'—')}</b><em>ضد</em>${logo(b)}<b>${esc(b?.name||'—')}</b></div></div><div class="agh-draw-direct"><small>المتأهل مباشرة إلى النهائي</small><div class="agh-draw-logo big">${logo(direct)}</div><b>${esc(direct?.name||'—')}</b></div></div><div class="agh-draw-proof"><span>رمز التحقق</span><code>${esc(draw.verification_hash||'—')}</code><small>${draw.completed_at?new Date(draw.completed_at).toLocaleString('ar-MR'):''}</small></div>${fromReplay?'<button type="button" class="agh-draw-replay-btn">إعادة مشاهدة القرعة</button>':''}`;
    el.querySelector('.agh-draw-replay-btn')?.addEventListener('click',()=>{replayStartedAt=Date.now();render()});
  }
  function render(){if(routeSlug()!==slug)return;const shell=main.querySelector('.page-shell');if(!shell||!draw)return;let el=shell.querySelector('.agh-middle-draw');if(!el){el=document.createElement('section');el.className='section-block agh-middle-draw';shell.appendChild(el)}
    if(draw.status==='pending'){
      replayStartedAt=0;const scheduled=draw.scheduled_at?new Date(draw.scheduled_at).getTime():null;const diff=scheduled?scheduled-Date.now():null;const ready=!scheduled||diff<=0;
      el.innerHTML=`<div class="agh-draw-head"><div><span>LIVE DRAW</span><h2>قرعة الدور الثالث — بطولة الوسط</h2><p>قرعة رسمية موحّدة لجميع الزوار.</p></div><i class="agh-draw-dot"></i></div><div class="agh-draw-participants">${participantCards()}</div><div class="agh-draw-status pending"><b>${ready?'القرعة جاهزة للبدء':'القرعة لم تبدأ بعد'}</b>${scheduled?`<small>${new Date(draw.scheduled_at).toLocaleString('ar-MR')}</small><strong>${fmtCountdown(diff||0)}</strong>`:'<small>سيتم تحديد موعد القرعة من لوحة الإدارة.</small>'}</div>`;return;
    }
    if(draw.status==='live'&&!isCompleted()){
      replayStartedAt=0;renderReplay(el,officialLiveElapsed());
      if(draw.completed_at&&Date.now()>=new Date(draw.completed_at).getTime())db.rpc('finalize_middle_round_three_draw').then(()=>refresh());return;
    }
    renderReplay(el,replayElapsed());
  }
  async function refresh(){try{await load();if(draw?.status!=='completed')replayStartedAt=0;render();if(!channel&&draw){channel=db.channel('middle-round-three-draw-live').on('postgres_changes',{event:'*',schema:'public',table:'middle_round_three_draws',filter:`id=eq.${draw.id}`},p=>{draw=p.new||draw;replayStartedAt=0;render()}).subscribe()}}catch(e){console.warn('Middle draw unavailable',e)}}
  const obs=new MutationObserver(()=>{replayStartedAt=0;setTimeout(render,80)});obs.observe(main,{childList:true,subtree:false});window.addEventListener('hashchange',()=>{replayStartedAt=0;setTimeout(render,120)});timer=setInterval(render,250);refresh();
})();