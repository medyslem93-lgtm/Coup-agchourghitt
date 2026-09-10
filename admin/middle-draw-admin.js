(() => {
  'use strict';
  const cfg=window.AGCH_CONFIG||{};
  const db=window.supabase?.createClient?.(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
  if(!db)return;
  const MIDDLE='4b420e85-19b3-479c-bd79-e0fef79a105f';
  let draw=null,teams=[],audit=[];
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const team=id=>teams.find(t=>t.id===id);
  function addUi(){
    if(document.getElementById('drawAdmin'))return;
    const nav=document.querySelector('.tabs');
    const refsBtn=nav?.querySelector('[data-tab="refs"]');
    const btn=document.createElement('button');btn.dataset.tab='drawAdmin';btn.innerHTML='<i>◉</i> إدارة القرعة';
    refsBtn?.after(btn);
    const sec=document.createElement('section');sec.id='drawAdmin';sec.className='section';sec.innerHTML='<div class="head"><div><span class="admin-kicker">LIVE DRAW</span><h2>إدارة القرعة</h2></div></div><div id="middleDrawAdminRoot"></div>';
    document.querySelector('.admin-app')?.appendChild(sec);
    btn.addEventListener('click',()=>{document.querySelectorAll('.section').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));sec.classList.add('active');btn.classList.add('active');document.querySelector('.admin-sidebar')?.classList.remove('open');render();});
  }
  async function load(){
    const [{data:d},{data:t},{data:a}]=await Promise.all([
      db.from('middle_round_three_draws').select('*').eq('tournament_id',MIDDLE).eq('stage','الدور الثالث').maybeSingle(),
      db.from('teams').select('id,name,logo_url').eq('tournament_id',MIDDLE),
      db.from('audit_logs').select('id,action,summary,changed_by,created_at').eq('table_name','middle_round_three_draws').order('created_at',{ascending:false}).limit(20)
    ]);draw=d;teams=t||[];audit=a||[];render();
  }
  function statusLabel(){if(!draw)return'غير متاحة';if(draw.status==='completed')return'انتهت';if(draw.status==='live')return'مباشرة';return'لم تبدأ'}
  function participants(){return (draw?.participant_team_ids||[]).map(id=>`<div class="mad-team"><b>${esc(team(id)?.name||'فريق')}</b><small>${esc(id.slice(0,8))}</small></div>`).join('')}
  function render(){const root=document.getElementById('middleDrawAdminRoot');if(!root||!draw)return;const locked=draw.status!=='pending';root.innerHTML=`<div class="mad-card"><div class="mad-grid"><div><small>البطولة</small><b>بطولة الوسط</b></div><div><small>المرحلة</small><b>الدور الثالث</b></div><div><small>الحالة</small><b class="mad-state ${esc(draw.status)}">${statusLabel()}</b></div><div><small>معرف القرعة</small><code>${esc(draw.id)}</code></div></div><h3>الفرق المشاركة</h3><div class="mad-teams">${participants()}</div><div class="mad-schedule"><label>موعد القرعة<input id="madDate" type="datetime-local" ${locked?'disabled':''} value="${draw.scheduled_at?new Date(new Date(draw.scheduled_at).getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16):''}"></label><button id="madSave" class="ghost" ${locked?'disabled':''}>حفظ الموعد</button></div>${draw.status==='pending'?`<div class="mad-warning">⚠️ سيتم إجراء القرعة رسميًا وحفظ النتيجة، ولن يكون بالإمكان إعادة اختيار الفرق بعد بدء العملية.</div><button id="madStart" class="primary mad-start">بدء القرعة</button>`:`<div class="mad-result"><h3>نتيجة القرعة</h3><p>نصف النهائي: <b>${esc(team(draw.semifinal_team_a_id)?.name||'—')} × ${esc(team(draw.semifinal_team_b_id)?.name||'—')}</b></p><p>المتأهل مباشرة: <b>${esc(team(draw.direct_finalist_team_id)?.name||'—')}</b></p><code>${esc(draw.verification_hash||'')}</code></div>`}</div><div class="mad-card"><h3>سجل القرعة</h3><div class="mad-audit">${audit.length?audit.map(x=>`<div><b>${esc(x.action)}</b><span>${esc(x.summary||'')}</span><small>${esc(x.changed_by||'')} · ${new Date(x.created_at).toLocaleString('ar-MR')}</small></div>`).join(''):'<p>لا توجد عمليات بعد.</p>'}</div></div>`;
    document.getElementById('madSave')?.addEventListener('click',saveSchedule);document.getElementById('madStart')?.addEventListener('click',startDraw);
  }
  async function saveSchedule(){const input=document.getElementById('madDate');if(!input?.value)return alert('حدد تاريخ ووقت القرعة أولًا.');const {error}=await db.rpc('set_middle_round_three_draw_schedule',{p_scheduled_at:new Date(input.value).toISOString()});if(error)return alert('تعذر حفظ الموعد: '+error.message);await load();}
  async function startDraw(){if(!confirm('سيتم إجراء القرعة رسميًا الآن وحفظ النتيجة نهائيًا. لا يمكن إعادة اختيار الفرق بعد البدء. هل تريد المتابعة؟'))return;const b=document.getElementById('madStart');if(b){b.disabled=true;b.textContent='جارٍ بدء القرعة…'}const {error}=await db.rpc('start_middle_round_three_draw');if(error){alert('لم تبدأ القرعة: '+error.message);if(b){b.disabled=false;b.textContent='بدء القرعة'}return}await load();setTimeout(load,10000)}
  addUi();load();db.channel('middle-draw-admin-live').on('postgres_changes',{event:'*',schema:'public',table:'middle_round_three_draws'},()=>load()).subscribe();
})();