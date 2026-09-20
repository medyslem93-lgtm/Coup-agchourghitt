(() => {
  'use strict';
  if (window.__aghTournamentLineupPolishV2) return;
  window.__aghTournamentLineupPolishV2 = true;

  const main = document.getElementById('appMain');
  const cfg = window.AGCH_CONFIG || {};
  if (!main) return;

  const style = document.createElement('style');
  style.id = 'aghTournamentLineupPolishV2Style';
  style.textContent = `
    .agh-tow-page{max-width:980px!important;padding-bottom:125px!important}
    .agh-tow-hero{position:relative;overflow:hidden;padding:24px 20px!important;background:radial-gradient(circle at 15% 0,rgba(223,255,0,.12),transparent 34%),linear-gradient(145deg,#101713,#07100b)!important;border-color:rgba(223,255,0,.2)!important;box-shadow:0 18px 55px rgba(0,0,0,.24)}
    .agh-tow-hero:after{content:'11';position:absolute;inset-inline-end:16px;bottom:-32px;font:1000 116px/1 Arial;color:rgba(255,255,255,.025);pointer-events:none}
    .agh-tow-kicker{color:#dfff00!important}.agh-tow-hero h1{font-size:28px!important;letter-spacing:-.02em}.agh-tow-hero p{color:#9caaa1!important}
    .agh-tow-admin-band{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;padding:11px 13px;border:1px solid rgba(223,255,0,.16);border-radius:15px;background:#0d140f;color:#d8e1db;font:800 10px Cairo,sans-serif}
    .agh-tow-admin-band b{color:#dfff00}.agh-tow-admin-band span:last-child{color:#849087}
    .agh-tow-tabs{padding-bottom:10px!important}.agh-tow-tab{border-color:#253129!important;background:#101612!important;padding:10px 15px!important}.agh-tow-tab.active{background:#dfff00!important;border-color:#dfff00!important;color:#080b09!important}
    .agh-tow-toolbar{background:#0b100d;border:1px solid #ffffff0e;border-radius:16px;padding:8px;margin:8px 0 10px!important}.agh-tow-select{border-color:#ffffff14!important;background:#121914!important}.agh-tow-status{background:#121914!important;border-color:#ffffff12!important;color:#dfff00!important}
    .agh-tow-pitch{min-height:620px!important;border-radius:30px!important;border:1px solid rgba(255,255,255,.18)!important;background:linear-gradient(90deg,rgba(255,255,255,.025) 50%,transparent 50%),linear-gradient(180deg,#17603c,#0b3b26)!important;box-shadow:inset 0 0 90px rgba(0,0,0,.28),0 20px 60px rgba(0,0,0,.28)!important}
    .agh-tow-pitch:before{inset:18px!important;border-color:rgba(255,255,255,.42)!important}.agh-tow-center{width:112px!important;height:112px!important;border-color:rgba(255,255,255,.42)!important}
    .agh-tow-lines{min-height:568px!important;padding:7px 0}.agh-tow-line{gap:3px!important}
    .agh-tow-slot{width:88px!important;min-height:112px!important;border-radius:15px!important;transition:transform .16s ease,background .16s ease}.agh-tow-slot:not(:disabled):active{transform:scale(.96)}
    .agh-tow-player-disc{width:68px!important;height:68px!important;border:2px solid #dfff00!important;background:#0d1a12!important;box-shadow:0 10px 24px rgba(0,0,0,.38)!important}.agh-tow-slot.empty .agh-tow-player-disc{border-style:dashed!important}
    .agh-tow-slot b{font-size:11px!important;text-shadow:0 2px 5px #000}.agh-tow-slot small{color:#dfff00!important;font-size:9px!important}.agh-tow-team-logo{width:22px!important;height:22px!important;border:2px solid #fff!important}
    .agh-tow-slot.agh-official-player{cursor:pointer!important}.agh-tow-slot.agh-official-player:hover{background:rgba(223,255,0,.06)}
    .agh-tow-progress{border-color:#ffffff12!important;background:#0c120e!important}.agh-tow-progress strong{color:#dfff00!important}.agh-tow-submit{background:#dfff00!important;color:#080b09!important;box-shadow:0 9px 28px rgba(223,255,0,.12)}
    .agh-tow-official-tag{background:#dfff00!important;color:#080b09!important}.agh-tow-crowd{background:#0b110d!important;border-color:#ffffff12!important}
    .agh-tow-entry{border-color:rgba(223,255,0,.24)!important;background:linear-gradient(135deg,#101a13,#080d0a)!important}.agh-tow-entry b{color:#fff}.agh-tow-entry button{background:#dfff00!important;color:#080b09!important}
    @media(max-width:600px){.agh-tow-page{padding-inline:8px!important}.agh-tow-hero{padding:20px 16px!important}.agh-tow-hero h1{font-size:23px!important}.agh-tow-admin-band{align-items:flex-start;flex-direction:column}.agh-tow-pitch{min-height:555px!important;padding-inline:2px!important}.agh-tow-lines{min-height:510px!important}.agh-tow-slot{width:67px!important;min-height:96px!important}.agh-tow-player-disc{width:56px!important;height:56px!important}.agh-tow-slot b{font-size:9px!important}.agh-tow-slot small{font-size:8px!important}.agh-tow-toolbar{grid-template-columns:minmax(0,1fr) auto!important}.agh-tow-status{font-size:10px!important;padding:10px!important}}
  `;
  document.head.appendChild(style);

  let db = null;
  let entities = { tournaments: [], teams: [], players: [] };
  let loading = null;
  const norm = (v = '') => String(v).normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g, '').replace(/ـ/g, '').replace(/[أإآٱ]/g, 'ا').replace(/[ىي]/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
  const parts = () => decodeURIComponent(location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  const isUuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v || '');

  async function loadEntities() {
    if (loading) return loading;
    if (entities.players.length && entities.tournaments.length) return entities;
    if (!window.supabase?.createClient || !cfg.supabaseUrl || !cfg.supabaseKey) return entities;
    db ||= window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
    loading = Promise.all([
      db.from('tournaments').select('id,slug,name,short_name,division'),
      db.from('teams').select('id,name,tournament_id'),
      db.from('players').select('id,name,team_id,photo_url,number,position'),
    ]).then(([a,b,c]) => {
      if (!a.error) entities.tournaments = a.data || [];
      if (!b.error) entities.teams = b.data || [];
      if (!c.error) entities.players = c.data || [];
      return entities;
    }).catch(() => entities).finally(() => { loading = null; });
    return loading;
  }

  async function correctRoute() {
    const p = parts();
    if (p[0] !== 'team-of-week' || !p[1] || isUuid(p[1])) return false;
    await loadEntities();
    const key = norm(p[1]);
    const t = entities.tournaments.find(x => [x.slug, x.name, x.short_name, x.division].some(v => norm(v) === key));
    if (!t) return false;
    location.hash = `#/team-of-week/${t.id}`;
    return true;
  }

  function resolvePlayer(slot) {
    const name = norm(slot.querySelector('b')?.textContent || '');
    const teamName = norm(slot.querySelector('small')?.textContent || '');
    if (!name) return null;
    const candidates = entities.players.filter(p => norm(p.name) === name);
    if (candidates.length === 1) return candidates[0];
    if (teamName) return candidates.find(p => norm(entities.teams.find(t => t.id === p.team_id)?.name) === teamName) || candidates[0] || null;
    return candidates[0] || null;
  }

  async function enhance() {
    if (await correctRoute()) return;
    const page = main.querySelector('.agh-tow-page');
    if (!page) {
      const entry = document.getElementById('aghTowEntry');
      if (entry && !entry.dataset.aghPolished) {
        entry.dataset.aghPolished = '1';
        const text = entry.querySelector('span');
        if (text) text.textContent = 'اختر أفضل 11 لاعبًا — كل بطولة بتشكيلتها المستقلة من لوحة الإدارة';
      }
      return;
    }
    await loadEntities();
    const hero = page.querySelector('.agh-tow-hero');
    if (hero && !page.querySelector('.agh-tow-admin-band')) {
      const band = document.createElement('div');
      band.className = 'agh-tow-admin-band';
      const round = page.querySelector('[data-tow-round]')?.selectedOptions?.[0]?.textContent || 'الجولة الحالية';
      const formation = page.querySelector('[data-tow-formation]')?.value || '4-3-3';
      band.innerHTML = `<span><b>● مباشر من الإدارة</b> · ${round}</span><span>الخطة ${formation} · التحديثات تظهر تلقائيًا</span>`;
      hero.insertAdjacentElement('afterend', band);
    }
    page.querySelectorAll('.agh-tow-crowd .agh-tow-slot[disabled]').forEach(slot => {
      if (slot.dataset.aghProfileReady === '1') return;
      const p = resolvePlayer(slot);
      if (!p) return;
      slot.dataset.aghProfileReady = '1';
      slot.disabled = false;
      slot.classList.add('agh-official-player');
      slot.type = 'button';
      slot.setAttribute('aria-label', `فتح ملف ${p.name}`);
      slot.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        location.hash = `#player/${p.id}`;
      };
    });
  }

  let timer = 0;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(enhance, 110); };
  new MutationObserver(schedule).observe(main, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('agh:admin-update', () => {
    entities = { tournaments: [], teams: [], players: [] };
    schedule();
  });
  setTimeout(schedule, 300);
})();