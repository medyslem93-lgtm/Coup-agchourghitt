(() => {
  'use strict';

  const CATEGORY = 'المعتزلين';
  const cfg = window.AGCH_CONFIG || {};
  const sb = window.supabase?.createClient?.(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true },
    global: { headers: { 'x-client-info': 'aghchorguit-retired-category' } },
  });
  if (!sb) return;

  let editingTournamentId = null;

  function ensureCategoryOption(select) {
    if (!select || [...select.options].some(option => option.value === CATEGORY || option.textContent.trim() === CATEGORY)) return;
    const option = document.createElement('option');
    option.value = CATEGORY;
    option.textContent = CATEGORY;
    select.appendChild(option);
  }

  function patchCategorySelects(root = document) {
    ['tofDivision','teamCategory','playerCategory','matchCategory','rfCat','nfCat','afCat'].forEach(id => {
      const select = root.querySelector?.(`#${id}`) || document.getElementById(id);
      ensureCategoryOption(select);
    });

    const division = document.getElementById('tofDivision');
    if (division && editingTournamentId) {
      const tournament = window.adminControl?.state?.tournaments?.find(item => item.id === editingTournamentId);
      if (tournament?.division === CATEGORY) division.value = CATEGORY;
    }
  }

  async function uploadTournamentLogo(file, tournamentId) {
    if (!file) return null;
    if (!file.type?.startsWith('image/')) throw new Error('شعار البطولة يجب أن يكون صورة');
    if (!file.size) throw new Error('ملف الشعار فارغ');
    if (file.size > 12 * 1024 * 1024) throw new Error('حجم الشعار يجب ألا يتجاوز 12 ميغابايت');

    const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
    const path = `tournament-logo/${crypto.randomUUID()}.${ext}`;
    const bytes = await file.arrayBuffer();
    const { error } = await sb.storage.from(cfg.mediaBucket).upload(path, bytes, {
      upsert: false,
      contentType: file.type || 'image/jpeg',
      cacheControl: '31536000',
    });
    if (error) throw error;

    const publicUrl = sb.storage.from(cfg.mediaBucket).getPublicUrl(path).data.publicUrl;
    const { error: mediaError } = await sb.from('media_assets').insert({
      bucket: cfg.mediaBucket,
      path,
      public_url: publicUrl,
      kind: 'tournament-logo',
      entity_type: 'tournament',
      entity_id: tournamentId || null,
      caption: CATEGORY,
      media_type: 'image',
    });
    if (mediaError) {
      await sb.storage.from(cfg.mediaBucket).remove([path]);
      throw mediaError;
    }
    return publicUrl;
  }

  async function saveRetiredTournament(button) {
    const control = window.adminControl;
    const value = id => document.getElementById(id)?.value?.trim?.() || '';
    const name = value('tofName');
    const shortName = value('tofShort');
    const season = value('tofSeason') || '2026';
    if (!name || !shortName) return control?.toast?.('اسم البطولة والاسم المختصر مطلوبان', false);

    const existing = editingTournamentId
      ? control?.state?.tournaments?.find(item => item.id === editingTournamentId)
      : null;
    const duplicate = control?.state?.tournaments?.find(item => item.id !== editingTournamentId && item.division === CATEGORY);
    if (duplicate) return control?.toast?.('توجد بطولة مرتبطة بفئة المعتزلين بالفعل', false);

    button.disabled = true;
    const oldText = button.textContent;
    button.textContent = 'جارٍ الحفظ...';

    try {
      let logoUrl = existing?.logo_url || null;
      const logoFile = document.getElementById('tofLogo')?.files?.[0];
      if (logoFile) logoUrl = await uploadTournamentLogo(logoFile, editingTournamentId);

      const slug = existing?.division === CATEGORY && existing?.slug
        ? existing.slug
        : `retired-${season}`;
      const payload = {
        name,
        short_name: shortName,
        division: CATEGORY,
        slug,
        season,
        status: value('tofStatus') || 'قادمة',
        accent_color: value('tofAccent') || '#c7ff37',
        description: value('tofDescription') || null,
        sort_order: Number(value('tofSort') || 0),
        logo_url: logoUrl,
      };

      const query = editingTournamentId
        ? sb.from('tournaments').update(payload).eq('id', editingTournamentId)
        : sb.from('tournaments').insert(payload);
      const { error } = await query;
      if (error) throw error;

      control?.toast?.('تم حفظ بطولة المعتزلين');
      control?.close?.();
      editingTournamentId = null;
      await control?.loadAll?.(true);
      patchCategorySelects();
    } catch (error) {
      control?.toast?.(`تعذر حفظ البطولة: ${error?.message || 'خطأ غير معروف'}`, false);
    } finally {
      if (button?.isConnected) {
        button.disabled = false;
        button.textContent = oldText || 'حفظ البطولة';
      }
    }
  }

  document.addEventListener('click', event => {
    const edit = event.target.closest?.('[data-edit-tournament]');
    if (edit) editingTournamentId = edit.dataset.editTournament || null;
    if (event.target.closest?.('#addTournament')) editingTournamentId = null;
  }, true);

  document.addEventListener('click', event => {
    const button = event.target.closest?.('#saveTournament');
    if (!button) return;
    const division = document.getElementById('tofDivision');
    if (division?.value !== CATEGORY) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    saveRetiredTournament(button);
  }, true);

  const observer = new MutationObserver(() => patchCategorySelects());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  patchCategorySelects();
})();
