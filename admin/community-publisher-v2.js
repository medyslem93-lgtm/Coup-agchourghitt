(() => {
  'use strict';
  if (window.__aghCommunityPublisherV2) return;
  window.__aghCommunityPublisherV2 = true;

  const cfg = window.AGCH_CONFIG || {};
  const db = window.AGCH_SUPABASE_CLIENT || window.aghDb || window.supabase?.createClient?.(
    cfg.supabaseUrl,
    cfg.supabaseKey,
    { auth: { persistSession: true, autoRefreshToken: true }, global: { headers: { 'x-client-info': 'agh-community-publisher-v2' } } }
  );
  if (!db) return;

  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (v) => { try { return new Intl.DateTimeFormat('ar-MR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v)); } catch { return v || ''; } };
  const style = document.createElement('style');
  style.id = 'aghCommunityPublisherV2Styles';
  style.textContent = `
    .oc-publisher,.oc-engagement{background:#fff;border:1px solid #e3e9ee;border-radius:18px;padding:15px;margin:12px 0}.oc-publisher-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:11px}.oc-publisher-head h3,.oc-engagement h3{margin:0;color:#172435;font-size:16px}.oc-publisher-head p,.oc-engagement p{margin:4px 0 0;color:#718096;font-size:10px;line-height:1.7}.oc-form{display:grid;grid-template-columns:180px minmax(0,1fr);gap:10px}.oc-form label{display:grid;gap:5px;color:#475569;font-size:10px;font-weight:800}.oc-form label.full{grid-column:1/-1}.oc-form input,.oc-form select,.oc-form textarea{width:100%;box-sizing:border-box;border:1px solid #dce3e8;border-radius:12px;background:#fff;padding:10px 11px;font:700 11px Cairo,sans-serif}.oc-form textarea{min-height:100px;resize:vertical}.oc-file-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.oc-publish{border:0;border-radius:12px;background:#172435;color:#fff;padding:11px 16px;font:900 11px Cairo,sans-serif;cursor:pointer}.oc-publish:disabled{opacity:.5}.oc-note{font-size:9px;color:#7b8798}.oc-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}.oc-metric{border:1px solid #e7ebef;border-radius:13px;padding:10px;background:#f8fafb}.oc-metric span{display:block;color:#718096;font-size:9px}.oc-metric b{display:block;color:#172435;font-size:20px}.oc-comments-wrap{overflow:auto}.oc-table{width:100%;border-collapse:collapse;min-width:720px}.oc-table th,.oc-table td{padding:9px 10px;border-bottom:1px solid #edf1f4;text-align:right;font-size:10px;vertical-align:top}.oc-table th{color:#64748b;background:#f8fafb}.oc-comment-text{max-width:330px;white-space:normal;line-height:1.65}.oc-actions{display:flex;gap:5px}.oc-actions button{padding:6px 8px;font-size:9px}.oc-status{display:inline-flex;padding:4px 7px;border-radius:999px;background:#edf7f1;color:#276447;font-weight:800}.oc-status.hidden{background:#fff0f0;color:#9b3b3b}@media(max-width:720px){.oc-form{grid-template-columns:1fr}.oc-form label.full{grid-column:auto}.oc-metrics{grid-template-columns:1fr 1fr 1fr}}
  `;
  document.head.appendChild(style);

  let sessionUser = null;
  let comments = [];
  let likes = [];
  let profiles = new Map();
  let posts = [];
  let busy = false;

  function toast(message, ok = true) {
    const t = document.getElementById('toast');
    if (!t) { alert(message); return; }
    t.textContent = message;
    t.style.borderColor = ok ? '#32634c' : '#813c42';
    t.style.background = ok ? '#193d2d' : '#431e22';
    t.classList.add('on');
    setTimeout(() => t.classList.remove('on'), 2600);
  }

  async function ensureUser() {
    const { data } = await db.auth.getSession();
    sessionUser = data?.session?.user || null;
    return sessionUser;
  }

  function installPublisher() {
    const sec = document.getElementById('communityAdmin');
    if (!sec || sec.querySelector('.oc-publisher')) return;
    const head = sec.querySelector('.head');
    const panel = document.createElement('div');
    panel.className = 'oc-publisher';
    panel.innerHTML = `<div class="oc-publisher-head"><div><h3>نشر رسمي</h3><p>المنشورات والقصص ينشرها فريق الإدارة فقط. المشجعون يمكنهم الإعجاب والتعليق.</p></div><span class="super-badge admin">رسمي</span></div><div class="oc-form"><label>نوع المحتوى<select id="ocKind"><option value="post">منشور</option><option value="story">قصة 24 ساعة</option></select></label><label>اسم الناشر<input id="ocAuthor" value="إدارة كأس أغشوركيت" maxlength="80"></label><label class="full">النص<textarea id="ocBody" maxlength="5000" placeholder="اكتب نص المنشور أو القصة..."></textarea></label><label class="full">صورة أو فيديو<div class="oc-file-row"><input id="ocMedia" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"><span class="oc-note">حتى 25MB · الصورة أو الفيديو اختياري</span></div></label><label>الحالة<select id="ocPublished"><option value="1">نشر الآن</option><option value="0">حفظ مخفي</option></select></label><label>الشارة<input id="ocBadge" value="رسمي" maxlength="40"></label><label class="full"><button id="ocPublish" type="button" class="oc-publish">نشر المحتوى</button></label></div>`;
    head?.insertAdjacentElement('afterend', panel);
    panel.querySelector('#ocPublish').onclick = publish;
  }

  async function publish() {
    if (busy) return;
    const user = sessionUser || await ensureUser();
    if (!user) return toast('انتهت جلسة الإدارة. سجّل الدخول من جديد.', false);
    const kind = document.getElementById('ocKind')?.value || 'post';
    const body = document.getElementById('ocBody')?.value.trim() || null;
    const author_name = document.getElementById('ocAuthor')?.value.trim() || 'إدارة كأس أغشوركيت';
    const author_badge = document.getElementById('ocBadge')?.value.trim() || 'رسمي';
    const is_published = document.getElementById('ocPublished')?.value !== '0';
    const file = document.getElementById('ocMedia')?.files?.[0] || null;
    if (!body && !file) return toast('اكتب نصًا أو أضف صورة/فيديو.', false);
    if (file && file.size > 25 * 1024 * 1024) return toast('حجم الملف أكبر من 25MB.', false);

    busy = true;
    const button = document.getElementById('ocPublish');
    if (button) { button.disabled = true; button.textContent = 'جارٍ النشر…'; }
    try {
      let media_url = null, media_type = null;
      if (file) {
        media_type = file.type.startsWith('video/') ? 'video' : 'image';
        const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
        const path = `${user.id}/posts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await db.storage.from('fan-community').upload(path, file, { upsert: false, contentType: file.type });
        if (up.error) throw up.error;
        media_url = db.storage.from('fan-community').getPublicUrl(path).data.publicUrl;
      }
      const payload = {
        user_id: user.id,
        kind,
        body,
        media_url,
        media_type,
        is_published,
        author_name,
        author_badge,
        expires_at: kind === 'story' ? new Date(Date.now() + 86400000).toISOString() : null
      };
      const { error } = await db.from('fan_posts').insert(payload);
      if (error) throw error;
      document.getElementById('ocBody').value = '';
      document.getElementById('ocMedia').value = '';
      toast(kind === 'story' ? 'تم نشر القصة الرسمية' : 'تم نشر المنشور الرسمي');
      document.getElementById('caRefresh')?.click();
      await loadEngagement();
    } catch (e) {
      console.error(e);
      toast(`تعذر النشر: ${e?.message || 'خطأ غير معروف'}`, false);
    } finally {
      busy = false;
      if (button) { button.disabled = false; button.textContent = 'نشر المحتوى'; }
    }
  }

  async function loadEngagement() {
    const sec = document.getElementById('communityAdmin');
    if (!sec) return;
    installPublisher();
    let box = sec.querySelector('.oc-engagement');
    if (!box) {
      box = document.createElement('div');
      box.className = 'oc-engagement';
      (document.getElementById('caRoot') || sec).insertAdjacentElement('afterend', box);
    }
    box.innerHTML = '<h3>تفاعل الجمهور</h3><p>جارٍ تحميل التعليقات والإعجابات…</p>';
    const [po, co, li] = await Promise.all([
      db.from('fan_posts').select('id,body,kind,created_at,is_published,author_name').order('created_at', { ascending: false }).limit(100),
      db.from('fan_post_comments').select('*').order('created_at', { ascending: false }).limit(300),
      db.from('fan_post_likes').select('post_id,user_id,created_at').limit(1000)
    ]);
    const bad = [po, co, li].find((x) => x.error);
    if (bad) { box.innerHTML = `<h3>تفاعل الجمهور</h3><p>تعذر التحميل: ${esc(bad.error.message || '')}</p>`; return; }
    posts = po.data || [];
    comments = co.data || [];
    likes = li.data || [];
    profiles = new Map();
    const uids = [...new Set(comments.map((x) => x.user_id))];
    if (uids.length) {
      const { data } = await db.from('fan_profiles').select('user_id,display_name,username').in('user_id', uids);
      for (const p of data || []) profiles.set(p.user_id, p);
    }
    renderEngagement(box);
  }

  function renderEngagement(box) {
    const visible = comments.filter((x) => !x.is_hidden).length;
    box.innerHTML = `<h3>تفاعل الجمهور</h3><p>المشجعون لا ينشرون منشورات أو قصصًا؛ تفاعلهم يكون بالإعجاب والتعليق.</p><div class="oc-metrics"><div class="oc-metric"><span>الإعجابات</span><b>${likes.length}</b></div><div class="oc-metric"><span>التعليقات</span><b>${comments.length}</b></div><div class="oc-metric"><span>تعليقات ظاهرة</span><b>${visible}</b></div></div><div class="oc-comments-wrap"><table class="oc-table"><thead><tr><th>المشجع</th><th>التعليق</th><th>المنشور</th><th>الوقت</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>${comments.map((c) => {
      const p = profiles.get(c.user_id) || {};
      const post = posts.find((x) => x.id === c.post_id) || {};
      return `<tr><td><b>${esc(p.display_name || p.username || 'مشجع')}</b></td><td class="oc-comment-text">${esc(c.body)}</td><td>${esc((post.body || (post.kind === 'story' ? 'قصة' : 'منشور')).slice(0, 70))}</td><td>${esc(fmt(c.created_at))}</td><td><span class="oc-status ${c.is_hidden ? 'hidden' : ''}">${c.is_hidden ? 'مخفي' : 'ظاهر'}</span></td><td><div class="oc-actions"><button class="ghost" data-oc-toggle-comment="${c.id}" data-hidden="${c.is_hidden ? '0' : '1'}">${c.is_hidden ? 'إظهار' : 'إخفاء'}</button><button class="danger" data-oc-delete-comment="${c.id}">حذف</button></div></td></tr>`;
    }).join('') || '<tr><td colspan="6">لا توجد تعليقات بعد.</td></tr>'}</tbody></table></div>`;
    box.querySelectorAll('[data-oc-toggle-comment]').forEach((b) => b.onclick = async () => {
      const { error } = await db.from('fan_post_comments').update({ is_hidden: b.dataset.hidden === '1' }).eq('id', b.dataset.ocToggleComment);
      if (error) toast(error.message, false); else loadEngagement();
    });
    box.querySelectorAll('[data-oc-delete-comment]').forEach((b) => b.onclick = async () => {
      if (!confirm('حذف هذا التعليق نهائيًا؟')) return;
      const { error } = await db.from('fan_post_comments').delete().eq('id', b.dataset.ocDeleteComment);
      if (error) toast(error.message, false); else loadEngagement();
    });
  }

  async function init() {
    await ensureUser();
    const wait = () => {
      const sec = document.getElementById('communityAdmin');
      if (!sec) return setTimeout(wait, 100);
      installPublisher();
      document.querySelector('[data-tab="communityAdmin"]')?.addEventListener('click', () => setTimeout(loadEngagement, 80));
      document.getElementById('caRefresh')?.addEventListener('click', () => setTimeout(loadEngagement, 100));
      if (sec.classList.contains('active')) loadEngagement();
    };
    wait();
  }
  init();
})();
