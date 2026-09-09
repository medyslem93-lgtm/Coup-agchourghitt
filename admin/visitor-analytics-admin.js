(() => {
  "use strict";
  const cfg = window.AGCH_CONFIG;
  if (!cfg || !window.supabase) return;
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  const esc = (v = "") =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[m],
    );
  const n = (v) => Number(v || 0).toLocaleString("ar-MR");
  async function load() {
    const box = document.getElementById("visitorAnalytics");
    if (!box) return;
    box.innerHTML = '<div class="card">جارٍ تحميل إحصائيات الزوار...</div>';
    const [s, p, d] = await Promise.all([
      sb.rpc("site_visit_stats"),
      sb.rpc("site_visit_top_pages"),
      sb.rpc("site_visit_daily", { days_back: 30 }),
    ]);
    if (s.error || p.error || d.error) {
      box.innerHTML =
        '<div class="card empty">تعذر تحميل إحصائيات الزوار. تأكد من تسجيل الدخول بحساب الإدارة.</div>';
      return;
    }
    const x = s.data?.[0] || {};
    box.innerHTML = `<div class="dashboard-grid"><div class="metric"><b>${n(x.total_views)}</b><span>إجمالي الزيارات المقاسة</span></div><div class="metric"><b>${n(x.unique_visitors)}</b><span>الزوار الفريدون</span></div><div class="metric"><b>${n(x.today_views)}</b><span>زيارات اليوم</span></div><div class="metric"><b>${n(x.today_unique)}</b><span>زوار اليوم الفريدون</span></div></div><div class="card"><b>مصدر الإحصاءات</b><p class="muted">كل الأرقام معروضة من سجل الزيارات الفعلي في Supabase، دون أرقام تقديرية أو بيانات مدخلة يدويًا.</p></div><div class="head"><h2>أكثر الصفحات زيارة — القياس الفعلي</h2></div><div class="card">${(p.data || []).length ? (p.data || []).map((r) => `<div class="audit-row"><b>${esc(r.path)}</b><span>${n(r.views)} زيارة</span><small>${n(r.unique_visitors)} زائر</small></div>`).join("") : '<div class="empty">لا توجد زيارات مسجلة بعد</div>'}</div><div class="head"><h2>آخر 30 يومًا — القياس الفعلي</h2></div><div class="card">${(d.data || []).length ? (d.data || []).map((r) => `<div class="audit-row"><b>${esc(r.day)}</b><span>${n(r.views)} زيارة</span><small>${n(r.unique_visitors)} زائر</small></div>`).join("") : '<div class="empty">لا توجد بيانات يومية بعد</div>'}</div>`;
  }
  addEventListener("DOMContentLoaded", () => {
    document
      .querySelectorAll('[data-tab="visitors"]')
      .forEach((b) => b.addEventListener("click", () => setTimeout(load, 30)));
    load();
  });
})();
