(() => {
  'use strict';
  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const panel = document.getElementById('refsList');
  if (!panel) return;
  let referees = [], assignments = [];
  async function load() {
    const control = window.adminControl;
    if (!control?.state.user) return;
    const [refs, links] = await Promise.all([
      control.client.from('referees').select('id,name,photo_url').order('name'),
      control.client.from('referee_assignments').select('id,referee_id,category,tournament_id')
    ]);
    if (refs.error || links.error) return control.toast('تعذر تحميل ملفات الحكام', false);
    referees = refs.data || [];
    assignments = links.data || [];
    const list = document.getElementById('refereeDirectoryAdminList');
    if (list) list.innerHTML = referees.map(ref => `<div class="item"><img src="${esc(ref.photo_url || '../assets/tournament.jpg')}" alt=""><div class="meta"><b>${esc(ref.name)}</b><small>${esc([...new Set(assignments.filter(a => a.referee_id === ref.id).map(a => a.category).filter(Boolean))].join(' · ') || 'ملف حكم')}</small></div><div class="actions"><button class="ghost" type="button" data-ref-profile="${ref.id}">تعديل الملف</button></div></div>`).join('') || '<div class="empty card">لا توجد ملفات حكام بعد</div>';
  }
  const section = document.createElement('div');
  section.className = 'card';
  section.style.marginBottom = '16px';
  section.innerHTML = '<div class="meta"><b>ملفات الحكام الظاهرة للزوار</b><small>الاسم والصورة والفئة في دليل الحكام. تعيينات المباريات أدناه.</small></div><div class="actions"><button class="primary" id="newRefProfile" type="button">+ ملف حكم</button></div><div id="refereeDirectoryAdminList"></div>';
  panel.before(section);
  function form(id = null) {
    const control = window.adminControl;
    const ref = referees.find(item => item.id === id);
    const current = assignments.find(item => item.referee_id === id && item.category);
    const tournaments = control.state.tournaments;
    control.show(`<div class="panel-head"><h2>${ref ? 'تعديل ملف الحكم' : 'إضافة حكم إلى الدليل'}</h2><button class="ghost" data-close type="button">إغلاق</button></div><div class="field"><label>اسم الحكم</label><input id="refProfileName" value="${esc(ref?.name || '')}"></div><div class="field"><label>البطولة</label><select id="refProfileTournament"><option value="">كل البطولات</option>${tournaments.map(t => `<option value="${esc(t.id)}" ${current?.tournament_id === t.id ? 'selected' : ''}>${esc(t.short_name || t.name)}</option>`).join('')}</select></div><div class="field"><label>صورة الحكم</label><input id="refProfilePhoto" type="file" accept="image/*"></div>${ref?.photo_url ? `<img src="${esc(ref.photo_url)}" alt="الصورة الحالية" style="width:90px;height:90px;object-fit:cover;border-radius:14px">` : ''}<div class="savebar"><button class="primary" id="saveRefProfile" type="button">حفظ الملف</button><button class="ghost" data-close type="button">إلغاء</button></div>`);
    document.getElementById('saveRefProfile').onclick = () => save(id);
  }
  async function save(id) {
    const control = window.adminControl;
    const button = document.getElementById('saveRefProfile');
    const name = document.getElementById('refProfileName').value.trim();
    if (!name) return control.toast('اسم الحكم مطلوب', false);
    button.disabled = true;
    try {
      let photo_url = referees.find(item => item.id === id)?.photo_url || null;
      const file = document.getElementById('refProfilePhoto').files[0];
      if (file) {
        if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) throw new Error('اختر صورة لا تتجاوز 8 ميغابايت');
        const path = `referees/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const uploaded = await control.client.storage.from(window.AGCH_CONFIG.mediaBucket).upload(path, file, {contentType:file.type,upsert:false});
        if (uploaded.error) throw uploaded.error;
        photo_url = control.client.storage.from(window.AGCH_CONFIG.mediaBucket).getPublicUrl(path).data.publicUrl;
      }
      const saved = id
        ? await control.client.from('referees').update({name,photo_url,updated_at:new Date().toISOString()}).eq('id',id).select('id').single()
        : await control.client.from('referees').insert({name,photo_url}).select('id').single();
      if (saved.error) throw saved.error;
      const tournamentId = document.getElementById('refProfileTournament').value;
      const tournament = control.state.tournaments.find(item => item.id === tournamentId);
      if (tournament && !assignments.some(item => item.referee_id === saved.data.id && item.tournament_id === tournamentId)) {
        const linked = await control.client.from('referee_assignments').insert({referee_id:saved.data.id,name,photo_url,tournament_id:tournamentId,category:tournament.division,role:'main'});
        if (linked.error) throw linked.error;
      }
      control.toast('تم حفظ ملف الحكم في دليل الزوار');
      control.close();
      await load();
    } catch (error) {
      control.toast('تعذر حفظ ملف الحكم: ' + error.message, false);
    } finally { button.disabled = false; }
  }
  document.getElementById('newRefProfile').onclick = () => form();
  section.addEventListener('click', event => { const ref = event.target.closest('[data-ref-profile]'); if (ref) form(ref.dataset.refProfile); });
  window.addEventListener('admin:data', load);
  if (window.adminControl?.state.user) load();
})();
