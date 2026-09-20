(() => {
  'use strict';

  const CARD_TITLES = new Set(['أفضل الهدافين', 'الهدافون', 'ترتيب الهدافين']);
  const config = window.AGCH_CONFIG || {};
  const db = window.supabase?.createClient?.(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'aghchorguit-scorers-showcase' } },
  });

  const players = new Map();
  const teams = new Map();
  const teamsByName = new Map();
  let metadataPromise = null;
  let scheduled = false;

  function normalize(value = '') {
    return String(value)
      .trim()
      .replace(/[ـ\s]+/g, ' ')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .toLowerCase();
  }

  function assetUrl(value = '') {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
    return raw.replace(/^\.\//, '').replace(/^\.\.\//, '');
  }

  function firstLetter(value = '') {
    return String(value).trim().charAt(0) || '؟';
  }

  function hueFromName(value = '') {
    let hash = 0;
    for (const char of String(value)) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    return Math.abs(hash) % 360;
  }

  function placeholderSvg() {
    return `
      <svg class="scorer-placeholder-svg" viewBox="0 0 120 140" aria-hidden="true">
        <defs>
          <linearGradient id="aghScorerSilhouette" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#d8dfda"/>
            <stop offset="1" stop-color="#7f8c84"/>
          </linearGradient>
        </defs>
        <circle cx="60" cy="34" r="22" fill="url(#aghScorerSilhouette)"/>
        <path d="M29 133c2-33 10-58 31-58s29 25 31 58H29Z" fill="url(#aghScorerSilhouette)"/>
        <path d="M18 139c2-22 8-39 24-48l18 16 18-16c16 9 22 26 24 48H18Z" fill="#59645e" opacity=".88"/>
        <path d="m45 88 15 19 15-19" fill="none" stroke="#e7bf5b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>
      </svg>`;
  }

  async function loadMetadata() {
    if (metadataPromise) return metadataPromise;
    metadataPromise = (async () => {
      if (!db) return;
      try {
        const [playerResult, teamResult] = await Promise.all([
          db.from('players').select('id,name,photo_url,team_id'),
          db.from('teams').select('id,name,logo_url'),
        ]);
        for (const player of playerResult.data || []) players.set(player.id, player);
        for (const team of teamResult.data || []) {
          teams.set(team.id, team);
          teamsByName.set(normalize(team.name), team);
        }
      } catch (_) {
        // The base UI remains fully usable if metadata cannot be refreshed.
      }
    })();
    return metadataPromise;
  }

  function findTeam(player, teamName) {
    return (player?.team_id && teams.get(player.team_id)) || teamsByName.get(normalize(teamName)) || null;
  }

  function buildTeamMark(team, teamName) {
    const mark = document.createElement('span');
    mark.className = 'scorer-team-mark';
    mark.setAttribute('aria-label', teamName ? `فريق ${teamName}` : 'الفريق');

    const fallback = document.createElement('span');
    fallback.className = 'scorer-team-fallback';
    fallback.textContent = firstLetter(teamName);
    mark.appendChild(fallback);

    const src = assetUrl(team?.logo_url);
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = teamName || 'شعار الفريق';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('load', () => { fallback.hidden = true; }, { once: true });
      img.addEventListener('error', () => { img.remove(); fallback.hidden = false; }, { once: true });
      mark.insertBefore(img, fallback);
    }
    return mark;
  }

  function applyPlayerPhoto(avatar, player, playerName) {
    const src = assetUrl(player?.photo_url);
    avatar.classList.toggle('scorer-placeholder', !src);
    avatar.textContent = '';

    if (!src) {
      avatar.innerHTML = placeholderSvg();
      avatar.setAttribute('aria-label', `صورة مؤقتة للاعب ${playerName || ''}`.trim());
      return;
    }

    const img = document.createElement('img');
    img.src = src;
    img.alt = playerName || player?.name || 'صورة اللاعب';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => {
      avatar.classList.add('scorer-placeholder');
      avatar.innerHTML = placeholderSvg();
    }, { once: true });
    avatar.appendChild(img);
  }

  function formatGoalLabel(value) {
    return value === 1 ? 'هدف' : 'أهداف';
  }

  function enhanceRow(row) {
    if (row.dataset.scorerShowcaseReady === '1') return;

    const route = row.getAttribute('data-route') || '';
    const playerId = route.startsWith('player/') ? route.slice('player/'.length) : '';
    const playerName = row.querySelector('.leader-name')?.textContent?.trim() || '';
    const teamName = row.querySelector('.leader-copy small')?.textContent?.trim() || '';
    const avatar = row.querySelector('.player-avatar');
    const value = row.querySelector('.leader-value');
    const player = players.get(playerId) || null;
    const team = findTeam(player, teamName);

    row.style.setProperty('--scorer-hue', String(hueFromName(teamName || playerName)));
    row.classList.add('scorer-showcase-row');

    if (!row.querySelector('.scorer-team-mark')) {
      const mark = buildTeamMark(team, teamName);
      const rank = row.querySelector('.rank-number');
      if (rank?.nextSibling) row.insertBefore(mark, rank.nextSibling);
      else row.prepend(mark);
    }

    if (avatar) applyPlayerPhoto(avatar, player, playerName);

    if (value && !value.querySelector('.scorer-goal-number')) {
      const count = Number.parseInt(value.textContent, 10) || 0;
      value.textContent = '';
      const number = document.createElement('span');
      number.className = 'scorer-goal-number';
      number.textContent = String(count);
      const label = document.createElement('small');
      label.className = 'scorer-goal-label';
      label.textContent = formatGoalLabel(count);
      value.append(number, label);
      value.setAttribute('aria-label', `${count} ${formatGoalLabel(count)}`);
    }

    row.dataset.scorerShowcaseReady = '1';
  }

  function scorerCards() {
    return [...document.querySelectorAll('.leader-card')].filter((card) => {
      const title = card.querySelector('.leader-card-head h3')?.textContent?.trim() || '';
      return CARD_TITLES.has(title);
    });
  }

  async function enhance() {
    scheduled = false;
    const cards = scorerCards();
    if (!cards.length) return;
    await loadMetadata();
    for (const card of cards) {
      card.classList.add('scorers-showcase-card');
      card.querySelectorAll('.leader-row').forEach(enhanceRow);
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(enhance);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('load', schedule);
  document.addEventListener('DOMContentLoaded', schedule);
  schedule();
})();
