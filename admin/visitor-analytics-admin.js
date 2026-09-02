(() => {
  'use strict';
  const cfg = window.AGCH_CONFIG;
  if (!cfg || !window.supabase) return;
  const sb = window.AGCH_ADMIN_SB || window.supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabaseKey,
    { auth: { persistSession: true, autoRefreshToken: true } },
  );
  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
  const number = (value) => Number(value || 0).toLocaleString('ar-MR');

  async function load() {
    const box = document.getElementById('visitorAnalytics');
    if (!box) return;
    box.innerHTML = '<div class="card">جارٍ تحميل إحصائيات الزوار...</div>';
    const [summary, pages, daily] = await Promise.all([
      sb.rpc('site_visit_dashboard_stats'),
      sb.rpc('site_visit_top_pages'),
      sb.rpc('site_visit_daily', { days_back: 30 }),
    ]);
    if (summary.error || pages.error || daily.error) {
      box.innerHTML = '<div class="card empty">تعذر تحميل إحصائيات الزوار. أعد تسجيل الدخول ثم حاول مرة أخرى.</div>';
      return;
    }
    const stats = summary.data?.[0] || {};
    const pageRows = (pages.data || []).map((row) => `<div class="audit-row"><b>${esc(row.path)}</b><span>${number(row.views)} زيارة</span><small>${number(row.unique_visitors)} زائر</small></div>`).join('');
    const dailyRows = (daily.data || []).map((row) => `<div class="audit-row"><b>${esc(row.day)}</b><span>${number(row.views)} زيارة</span><small>${number(row.unique_visitors)} زائر</small></div>`).join('');
    box.innerHTML = `
      <div class="dashboard-grid">
        <div class="metric"><b>${number(stats.total_visitors)}</b><span>إجمالي الزوار منذ 22 أغسطس</span></div>
        <div class="metric"><b>${number(stats.week_visitors)}</b><span>زوار هذا الأسبوع</span></div>
        <div class="metric"><b>${number(stats.today_visitors)}</b><span>زوار اليوم</span></div>
        <div class="metric"><b>${number(stats.tracked_views)}</b><span>الزيارات المقاسة آليًا</span></div>
      </div>
      <div class="head"><h2>أكثر الصفحات زيارة</h2></div>
      <div class="card">${pageRows || '<div class="empty">لا توجد زيارات مسجلة بعد</div>'}</div>
      <div class="head"><h2>آخر 30 يومًا</h2></div>
      <div class="card">${dailyRows || '<div class="empty">لا توجد بيانات يومية بعد</div>'}</div>`;
  }

  addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-tab="visitors"]').forEach((button) => {
      button.addEventListener('click', () => setTimeout(load, 30));
    });
    load();
  });
})();
