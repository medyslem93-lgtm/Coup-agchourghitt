(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const esc = (value = "") => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const admin = window.adminControl;
  const boot = $("bootScreen");
  const sidebar = $("adminSidebar");
  const backdrop = $("sidebarBackdrop");
  let lastState = null;

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function openMenu() {
    sidebar?.classList.add("open");
    backdrop?.classList.add("on");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    sidebar?.classList.remove("open");
    backdrop?.classList.remove("on");
    document.body.style.overflow = "";
  }

  function setConnection(status) {
    const online = status === "SUBSCRIBED" || status === "online";
    const offline = status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "offline";
    const label = online ? "متصل ومحدّث لحظيًا" : offline ? "الاتصال غير مستقر" : "جارٍ الاتصال";
    const pill = $("connectionDot")?.parentElement;
    const health = $("healthDot")?.parentElement;
    [pill, health].forEach((element) => {
      element?.classList.toggle("online", online);
      element?.classList.toggle("offline", offline);
    });
    setText("connectionLabel", label);
    setText("healthText", label);
  }

  function logo(url, name) {
    const src = url || "../assets/logo-placeholder.svg";
    return `<img src="${esc(src)}" alt="${esc(name)}" loading="lazy" onerror="this.onerror=null;this.src='../assets/logo-placeholder.svg'">`;
  }

  function matchLabel(match) {
    const visibleScore = ["مباشر", "انتهت"].includes(match.status);
    return visibleScore ? `${match.score_a ?? 0} - ${match.score_b ?? 0}` : String(match.match_time || "").slice(0, 5) || "—";
  }

  function renderTodayMatches(state) {
    const host = $("todayMatches");
    if (!host) return;
    const today = new Date().toISOString().slice(0, 10);
    let matches = state.matches.filter((match) => match.match_date === today);
    if (!matches.length) {
      matches = state.matches
        .filter((match) => ["مباشر", "قادمة"].includes(match.status))
        .sort((a, b) => String(a.match_date || "9999").localeCompare(String(b.match_date || "9999")))
        .slice(0, 4);
    }
    host.innerHTML = matches.length ? matches.map((match) => `
      <article class="today-match">
        <div class="today-team">${logo(match.team_a?.logo_url, match.team_a?.name)}<b>${esc(match.team_a?.name || "غير محدد")}</b></div>
        <div class="today-score"><b>${esc(matchLabel(match))}</b><small>${esc(match.status || "")} · ${esc(match.match_date || "")}</small></div>
        <div class="today-team">${logo(match.team_b?.logo_url, match.team_b?.name)}<b>${esc(match.team_b?.name || "غير محدد")}</b></div>
        <div class="actions"><button class="primary" data-match-events="${match.id}" type="button">إدارة</button><button class="ghost" data-edit-match="${match.id}" type="button">تعديل</button></div>
      </article>`).join("") : '<div class="empty card">لا توجد مباريات اليوم أو مباريات قادمة.</div>';
  }

  function tableForTournament(state, tournament) {
    const teams = state.teams.filter((team) => team.tournament_id === tournament.id);
    const rows = new Map(teams.map((team) => [team.id, {
      id: team.id, name: team.name, logo: team.logo_url, group: team.group_name || "—",
      played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, yellow: 0, red: 0,
    }]));
    state.matches.filter((match) => match.tournament_id === tournament.id && match.status === "انتهت").forEach((match) => {
      const home = rows.get(match.team_a_id);
      const away = rows.get(match.team_b_id);
      if (!home || !away) return;
      const a = Number(match.score_a || 0);
      const b = Number(match.score_b || 0);
      home.played += 1; away.played += 1; home.gf += a; home.ga += b; away.gf += b; away.ga += a;
      if (a === b) { home.draw += 1; away.draw += 1; }
      else if (a > b) { home.won += 1; away.lost += 1; }
      else { away.won += 1; home.lost += 1; }
    });
    state.events.forEach((event) => {
      const row = rows.get(event.team_id);
      if (!row) return;
      if (event.type === "بطاقة صفراء") row.yellow += 1;
      if (event.type === "بطاقة حمراء") row.red += 1;
    });
    return [...rows.values()].map((row) => ({
      ...row, gd: row.gf - row.ga, points: row.won * 3 + row.draw, fair: row.yellow + row.red * 3,
    })).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.fair - b.fair || a.name.localeCompare(b.name, "ar"));
  }

  function leaders(state, type, assist = false) {
    const counts = new Map();
    state.events.forEach((event) => {
      let playerId = null;
      if (assist) {
        if (event.assist_player_id) playerId = event.assist_player_id;
        else if (event.type === "تمريرة حاسمة") playerId = event.player_id;
      } else if (type.includes(event.type)) playerId = event.player_id;
      if (playerId) counts.set(playerId, (counts.get(playerId) || 0) + 1);
    });
    return [...counts.entries()].map(([id, count]) => ({
      player: state.players.find((player) => player.id === id), count,
    })).filter((row) => row.player).sort((a, b) => b.count - a.count).slice(0, 5);
  }

  function leaderCard(title, rows) {
    return `<div class="leader-card"><h3>${title}</h3>${rows.length ? rows.map((row, index) => `<div class="leader-row"><span>${index + 1}. ${esc(row.player.name)}</span><b>${row.count}</b></div>`).join("") : '<div class="empty">لا توجد بيانات</div>'}</div>`;
  }

  function renderStandings(state) {
    const host = $("standingsAdmin");
    if (!host) return;
    const active = state.tournaments[0];
    if (!active) {
      host.innerHTML = '<div class="empty card">لا توجد بطولة.</div>';
      return;
    }
    host.innerHTML = `
      <div class="standing-tabs">${state.tournaments.map((tournament, index) => `<button class="${index ? "ghost" : "primary"}" data-standing-tournament="${tournament.id}" type="button">${esc(tournament.short_name || tournament.name)}</button>`).join("")}</div>
      <div id="standingTable"></div>
      <div class="stat-leaders">
        ${leaderCard("أفضل الهدافين", leaders(state, ["هدف", "ركلة جزاء مسجلة"]))}
        ${leaderCard("صناعة الأهداف", leaders(state, [], true))}
        ${leaderCard("البطاقات الصفراء", leaders(state, ["بطاقة صفراء"]))}
        ${leaderCard("البطاقات الحمراء", leaders(state, ["بطاقة حمراء"]))}
      </div>`;
    const draw = (id) => {
      const tournament = state.tournaments.find((item) => item.id === id) || active;
      const rows = tableForTournament(state, tournament);
      $("standingTable").innerHTML = `<div class="table-card"><table class="admin-table"><thead><tr><th>#</th><th>الفريق</th><th>المجموعة</th><th>لعب</th><th>فاز</th><th>تعادل</th><th>خسر</th><th>له</th><th>عليه</th><th>الفارق</th><th>النقاط</th><th>🟨</th><th>🟥</th><th>اللعب النظيف</th></tr></thead><tbody>${rows.map((row, index) => `<tr><td>${index + 1}</td><td>${esc(row.name)}</td><td>${esc(row.group)}</td><td>${row.played}</td><td>${row.won}</td><td>${row.draw}</td><td>${row.lost}</td><td>${row.gf}</td><td>${row.ga}</td><td>${row.gd > 0 ? "+" : ""}${row.gd}</td><td><b>${row.points}</b></td><td>${row.yellow}</td><td>${row.red}</td><td>${row.fair}</td></tr>`).join("")}</tbody></table></div>`;
    };
    draw(active.id);
    host.querySelectorAll("[data-standing-tournament]").forEach((button) => button.addEventListener("click", () => {
      host.querySelectorAll("[data-standing-tournament]").forEach((item) => item.className = "ghost");
      button.className = "primary";
      draw(button.dataset.standingTournament);
    }));
  }

  async function updateVisitors() {
    if (!admin?.client) return;
    const { count, error } = await admin.client.from("site_visits").select("id", { count: "exact", head: true });
    if (!error) setText("stVisitors", new Intl.NumberFormat("ar").format(count || 0));
  }

  async function updateMatch(matchId, payload, message) {
    const { error } = await admin.client.from("matches").update({
      ...payload,
      updated_at: new Date().toISOString(),
    }).eq("id", matchId);
    if (error) {
      admin.toast("تعذر تحديث المباراة: " + error.message, false);
      return false;
    }
    admin.toast(message);
    await admin.loadAll(true);
    return true;
  }

  function openEventFromCenter(matchId, type) {
    admin.close();
    admin.activateTab("events");
    const filter = $("eventMatchFilter");
    if (filter) {
      filter.value = matchId;
      filter.dispatchEvent(new Event("change"));
    }
    $("addEvent")?.click();
    setTimeout(() => {
      const matchSelect = $("efMatch");
      const typeSelect = $("efType");
      if (matchSelect) {
        matchSelect.value = matchId;
        matchSelect.dispatchEvent(new Event("change"));
      }
      if (typeSelect) {
        typeSelect.value = type;
        typeSelect.dispatchEvent(new Event("change"));
      }
    }, 20);
  }

  function openMatchCenter(matchId) {
    const state = lastState || admin.state;
    const match = state.matches.find((item) => item.id === matchId);
    if (!match) return;
    admin.show(`
      <div class="panel-head"><div><span class="admin-kicker">MATCH CONTROL</span><h2>مركز إدارة المباراة</h2></div><button class="ghost" data-close type="button">إغلاق</button></div>
      <div class="match-control-hero">
        <div>${logo(match.team_a?.logo_url, match.team_a?.name)}<b>${esc(match.team_a?.name || "غير محدد")}</b></div>
        <div class="match-control-score"><span>${esc(match.status)}</span><strong>${match.score_a ?? 0} : ${match.score_b ?? 0}</strong><small>${esc(match.match_date || "بدون تاريخ")} · ${esc(String(match.match_time || "").slice(0, 5) || "بدون وقت")}</small></div>
        <div>${logo(match.team_b?.logo_url, match.team_b?.name)}<b>${esc(match.team_b?.name || "غير محدد")}</b></div>
      </div>
      <div class="quick-status">
        <button class="primary" data-center-status="مباشر" type="button">بدء / استئناف</button>
        <button class="ghost" data-center-minute="46" type="button">بدء الشوط الثاني</button>
        <button class="ghost" data-center-status="مؤجلة" type="button">تأجيل</button>
        <button class="danger" data-center-status="ملغاة" type="button">إلغاء</button>
        <button class="danger" data-center-status="انتهت" type="button">إنهاء المباراة</button>
      </div>
      <div class="row two match-score-editor">
        <div class="field"><label>نتيجة ${esc(match.team_a?.name || "الفريق الأول")}</label><input id="centerScoreA" type="number" min="0" value="${match.score_a ?? 0}"></div>
        <div class="field"><label>نتيجة ${esc(match.team_b?.name || "الفريق الثاني")}</label><input id="centerScoreB" type="number" min="0" value="${match.score_b ?? 0}"></div>
        <div class="field"><label>الدقيقة الحالية</label><input id="centerMinute" type="number" min="0" max="200" value="${match.minute ?? ""}"></div>
        <div class="field"><label>ركلات الترجيح — الأول</label><input id="centerPenaltyA" type="number" min="0" value="${match.home_penalty_score ?? ""}"></div>
        <div class="field"><label>ركلات الترجيح — الثاني</label><input id="centerPenaltyB" type="number" min="0" value="${match.away_penalty_score ?? ""}"></div>
      </div>
      <button id="saveCenterScore" class="primary full-button" type="button">حفظ النتيجة والدقيقة</button>
      <div class="head"><div><span class="admin-kicker">QUICK EVENTS</span><h3>إضافة حدث سريع</h3></div></div>
      <div class="event-actions">
        <button data-center-event="هدف" type="button">⚽ هدف</button>
        <button data-center-event="تمريرة حاسمة" type="button">🅰 صناعة</button>
        <button data-center-event="بطاقة صفراء" type="button">🟨 بطاقة صفراء</button>
        <button data-center-event="بطاقة حمراء" type="button">🟥 بطاقة حمراء</button>
        <button data-center-event="تبديل" type="button">↔ تبديل</button>
        <button data-center-event="ركلة جزاء مسجلة" type="button">◉ ركلة جزاء</button>
        <button data-center-event="ركلة جزاء ضائعة" type="button">⊘ جزاء ضائعة</button>
        <button data-center-event="نهاية الشوط" type="button">◷ نهاية الشوط</button>
      </div>
      <div class="savebar"><button class="ghost" data-center-lineup="${match.id}" type="button">إدارة التشكيلات</button><button class="ghost" data-center-stats="${match.id}" type="button">إحصائيات المباراة</button></div>
    `);
    const panel = $("panel");
    panel.querySelectorAll("[data-center-status]").forEach((button) => button.addEventListener("click", async () => {
      const status = button.dataset.centerStatus;
      if (["انتهت", "ملغاة"].includes(status) && !confirm(`تأكيد تغيير حالة المباراة إلى «${status}»؟`)) return;
      button.disabled = true;
      await updateMatch(match.id, { status }, "تم تحديث حالة المباراة");
      admin.close();
    }));
    panel.querySelector("[data-center-minute]")?.addEventListener("click", async () => {
      await updateMatch(match.id, { status: "مباشر", minute: 46 }, "بدأ الشوط الثاني");
      admin.close();
    });
    panel.querySelectorAll("[data-center-event]").forEach((button) => button.addEventListener("click", () => openEventFromCenter(match.id, button.dataset.centerEvent)));
    $("saveCenterScore").onclick = async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      const value = (id) => $(id).value === "" ? null : Number($(id).value);
      const payload = {
        score_a: value("centerScoreA"),
        score_b: value("centerScoreB"),
        minute: value("centerMinute"),
        home_penalty_score: value("centerPenaltyA"),
        away_penalty_score: value("centerPenaltyB"),
        penalty_shootout: value("centerPenaltyA") !== null || value("centerPenaltyB") !== null,
      };
      const ok = await updateMatch(match.id, payload, "تم حفظ النتيجة والدقيقة");
      if (ok) admin.close(); else button.disabled = false;
    };
    panel.querySelector("[data-center-lineup]")?.addEventListener("click", () => {
      admin.close();
      document.querySelector(`[data-lineup-match="${match.id}"]`)?.click();
    });
    panel.querySelector("[data-center-stats]")?.addEventListener("click", () => {
      admin.close();
      document.querySelector(`[data-match-stats="${match.id}"]`)?.click();
    });
  }

  function render(state) {
    lastState = state;
    setText("stTournaments", state.tournaments.length);
    setText("stLive", state.matches.filter((match) => match.status === "مباشر").length);
    setText("stYellow", state.events.filter((event) => event.type === "بطاقة صفراء").length);
    setText("stRed", state.events.filter((event) => event.type === "بطاقة حمراء").length);
    setText("stNews", state.news.length);
    renderTodayMatches(state);
    renderStandings(state);
    updateVisitors();
    boot?.classList.add("done");
  }

  $("menuToggle")?.addEventListener("click", openMenu);
  $("mobileMore")?.addEventListener("click", openMenu);
  backdrop?.addEventListener("click", closeMenu);
  document.addEventListener("click", (event) => {
    if (event.target.closest(".tabs [data-tab]")) closeMenu();
    const center = event.target.closest("[data-control-match]");
    if (center) openMatchCenter(center.dataset.controlMatch);
  });
  $("refreshAdmin")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.classList.add("is-loading");
    try {
      await admin?.loadAll(false);
      admin?.toast("تم تحديث جميع البيانات");
    } finally {
      button.disabled = false;
      button.classList.remove("is-loading");
    }
  });
  addEventListener("admin:data", (event) => render(event.detail));
  addEventListener("admin:connection", (event) => setConnection(event.detail));
  addEventListener("online", () => setConnection("online"));
  addEventListener("offline", () => setConnection("offline"));
  setConnection(navigator.onLine ? "connecting" : "offline");
  setTimeout(() => {
    if (!boot?.classList.contains("done")) {
      const label = boot?.querySelector("span");
      if (label) label.textContent = "تعذر تحميل البيانات. تحقق من الاتصال ثم أعد المحاولة.";
    }
  }, 12000);

  if (admin?.state?.tournaments?.length) render(admin.state);

  const matchObserver = new MutationObserver(() => {
    document.querySelectorAll("#matchList .item").forEach((item) => {
      const edit = item.querySelector("[data-edit-match]");
      const actions = item.querySelector(".actions");
      if (!edit || !actions || actions.querySelector("[data-control-match]")) return;
      actions.insertAdjacentHTML("afterbegin", `<button class="primary" data-control-match="${edit.dataset.editMatch}" type="button">مركز المباراة</button>`);
    });
  });
  if ($("matchList")) matchObserver.observe($("matchList"), { childList: true, subtree: true });
})();
