(() => {
  'use strict';

  const nav = document.querySelector('.admin-sidebar .tabs');
  const app = document.querySelector('.admin-app');
  if (!nav || !app || !window.supabase?.createClient || !window.AGCH_CONFIG) return;
  if (document.querySelector('[data-tab="visitors"]')) return;

  const style = document.createElement('style');
  style.textContent = `
    #visitors .visitor-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:18px 0}
    #visitors .visitor-card{background:#fff;border:1px solid #e5eaf0;border-radius:18px;padding:20px;box-shadow:0 8px 26px rgba(15,23,42,.05)}
    #visitors .visitor-card span{display:block;color:#7b8798;font-size:12px;font-weight:700;margin-bottom:8px}
    #visitors .visitor-card b{font-size:30px;line-height:1;color:#172435;font-weight:900}
    #visitors .visitor-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:#fff;border:1px solid #e5eaf0;border-radius:18px;padding:16px 18px;color:#64748b;font-size:12px}
    #visitors .visitor-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#20a878;box-shadow:0 0 0 4px rgba(32,168,120,.12);margin-left:7px}
    #visitors .visitor-error{color:#b42318}
    @media(max-width:720px){#visitors .visitor-grid{grid-template-columns:1fr}#visitors .visitor-card{padding:17px}#visitors .visitor-card b{font-size:27px}}
  `;
  document.head.appendChild(style);

  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.tab = 'visitors';
  button.textContent = '◉ الزوار';
  const settingsButton = nav.querySelector('[data-tab="settings"]');
  nav.insertBefore(button, settingsButton || null);

  const section = document.createElement('section');
  section.id = 'visitors';
  section.className = 'section';
  section.innerHTML = `
    <div class="head"><div><h2>لوحة الزوار</h2><p style="margin:5px 0 0;color:#7b8798;font-size:12px">إحصائيات الزيارات الحقيقية المسجلة من الموقع العام.</p></div><button id="refreshVisitors" class="primary" type="button">↻ تحديث</button></div>
    <div class="visitor-grid">
      <article class="visitor-card"><span>إجمالي الزيارات</span><b id="visitorViews">—</b></article>
      <article class="visitor-card"><span>الزوار الفريدون</span><b id="visitorUnique">—</b></article>
      <article class="visitor-card"><span>زوار اليوم الفريدون</span><b id="visitorToday">—</b></article>
    </div>
    <div class="visitor-meta"><span id="visitorState"><i class="visitor-dot"></i>متصل بإحصائيات الموقع</span><span id="visitorUpdated">آخر تحديث: —</span></div>
  `;
  const settingsSection = document.getElementById('settings');
  app.insertBefore(section, settingsSection || null);

  const db = window.supabase.createClient(window.AGCH_CONFIG.supabaseUrl, window.AGCH_CONFIG.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    global: { headers: { 'x-client-info': 'aghchorguit-admin-visitors' } },
  });
  const fmt = new Intl.NumberFormat('ar-MR');
  let loading = false;

  async function loadVisitors() {
    if (loading) return;
    loading = true;
    const state = document.getElementById('visitorState');
    const refresh = document.getElementById('refreshVisitors');
    if (refresh) refresh.disabled = true;
    if (state) { state.classList.remove('visitor-error'); state.innerHTML = '<i class="visitor-dot"></i>جارٍ تحديث الإحصائيات…'; }
    try {
      const { data, error } = await db.rpc('site_visit_stats');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      document.getElementById('visitorViews').textContent = fmt.format(Number(row?.total_views || 0));
      document.getElementById('visitorUnique').textContent = fmt.format(Number(row?.unique_visitors || 0));
      document.getElementById('visitorToday').textContent = fmt.format(Number(row?.today_unique || 0));
      document.getElementById('visitorUpdated').textContent = 'آخر تحديث: ' + new Date().toLocaleString('ar-MR');
      if (state) state.innerHTML = '<i class="visitor-dot"></i>متصل بإحصائيات الموقع';
    } catch (error) {
      console.error('Visitor statistics load failed', error);
      if (state) { state.classList.add('visitor-error'); state.textContent = 'تعذر تحميل إحصائيات الزوار'; }
    } finally {
      loading = false;
      if (refresh) refresh.disabled = false;
    }
  }

  function openVisitors() {
    document.querySelectorAll('.admin-sidebar .tabs [data-tab]').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.admin-app .section').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    section.classList.add('active');
    loadVisitors();
  }

  button.addEventListener('click', openVisitors);
  document.getElementById('refreshVisitors')?.addEventListener('click', loadVisitors);
  window.addEventListener('focus', () => { if (section.classList.contains('active')) loadVisitors(); });
})();
