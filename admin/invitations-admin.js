(() => {
  'use strict';
  const control = window.adminControl;
  const nav = document.querySelector('.admin-sidebar .tabs');
  const app = document.querySelector('.admin-app');
  if (!control || !nav || !app || document.getElementById('adminInvitations')) return;
  const sb = control.client;
  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const dateValue = value => value ? new Date(value).toISOString().slice(0,16) : '';
  const utc = value => value ? new Date(`${value}Z`).toISOString() : null;
  let invitations = [];
  const tab = document.createElement('button');
  tab.type = 'button'; tab.dataset.tab = 'adminInvitations'; tab.textContent = '✉ الدعوات العامة';
  nav.insertBefore(tab, nav.querySelector('[data-tab="news"]') || null);
  const section = document.createElement('section');
  section.id = 'adminInvitations'; section.className = 'section';
  section.innerHTML = '<div class="head"><div><h2>الدعوات العامة</h2><p class="muted">أضف الدعوة وصورتها، وحدد وقت ظهورها واختفائها. ستظهر للزائر عند الدخول وفي الرئيسية بحسب اختيارك.</p></div><button id="addInvitation" class="primary" type="button">+ دعوة عامة</button></div><div id="invitationList"></div>';
  app.insertBefore(section, document.getElementById('news') || null);
  tab.onclick = () => { control.activateTab('adminInvitations'); load(); };
  section.querySelector('#addInvitation').onclick = () => form();
  async function load() {
    if (!control.state.user) return;
    const {data,error} = await sb.from('site_invitations').select('*').order('sort_order').order('created_at',{ascending:false});
    const root = section.querySelector('#invitationList');
    if (error) { root.textContent = 'تعذر تحميل الدعوات: ' + error.message; return; }
    invitations = data || [];
    root.innerHTML = invitations.length ? invitations.map(item => `<div class="item"><img src="${esc(item.image_url || '../assets/tournament.jpg')}" alt=""><div class="meta"><b>${esc(item.title)}</b><small>${item.published ? 'منشورة' : 'مسودة'} · ${item.show_on_entry ? 'تظهر عند الدخول' : 'بدون نافذة دخول'}${item.ends_at ? ' · حتى ' + esc(new Intl.DateTimeFormat('ar-MR',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Nouakchott'}).format(new Date(item.ends_at))) : ''}</small></div><div class="actions"><button class="ghost" type="button" data-invitation-edit="${item.id}">تعديل</button><button class="ghost" type="button" data-invitation-toggle="${item.id}">${item.published ? 'إخفاء' : 'نشر'}</button><button class="danger" type="button" data-invitation-delete="${item.id}">حذف</button></div></div>`).join('') : '<div class="empty card">لا توجد دعوات. أضف الدعوة ثم انشرها.</div>';
  }
  function form(id) {
    const item = invitations.find(row => row.id === id) || {};
    control.show(`<div class="panel-head"><h2>${id ? 'تعديل الدعوة' : 'دعوة عامة جديدة'}</h2><button class="ghost" data-close type="button">إغلاق</button></div><div class="field"><label>عنوان الدعوة</label><input id="invTitle" value="${esc(item.title || '')}" placeholder="دعوة عامة لحضور نهائي كأس أغشوركيت"></div><div class="field"><label>سطر بارز</label><input id="invSubtitle" value="${esc(item.subtitle || '')}" placeholder="معًا نحو لحظة التتويج"></div><div class="field"><label>نص الدعوة</label><textarea id="invBody">${esc(item.body || '')}</textarea></div><div class="row two"><div class="field"><label>موعد الحدث · توقيت موريتانيا</label><input id="invEvent" type="datetime-local" value="${dateValue(item.event_at)}"></div><div class="field"><label>المكان</label><input id="invVenue" value="${esc(item.venue || '')}"></div><div class="field"><label>بداية عرض الدعوة · توقيت موريتانيا</label><input id="invStarts" type="datetime-local" value="${dateValue(item.starts_at)}"></div><div class="field"><label>نهاية العرض · توقيت موريتانيا</label><input id="invEnds" type="datetime-local" value="${dateValue(item.ends_at)}"></div><div class="field"><label>نص زر التفاصيل</label><input id="invActionLabel" value="${esc(item.action_label || 'عرض التفاصيل')}"></div><div class="field"><label>رابط القسم داخل الموقع</label><input id="invActionUrl" value="${esc(item.action_url || '#matches')}" placeholder="#matches"></div><div class="field"><label>ترتيب العرض</label><input id="invOrder" type="number" value="${Number(item.sort_order || 0)}"></div><div class="field"><label>تكرار نافذة الدعوة</label><select id="invMode"><option value="session" ${item.display_mode !== 'every_visit' ? 'selected' : ''}>مرة في كل زيارة</option><option value="every_visit" ${item.display_mode === 'every_visit' ? 'selected' : ''}>عند كل فتح للموقع</option></select></div></div><div class="uploadbox">${item.image_url ? `<img src="${esc(item.image_url)}" alt="صورة الدعوة الحالية">` : ''}<div><label>صورة الدعوة</label><input id="invImage" type="file" accept="image/jpeg,image/png,image/webp"><small>صورة JPG أو PNG أو WEBP بحجم لا يتجاوز 8 ميغابايت</small></div></div><div class="row two"><label><input id="invPublished" type="checkbox" ${item.published ? 'checked' : ''}> نشر الدعوة</label><label><input id="invEntry" type="checkbox" ${item.show_on_entry !== false ? 'checked' : ''}> نافذة عند الدخول</label><label><input id="invHome" type="checkbox" ${item.show_on_home !== false ? 'checked' : ''}> بطاقة في الرئيسية</label></div><div class="savebar"><button id="saveInvitation" class="primary" type="button">حفظ الدعوة</button><button class="ghost" data-close type="button">إلغاء</button></div>`);
    document.getElementById('saveInvitation').onclick = () => save(id);
  }
  async function save(id) {
    const button = document.getElementById('saveInvitation');
    const value = key => document.getElementById(key).value.trim();
    const title = value('invTitle'), starts_at = utc(value('invStarts')), ends_at = utc(value('invEnds'));
    if (!title) return control.toast('عنوان الدعوة مطلوب',false);
    if (starts_at && ends_at && Date.parse(ends_at) <= Date.parse(starts_at)) return control.toast('نهاية العرض يجب أن تأتي بعد بدايته',false);
    const action_url = value('invActionUrl');
    if (action_url && !/^#[a-zA-Z0-9/_-]+$/.test(action_url)) return control.toast('استخدم رابط قسم داخل الموقع مثل #matches',false);
    button.disabled = true;
    try {
      let image_url = invitations.find(row => row.id === id)?.image_url || null;
      const file = document.getElementById('invImage').files[0];
      if (file) {
        if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8*1024*1024) throw new Error('صورة غير مدعومة أو تتجاوز 8 ميغابايت');
        const path = `invitations/${crypto.randomUUID()}.${file.type.split('/')[1]}`;
        const {error} = await sb.storage.from(window.AGCH_CONFIG.mediaBucket).upload(path,file,{contentType:file.type,upsert:false});
        if (error) throw error;
        image_url = sb.storage.from(window.AGCH_CONFIG.mediaBucket).getPublicUrl(path).data.publicUrl;
      }
      const payload = {title,subtitle:value('invSubtitle') || null,body:value('invBody') || null,image_url,event_at:utc(value('invEvent')),venue:value('invVenue') || null,starts_at,ends_at,action_label:value('invActionLabel') || 'عرض التفاصيل',action_url:action_url || null,published:document.getElementById('invPublished').checked,show_on_entry:document.getElementById('invEntry').checked,show_on_home:document.getElementById('invHome').checked,display_mode:value('invMode'),sort_order:Number(value('invOrder') || 0),updated_at:new Date().toISOString()};
      const {error} = id ? await sb.from('site_invitations').update(payload).eq('id',id) : await sb.from('site_invitations').insert(payload);
      if (error) throw error;
      control.toast('تم حفظ الدعوة وتحديث ظهورها'); control.close(); await load();
    } catch (error) { control.toast('تعذر حفظ الدعوة: ' + error.message,false); }
    finally { button.disabled = false; }
  }
  section.addEventListener('click',async event => {
    const edit = event.target.closest('[data-invitation-edit]'); if (edit) return form(edit.dataset.invitationEdit);
    const toggle = event.target.closest('[data-invitation-toggle]');
    if (toggle) { const item = invitations.find(row => row.id === toggle.dataset.invitationToggle); const {error} = await sb.from('site_invitations').update({published:!item.published,updated_at:new Date().toISOString()}).eq('id',item.id); if(error)control.toast(error.message,false);else load(); return; }
    const remove = event.target.closest('[data-invitation-delete]');
    if (remove && window.confirm('هل تريد حذف الدعوة نهائيًا؟')) { const {error} = await sb.from('site_invitations').delete().eq('id',remove.dataset.invitationDelete); if(error)control.toast(error.message,false);else load(); }
  });
  window.addEventListener('admin:data', () => { if(section.classList.contains('active')) load(); });
})();
