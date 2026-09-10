(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG||{}, main=document.getElementById('appMain');
  if(!main||!cfg.supabaseUrl||!cfg.supabaseKey)return;
  const headers={apikey:cfg.supabaseKey,Authorization:`Bearer ${cfg.supabaseKey}`};
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let data=null;
  async function loadData(){
    const [t,r,m,teams]=await Promise.all([
      fetch(`${cfg.supabaseUrl}/rest/v1/tournaments?select=id,slug,name,short_name`,{headers,cache:'no-store'}),
      fetch(`${cfg.supabaseUrl}/rest/v1/referee_assignments?select=id,tournament_id,category,role,name,photo_url,match_id&order=name.asc`,{headers,cache:'no-store'}),
      fetch(`${cfg.supabaseUrl}/rest/v1/matches?select=id,tournament_id,team_a_id,team_b_id,match_date,match_time,venue,stage,status,score_a,score_b&order=match_date.desc`,{headers,cache:'no-store'}),
      fetch(`${cfg.supabaseUrl}/rest/v1/teams?select=id,name,logo_url`,{headers,cache:'no-store'})
    ]);
    if(!t.ok||!r.ok||!m.ok||!teams.ok)throw new Error('referee profile data unavailable');
    data={tournaments:await t.json(),refs:await r.json(),matches:await m.json(),teams:await teams.json()};return data;
  }
  const slug=()=>{const p=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);return p[0]==='tournament'?p[1]:''};
  const norm=v=>String(v||'').trim().replace(/\s+/g,' ').toLowerCase();
  const team=id=>data?.teams.find(x=>x.id===id);
  function assignmentsFor(ref){return data.refs.filter(x=>x.match_id&&norm(x.name)===norm(ref.name));}
  function card(ref){const n=assignmentsFor(ref).length,label=ref.role==='main'?'حكم رئيسي':'حكم مساعد',avatar=ref.photo_url?`<img src="${esc(ref.photo_url)}" alt="${esc(ref.name)}" loading="lazy">`:'⚖️';return `<button type="button" class="agh-referee-card" data-referee="${esc(ref.id)}"><div class="agh-referee-avatar">${avatar}</div><div class="agh-referee-copy"><b>${esc(ref.name)}</b><small>${label}</small><span>${n} مباراة</span></div><i>‹</i></button>`}
  function matchCard(a){const m=data.matches.find(x=>x.id===a.match_id);if(!m)return'';const A=team(m.team_a_id),B=team(m.team_b_id),score=m.status==='انتهت'?`${m.score_a??0} - ${m.score_b??0}`:'—';return `<button type="button" class="agh-ref-match" data-match-id="${esc(m.id)}"><div><small>${esc(m.match_date||'موعد غير محدد')} · ${esc((m.match_time||'').slice(0,5))}</small><b>${esc(A?.name||'فريق')} <em>${score}</em> ${esc(B?.name||'فريق')}</b><span>${esc(m.stage||'مباراة')} ${m.venue?'· '+esc(m.venue):''}</span></div><strong>${a.role==='main'?'رئيسي':'مساعد'}</strong></button>`}
  function openProfile(ref){const all=assignmentsFor(ref);const mainCount=all.filter(x=>x.role==='main').length,assistCount=all.filter(x=>x.role==='assistant').length;const avatar=ref.photo_url?`<img src="${esc(ref.photo_url)}" alt="${esc(ref.name)}">`:'⚖️';let modal=document.getElementById('aghRefModal');if(!modal){modal=document.createElement('div');modal.id='aghRefModal';modal.className='agh-ref-modal';document.body.appendChild(modal)}modal.innerHTML=`<div class="agh-ref-sheet"><button class="agh-ref-close" type="button">×</button><div class="agh-ref-profile"><div class="agh-ref-profile-photo">${avatar}</div><div><small>REFEREE PROFILE</small><h2>${esc(ref.name)}</h2><p>${ref.role==='main'?'حكم رئيسي':'حكم مساعد'}</p></div></div><div class="agh-ref-stats"><div><b>${all.length}</b><span>المباريات</span></div><div><b>${mainCount}</b><span>حكم رئيسي</span></div><div><b>${assistCount}</b><span>حكم مساعد</span></div></div><h3>المباريات التي قام بتحكيمها</h3><div class="agh-ref-matches">${all.length?all.map(matchCard).join(''):'<p class="agh-ref-empty">لا توجد مباريات مسجلة لهذا الحكم حتى الآن.</p>'}</div></div>`;modal.classList.add('open')}
  async function inject(){const s=slug();if(!s)return;main.querySelector('.agh-referees-section')?.remove();try{await loadData();const tournament=data.tournaments.find(t=>t.slug===s);if(!tournament)return;const rows=data.refs.filter(r=>!r.match_id&&r.tournament_id===tournament.id);if(!rows.length)return;const shell=main.querySelector('.page-shell');if(!shell)return;const mains=rows.filter(r=>r.role==='main'),assistants=rows.filter(r=>r.role==='assistant');const section=document.createElement('section');section.className='section-block agh-referees-section';section.innerHTML=`<div class="agh-referees-heading"><div><span>OFFICIALS</span><h2>حكام البطولة</h2><p>اضغط على أي حكم لعرض إحصائياته والمباريات التي أدارها.</p></div><div class="agh-whistle">◉</div></div><div class="agh-referee-groups"><div class="agh-referee-group"><div class="agh-referee-group-title"><b>الحكام الرئيسيون</b><span>${mains.length}</span></div><div class="agh-referee-grid">${mains.map(card).join('')}</div></div><div class="agh-referee-group"><div class="agh-referee-group-title"><b>الحكام المساعدون</b><span>${assistants.length}</span></div><div class="agh-referee-grid">${assistants.map(card).join('')}</div></div></div>`;shell.appendChild(section)}catch(e){console.warn('Referees section skipped',e)}}
  document.addEventListener('click',e=>{const c=e.target.closest('[data-referee]');if(c&&data){const ref=data.refs.find(x=>x.id===c.dataset.referee);if(ref)openProfile(ref)}if(e.target.closest('.agh-ref-close')||e.target.id==='aghRefModal')document.getElementById('aghRefModal')?.classList.remove('open');const mc=e.target.closest('[data-match-id]');if(mc){document.getElementById('aghRefModal')?.classList.remove('open');location.hash=`#/match/${mc.dataset.matchId}`}},true);
  const observer=new MutationObserver(()=>setTimeout(inject,80));observer.observe(main,{childList:true,subtree:false});window.addEventListener('hashchange',()=>setTimeout(inject,120));setTimeout(inject,350);
})();

(() => {
  if(!document.getElementById('middleRoundThreeDrawStyle')){const l=document.createElement('link');l.id='middleRoundThreeDrawStyle';l.rel='stylesheet';l.href='middle-round-three-draw.css?v=20260910-1';document.head.appendChild(l)}
  if(!document.getElementById('middleRoundThreeDrawScript')){const s=document.createElement('script');s.id='middleRoundThreeDrawScript';s.src='middle-round-three-draw.js?v=20260910-1';document.body.appendChild(s)}
})();