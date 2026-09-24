(() => {
  'use strict';
  const cfg = window.AGCH_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseKey || !window.supabase?.createClient) return;
  const db = window.AGCH_SUPABASE_CLIENT || window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false}});
  const main = document.getElementById('appMain');
  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const active = item => item.published && (!item.starts_at || Date.parse(item.starts_at) <= Date.now()) && (!item.ends_at || Date.parse(item.ends_at) > Date.now());
  let invitations = [], entryAttempted = false, refreshTimer;
  const finalPlayers = 'assets/final-match-players-2026.webp';
  const promoVideo = 'assets/final-tent-story-2026.mp4';
  function artwork(item) {
    if (item.presentation === 'cinematic' && item.image_url === finalPlayers) {
      const slides = [
        [finalPlayers, 'لاعبا نهائي كأس أغشوركيت 2026'],
        ['assets/final-invitation-card-2026.webp', 'الدعوة العامة لحضور المباراة النهائية'],
        ['assets/final-match-duel-2026.webp', 'منافسة الفريقين في المباراة النهائية']
      ];
      return `<div class="agh-invite-gallery" aria-label="صور إعلان النهائي">${slides.map(([src,alt], index) => `<img src="${esc(src)}" alt="${esc(alt)}" ${index ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async">`).join('')}</div>`;
    }
    return item.image_url ? `<img src="${esc(item.image_url)}" alt="${esc(item.title)}" loading="lazy" decoding="async">` : '';
  }
  function card(item) {
    return `<div class="agh-invite-copy"><span>دعوة عامة · كأس أغشوركيت 2026</span><h2>${esc(item.title)}</h2>${item.subtitle ? `<p>${esc(item.subtitle)}</p>` : ''}<div class="agh-invite-details">${item.event_at ? `<b>📅 ${esc(new Intl.DateTimeFormat('ar-MR',{dateStyle:'full',timeStyle:'short',timeZone:'Africa/Nouakchott'}).format(new Date(item.event_at)))}</b>` : ''}${item.venue ? `<b>📍 ${esc(item.venue)}</b>` : ''}</div>${item.body ? `<p class="agh-invite-body">${esc(item.body)}</p>` : ''}${item.action_url ? `<a class="agh-invite-link" href="${esc(item.action_url)}">${esc(item.action_label || 'عرض التفاصيل')} ←</a>` : ''}${item.presentation === 'cinematic' && item.image_url === finalPlayers ? '<button class="agh-promo-play" type="button">▶ شاهد إعلان النهائي بالصوت</button>' : ''}</div>${artwork(item)}`;
  }
  function homeCard() {
    if (!main || (location.hash || '#home') !== '#home') return;
    const shell = main.querySelector('.page-shell');
    if (!shell?.querySelector('.hero-layout')) return;
    const item = invitations.find(row => row.show_on_home && active(row));
    const existing = shell.querySelector('.agh-invite-home');
    if (!item) { existing?.remove(); return; }
    if (existing?.dataset.id === item.id && existing.dataset.updated === item.updated_at) return;
    const section = document.createElement('section');
    section.className = `agh-invite-home${item.presentation === 'cinematic' ? ' agh-invite-cinematic' : ''}`; section.dataset.id = item.id; section.dataset.updated = item.updated_at;
    section.innerHTML = card(item);
    if (existing) existing.replaceWith(section);
    else (shell.querySelector('.agh-quick-access') || shell.querySelector('.hero-layout')).insertAdjacentElement('afterend',section);
  }
  function close() { document.getElementById('aghInvitationDialog')?.remove(); }
  function closePromo() { const layer = document.getElementById('aghPromoDialog'); if (layer) { layer.querySelector('video')?.pause(); layer.remove(); } }
  document.addEventListener('click', event => {
    if (!event.target.closest('.agh-promo-play')) return;
    closePromo();
    const layer = document.createElement('div');
    layer.id = 'aghPromoDialog'; layer.className = 'agh-promo-layer'; layer.setAttribute('role','dialog'); layer.setAttribute('aria-modal','true'); layer.setAttribute('aria-label','إعلان نهائي كأس أغشوركيت');
    layer.innerHTML = `<div class="agh-promo-frame"><button type="button" class="agh-promo-close" aria-label="إغلاق الفيديو">×</button><video src="${promoVideo}" controls playsinline preload="metadata" poster="assets/final-match-players-2026.webp" aria-label="إعلان النهائي بالصوت"></video></div>`;
    layer.addEventListener('click', ev => { if (ev.target === layer || ev.target.closest('.agh-promo-close')) closePromo(); });
    document.body.appendChild(layer);
    layer.querySelector('video')?.play().catch(() => {});
    layer.querySelector('.agh-promo-close').focus();
  });
  function entry() {
    if (entryAttempted) return;
    entryAttempted = true;
    const item = invitations.find(row => row.show_on_entry && active(row));
    if (!item) return;
    const seenKey = `agh-invite:${item.id}:${item.updated_at}`;
    try { if (item.display_mode !== 'every_visit' && sessionStorage.getItem(seenKey)) return; sessionStorage.setItem(seenKey,'1'); } catch (_) {}
    const layer = document.createElement('div');
    layer.id = 'aghInvitationDialog'; layer.className = `agh-invite-layer${item.presentation === 'cinematic' ? ' agh-invite-cinematic' : ''}`; layer.setAttribute('role','dialog'); layer.setAttribute('aria-modal','true'); layer.setAttribute('aria-label',item.title);
    layer.innerHTML = `<div class="agh-invite-dialog"><button class="agh-invite-close" type="button" aria-label="إغلاق الدعوة">×</button>${card(item)}</div>`;
    layer.addEventListener('click', event => { if (event.target === layer || event.target.closest('.agh-invite-close, .agh-invite-link')) close(); });
    document.body.appendChild(layer);
    layer.querySelector('.agh-invite-close').focus();
  }
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closePromo(); close(); } });
  async function load(first = false) {
    const {data,error} = await db.from('site_invitations').select('*').eq('published',true).order('sort_order').order('created_at',{ascending:false});
    if (error) return;
    invitations = (data || []).filter(active);
    homeCard();
    if (first) setTimeout(entry, 1250);
  }
  window.addEventListener('hashchange', () => setTimeout(homeCard, 100));
  const observer = new MutationObserver(() => { if ((location.hash || '#home') === '#home') homeCard(); });
  if (main) observer.observe(main,{childList:true});
  db.channel('agh-invitations-public').on('postgres_changes',{event:'*',schema:'public',table:'site_invitations'},() => {clearTimeout(refreshTimer);refreshTimer=setTimeout(() => load(),450);}).subscribe();
  load(true);
})();
