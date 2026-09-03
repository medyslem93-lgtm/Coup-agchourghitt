(() => {
  'use strict';
  const cfg = window.AGCH_CONFIG || {};
  const main = document.getElementById('appMain');
  if (!main || !cfg.supabaseUrl || !cfg.supabaseKey) return;
  const headers = { apikey: cfg.supabaseKey, Authorization: `Bearer ${cfg.supabaseKey}` };
  let busy = false, last = '';
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const uuid = v => /^[0-9a-f-]{36}$/i.test(String(v||''));
  const routeId = () => { const p=location.hash.replace(/^#\/?/,'').split('/'); return p[0]==='match' && uuid(p[1]) ? p[1] : ''; };
  const q = async path => { const r=await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`,{headers,cache:'no-store'}); if(!r.ok) throw new Error(String(r.status)); return r.json(); };
  const ts = m => m.match_date ? Date.parse(`${m.match_date}T${String(m.match_time||'00:00').slice(0,5)}:00Z`) : 0;
  const form = (teamId,current,all) => all.filter(m => m.id!==current.id && m.status==='انتهت' && (m.team_a_id===teamId || m.team_b_id===teamId) && m.score_a!=null && m.score_b!=null && ts(m)<=ts(current)).sort((a,b)=>ts(b)-ts(a)).slice(0,4).map(m=>{ const a=m.team_a_id===teamId; const gf=Number(a?m.score_a:m.score_b), ga=Number(a?m.score_b:m.score_a); return gf>ga?'W':gf<ga?'L':'D'; });
  const dots = values => values.length ? values.map(v=>`<span class="agh-inline-form-dot ${v.toLowerCase()}" aria-label="${v==='W'?'فوز':v==='D'?'تعادل':'خسارة'}">${v}</span>`).join('') : '<span class="agh-inline-form-none">لا توجد مباريات سابقة مسجلة</span>';
  async function inject(){
    const id=routeId(); if(!id || busy) return;
    const shell=main.querySelector('.page-shell');
    if(!shell || main.querySelector('.agh-inline-team-form')) return;
    busy=true;
    try{
      const [rows,all]=await Promise.all([q(`matches?id=eq.${encodeURIComponent(id)}&select=*`),q('matches?select=id,team_a_id,team_b_id,match_date,match_time,status,score_a,score_b')]);
      const m=rows[0]; if(!m) return;
      const ids=[m.team_a_id,m.team_b_id].filter(Boolean);
      const teams=ids.length?await q(`teams?id=in.(${ids.join(',')})&select=id,name,logo_url`):[];
      const get=id=>teams.find(t=>t.id===id)||{};
      const home=get(m.team_a_id), away=get(m.team_b_id), hf=form(m.team_a_id,m,all), af=form(m.team_b_id,m,all);
      const box=document.createElement('section'); box.className='agh-inline-team-form content-card';
      box.innerHTML=`<div class="agh-inline-form-title"><h3>آخر مباريات الفريقين</h3><small>المباريات المسجلة والمنتهية فقط</small></div><div class="agh-inline-form-grid"><div class="agh-inline-form-side"><b>${esc(home.name||'الفريق الأول')}</b><div>${dots(hf)}</div></div><div class="agh-inline-form-side"><b>${esc(away.name||'الفريق الثاني')}</b><div>${dots(af)}</div></div></div>`;
      const tabs=shell.querySelector('.app-tabs'); if(tabs) tabs.insertAdjacentElement('afterend',box); else shell.appendChild(box);
      last=id;
    }catch(e){ console.warn('team form inline',e); }
    finally{busy=false;}
  }
  let timer; const schedule=()=>{clearTimeout(timer);timer=setTimeout(inject,80)};
  new MutationObserver(schedule).observe(main,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>{last='';schedule()});
  window.addEventListener('load',schedule); schedule();
})();
