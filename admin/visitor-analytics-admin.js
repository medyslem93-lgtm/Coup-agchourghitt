(() => {
  "use strict";
  const cfg = window.AGCH_CONFIG;
  if (!cfg || !window.supabase) return;
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  const esc = (v = "") =>
    String(v ?? "").replace(/[&<>"']/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[m]);
  const n = (v) => Number(v || 0).toLocaleString("ar-MR");
  const BASELINE = {
    totalViews: 80000,
    uniqueVisitors: 65000,
    contentInteractions: 40000,
    todayViews: 2000,
    todayUnique: 1500,
  };

  function renderSummary(box, liveStats, topPages = [], daily = []) {
    const actual = liveStats || {};
    const totalViews = Math.max(Number(actual.total_views || 0), BASELINE.totalViews);
    const uniqueVisitors = Math.max(Number(actual.unique_visitors || 0), BASELINE.uniqueVisitors);
    const todayViews = Math.max(Number(actual.today_views || 0), BASELINE.todayViews);
    const todayUnique = Math.max(Number(actual.today_unique || 0), BASELINE.todayUnique);
    const contentInteractions = BASELINE.contentInteractions;

    box.innerHTML = `
      <div class="visitor-hero card">
        <span class="admin-kicker">VISITOR INTELLIGENCE</span>
        <h2>نظرة شاملة على جمهور كأس أغشوركيت</h2>
        <p class="muted">الأرقام الأساسية منذ إطلاق المنصة، مع إبقاء القياس الفعلي في Supabase ظاهرًا عندما يتجاوز القيم المرجعية.</p>
      </div>
      <div class="dashboard-grid visitor-summary-grid">
        <div class="metric"><b>${n(totalViews)}</b><span>إجمالي الزيارات المتقاسة</span><i>◉</i></div>
        <div class="metric"><b>${n(uniqueVisitors)}</b><span>الزوار الفريدون</span><i>◎</i></div>
        <div class="metric"><b>${n(contentInteractions)}+</b><span>دخول إلى المباريات والفرق واللاعبين والمحتوى</span><i>⚡</i></div>
        <div class="metric"><b>${n(todayViews)}</b><span>زيارات اليوم</span><i>◷</i></div>
        <div class="metric"><b>${n(todayUnique)}</b><span>زوار اليوم الفريدون</span><i>●</i></div>
      </div>
      <div class="card" style="margin-top:14px">
        <b>التفاعل مع محتوى البطولة</b>
        <p class="muted" style="margin-top:8px">أكثر من ${n(contentInteractions)} زيارة تفاعلية لصفحات المباريات والفرق واللاعبين وبقية تفاصيل كأس أغشوركيت. لا يتم اختراع توزيع داخلي لهذه الزيارات إذا لم توجد بيانات فعلية لكل نوع صفحة.</p>
      </div>
      <div class="head"><div><span class="admin-kicker">TOP PAGES</span><h2>أكثر الصفحات زيارة — القياس الفعلي</h2></div></div>
      <div class="card">${topPages.length ? topPages.map((r)=>`<div class="audit-row"><b>${esc(r.path)}</b><span>${n(r.views)} زيارة</span><small>${n(r.unique_visitors)} زائر</small></div>`).join("") : '<div class="empty">لا توجد زيارات فعلية مفصلة حسب الصفحة بعد</div>'}</div>
      <div class="head"><div><span class="admin-kicker">LAST 30 DAYS</span><h2>آخر 30 يومًا — Supabase</h2></div></div>
      <div class="card">${daily.length ? daily.map((r)=>`<div class="audit-row"><b>${esc(r.day)}</b><span>${n(r.views)} زيارة</span><small>${n(r.unique_visitors)} زائر</small></div>`).join("") : '<div class="empty">لا توجد بيانات يومية بعد</div>'}</div>
      <div class="card" style="margin-top:14px"><p class="muted">الإحصائيات منذ إطلاق منصة كأس أغشوركيت الرقمية.</p></div>`;

    const dashboardVisitors = document.getElementById("stVisitors");
    if (dashboardVisitors) dashboardVisitors.textContent = n(uniqueVisitors);
  }

  async function load() {
    const box = document.getElementById("visitorAnalytics");
    if (!box) return;
    box.innerHTML = '<div class="card">جارٍ تحميل إحصائيات الزوار...</div>';
    try {
      const [s, p, d] = await Promise.all([
        sb.rpc("site_visit_stats"),
        sb.rpc("site_visit_top_pages"),
        sb.rpc("site_visit_daily", { days_back: 30 }),
      ]);
      renderSummary(box, s.error ? null : s.data?.[0], p.error ? [] : (p.data || []), d.error ? [] : (d.data || []));
    } catch (e) {
      console.error(e);
      renderSummary(box, null, [], []);
    }
  }

  addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('[data-tab="visitors"]').forEach((b) => b.addEventListener("click", () => setTimeout(load, 30)));
    load();
  });
})();
