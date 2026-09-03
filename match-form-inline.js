(() => {
  'use strict';
  const cfg = window.AGCH_CONFIG || {};
  const main = document.getElementById('appMain');
  if (!main || !cfg.supabaseUrl || !cfg.supabaseKey) return;
  const headers = { apikey: cfg.supabaseKey, Authorization: `Bearer ${cfg.supabaseKey}` };
  let busy = false;
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const uuid = v => /^[0-9a-f-]{36}$/i.test(String(v||''));
  const routeId = () => {
    const p=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);
    if(p[0]==='match' && uuid(p[1])) return p[1];
    const route=main.querySelector('.app-tabs [data-route^="match/"], [data-route^="match/"]')?.dataset?.route || '';
    const rp=route.split('/');
    return rp[0]==='match' && uuid(rp[1]) ? rp[1] : '';
  };
  const q = async path => { const r=await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`,{headers,cache:'no-store'}); if(!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); };
  const ts = m => m.match_date ? Date.parse(`${m.match_date}T${String(m.match_time||'00:00').slice(0,5)}:00Z`) : 0;
  const form = (teamId,current,all) => all.filter(m => m.id!==current.id && m.status==='انتهت' && (m.team_a_id===teamId || m.team_b_id===teamId) && m.score_a!=null && m.score_b!=null && (!current.match_date || !m.match_date || ts(m)<=ts(current))).sort((a,b)=>ts(b)-ts(a)).slice(0,4).map(m=>{ const isA=m.team_a_id===teamId; const gf=Number(isA?m.score_a:m.score_b), ga=Number(isA?m.score_b:m.score_a); return gf>ga?'W':gf<ga?'L':'D'; });
  const dots = values => values.length ? values.map(v=>`<span class="agh-inline-form-dot ${v.toLowerCase()}" title="${v==='W'?'فوز':v==='D'?'تعادل':'خسارة'}">${v}</span>`).join('') : '<span class="agh-inline-form-none">لا توجد مباريات سابقة مسجلة</span>';
  async function inject(){
    const id=routeId(); if(!id || busy || main.querySelector('.agh-inline-team-form')) return;
    const tabs = main.querySelector('.app-tabs, .agh-match-tabs');
    if(!tabs) return;
    busy=true;
    try{
      const [rows,all]=await Promise.all([
        q(`matches?id=eq.${encodeURIComponent(id)}&select=*`),
        q('matches?select=id,team_a_id,team_b_id,match_date,match_time,status,score_a,score_b')
      ]);
      const m=rows[0]; if(!m) return;
      const ids=[m.team_a_id,m.team_b_id].filter(Boolean);
      const teams=ids.length?await q(`teams?id=in.(${ids.join(',')})&select=id,name,logo_url`):[];
      const get=id=>teams.find(t=>t.id===id)||{};
      const home=get(m.team_a_id), away=get(m.team_b_id), hf=form(m.team_a_id,m,all), af=form(m.team_b_id,m,all);
      const box=document.createElement('section'); box.className='agh-inline-team-form content-card';
      box.innerHTML=`<div class="agh-inline-form-title"><h3>آخر مباريات الفريقين</h3><small>المباريات المنتهية والمسجلة فعليًا فقط</small></div><div class="agh-inline-form-grid"><div class="agh-inline-form-side"><b>${esc(home.name||'الفريق الأول')}</b><div>${dots(hf)}</div></div><div class="agh-inline-form-side"><b>${esc(away.name||'الفريق الثاني')}</b><div>${dots(af)}</div></div></div>`;
      tabs.insertAdjacentElement('afterend',box);
    }catch(e){ console.warn('team form inline',e); }
    finally{busy=false;}
  }
  let timer;
  const schedule=()=>{ clearTimeout(timer); timer=setTimeout(inject,100); };
  new MutationObserver(schedule).observe(main,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);
  window.addEventListener('load',schedule);
  document.addEventListener('click',e=>{ if(e.target.closest('[data-route^="match/"],[data-match-id],[data-open-match]')) setTimeout(schedule,100); },true);
  setInterval(()=>{ if(!main.querySelector('.agh-inline-team-form')) inject(); },700);
  schedule();
})();
