(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG||{};
  const main=document.getElementById('appMain');
  const db=window.supabase?.createClient?.(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
  if(!db||!main)return;
  const MIDDLE='4b420e85-19b3-479c-bd79-e0fef79a105f';
  let draw=null,teams=[],channel=null,timer=null,slug='';
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byId=id=>teams.find(t=>t.id===id);
  const logo=t=>t?.logo_url?`<img src="${esc(t.logo_url)}" alt="${esc(t.name)}">`:`<span>${esc((t?.name||'?').slice(0,1))}</span>`;
  function routeSlug(){const p=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);return p[0]==='tournament'?p[1]:''}
  function fmtCountdown(ms){if(ms<=0)return'00 : 00 : 00';const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=s%60;return [h,m,x].map(v=>String(v).padStart(2,'0')).join(' : ')}
  function effectiveStage(){if(!draw)return'pending';const now=Date.now();if(draw.status==='completed'||(draw.completed_at&&now>=new Date(draw.completed_at).getTime()))return'completed';if(draw.status==='live')return'live';return'pending'}
  async function load(){const [{data:d},{data:t},{data:tour}]=await Promise.all([
    db.from('middle_round_three_draws').select('*').eq('tournament_id',MIDDLE).eq('stage','الدور الثالث').maybeSingle(),
    db.from('teams').select('id,name,logo_url').eq('tournament_id',MIDDLE),
    db.from('tournaments').select('id,slug').eq('id',MIDDLE).maybeSingle()
  ]);draw=d;teams=t||[];slug=tour?.slug||'';}
  function participantCards(){return (draw?.participant_team_ids||[]).map(id=>{const t=byId(id);return `<div class="agh-draw-team"><div class="agh-draw-logo">${logo(t)}</div><b>${esc(t?.name||'فريق')}</b></div>`}).join('')}
  function revealCard(id,label,active=true){const t=byId(id);return `<div class="agh-draw-reveal ${active?'shown':'hidden'}"><small>${esc(label)}</small><div class="agh-draw-logo big">${active?logo(t):'<span>?</span>'}</div><b>${active?esc(t?.name||'—'):'قيد السحب...'}</b></div>`}
  function render(){if(routeSlug()!==slug)return;const shell=main.querySelector('.page-shell');if(!shell||!draw)return;let el=shell.querySelector('.agh-middle-draw');if(!el){el=document.createElement('section');el.className='section-block agh-middle-draw';shell.appendChild(el)}
    const stage=effectiveStage(),now=Date.now();
    if(stage==='pending'){
      const scheduled=draw.scheduled_at?new Date(draw.scheduled_at).getTime():null;const diff=scheduled?scheduled-now:null;const ready=!scheduled||diff<=0;
      el.innerHTML=`<div class="agh-draw-head"><div><span>LIVE DRAW</span><h2>قرعة الدور الثالث — بطولة الوسط</h2><p>قرعة رسمية موحّدة لجميع الزوار.</p></div><i class="agh-draw-dot"></i></div><div class="agh-draw-participants">${participantCards()}</div><div class="agh-draw-status pending"><b>${ready?'القرعة جاهزة للبدء':'القرعة لم تبدأ بعد'}</b>${scheduled?`<small>${new Date(draw.scheduled_at).toLocaleString('ar-MR')}</small><strong>${fmtCountdown(diff||0)}</strong>`:'<small>سيتم تحديد موعد القرعة من لوحة الإدارة.</small>'}</div>`;
      return;
    }
    if(stage==='live'){
      const r1=draw.reveal_first_at&&now>=new Date(draw.reveal_first_at).getTime(),r2=draw.reveal_second_at&&now>=new Date(draw.reveal_second_at).getTime();
      el.innerHTML=`<div class="agh-draw-head"><div><span>LIVE NOW</span><h2>قرعة الدور الثالث — بطولة الوسط</h2><p>القرعة جارية الآن بشكل مباشر.</p></div><i class="agh-draw-dot live"></i></div><div class="agh-draw-machine"><div class="agh-draw-balls"><span></span><span></span><span></span></div><div class="agh-draw-reveals">${revealCard(draw.semifinal_team_a_id,'الفريق الأول في نصف النهائي',r1)}${revealCard(draw.semifinal_team_b_id,'الفريق الثاني في نصف النهائي',r2)}${r2?revealCard(draw.direct_finalist_team_id,'المتأهل مباشرة إلى النهائي',true):''}</div></div>`;
      if(draw.completed_at&&now>=new Date(draw.completed_at).getTime())db.rpc('finalize_middle_round_three_draw').then(()=>refresh());
      return;
    }
    const a=byId(draw.semifinal_team_a_id),b=byId(draw.semifinal_team_b_id),direct=byId(draw.direct_finalist_team_id);
    el.innerHTML=`<div class="agh-draw-head"><div><span>OFFICIAL RESULT</span><h2>نتيجة قرعة الدور الثالث</h2><p>القرعة رسمية ومنتهية.</p></div><i class="agh-draw-seal">✓</i></div><div class="agh-draw-result"><div class="agh-draw-semi"><small>نصف النهائي</small><div>${logo(a)}<b>${esc(a?.name||'—')}</b><em>ضد</em>${logo(b)}<b>${esc(b?.name||'—')}</b></div></div><div class="agh-draw-direct"><small>المتأهل مباشرة إلى النهائي</small><div class="agh-draw-logo big">${logo(direct)}</div><b>${esc(direct?.name||'—')}</b></div></div><div class="agh-draw-proof"><span>رمز التحقق</span><code>${esc(draw.verification_hash||'—')}</code><small>${draw.completed_at?new Date(draw.completed_at).toLocaleString('ar-MR'):''}</small></div>`;
  }
  async function refresh(){try{await load();render();if(!channel&&draw){channel=db.channel('middle-round-three-draw-live').on('postgres_changes',{event:'*',schema:'public',table:'middle_round_three_draws',filter:`id=eq.${draw.id}`},p=>{draw=p.new||draw;render()}).subscribe()}}catch(e){console.warn('Middle draw unavailable',e)}}
  const obs=new MutationObserver(()=>setTimeout(render,80));obs.observe(main,{childList:true,subtree:false});window.addEventListener('hashchange',()=>setTimeout(render,120));timer=setInterval(render,1000);refresh();
})();