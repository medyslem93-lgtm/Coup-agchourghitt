(() => {
  'use strict';
  const config = window.AGCH_CONFIG || {};
  const YOUTH = '93ae7f53-cad3-4c35-8621-f37435abf723';
  const main = document.getElementById('appMain');
  if (!main || !config.supabaseUrl || !config.supabaseKey) return;
  let leaderPromise, timer;
  const escape = (value = '') => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function onYouthPage() { return /^#\/?tournament\/(juniors-2026|93ae7f53-cad3-4c35-8621-f37435abf723)(\/|$)/.test(location.hash); }
  function loadLeader() {
    if (!leaderPromise) leaderPromise = fetch(`${config.supabaseUrl}/rest/v1/player_tournament_stats?tournament_id=eq.${YOUTH}&goals=gt.0&select=player_id,player_name,photo_url,team_name,team_logo_url,goals&order=goals.desc,player_name.asc&limit=1`, {
      headers: { apikey: config.supabaseKey, Authorization: `Bearer ${config.supabaseKey}` }, cache: 'no-store'
    }).then(response => { if (!response.ok) throw new Error('scorer'); return response.json(); }).then(rows => rows[0] || null).catch(() => { leaderPromise = null; return null; });
    return leaderPromise;
  }
  async function render() {
    if (!onYouthPage()) return;
    const card = [...main.querySelectorAll('.leader-card')].find(el => ['الهدافون','ترتيب الهدافين'].includes(el.querySelector('.leader-card-head h3')?.textContent?.trim()));
    if (!card || card.querySelector('.agh-youth-scorer-feature')) return;
    const leader = await loadLeader();
    if (!leader || !onYouthPage() || !card.isConnected || card.querySelector('.agh-youth-scorer-feature')) return;
    const feature = document.createElement('a');
    feature.className = 'agh-youth-scorer-feature';
    feature.href = `#player/${encodeURIComponent(leader.player_id)}`;
    feature.innerHTML = `<div class="agh-youth-scorer-copy"><span class="agh-youth-award-kicker">كأس أغشوركيت · الصغار 2026</span><h4>هداف بطولة الصغار</h4><strong>${escape(leader.player_name)}</strong><span class="agh-youth-team">${leader.team_logo_url ? `<img src="${escape(leader.team_logo_url)}" alt="" loading="lazy">` : '⚽'} ${escape(leader.team_name)}</span><span class="agh-youth-goals"><b>${Number(leader.goals) || 0}</b> أهداف مسجلة</span><small>شاهد ملف اللاعب ←</small></div><div class="agh-youth-portrait">${leader.photo_url ? `<img src="${escape(leader.photo_url)}" alt="صورة ${escape(leader.player_name)}" loading="lazy" onerror="this.style.display='none'">` : '<span aria-hidden="true">⚽</span>'}</div>`;
    card.querySelector('.leader-card-head')?.insertAdjacentElement('afterend', feature);
  }
  new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(render, 160); }).observe(main, { childList: true, subtree: false });
  window.addEventListener('hashchange', () => setTimeout(render, 220));
  window.addEventListener('load', render);
  render();
})();
