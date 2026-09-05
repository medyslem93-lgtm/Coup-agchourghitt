(() => {
  "use strict";

  const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const WEEKDAYS_AR = ["السبت","الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة"];
  const state = { teamId: "", monthKey: "", view: "calendar" };

  const pad = (n) => String(n).padStart(2, "0");
  const localDateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const monthKeyOf = (date) => date ? String(date).slice(0,7) : "";
  const monthLabel = (key) => {
    const [y,m] = key.split("-").map(Number);
    return `${MONTHS_AR[m-1]} ${y}`;
  };
  const safe = (v="") => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const timeText = (v) => v ? String(v).slice(0,5) : "--:--";
  const dateMs = (m) => Date.parse(`${m.match_date || "9999-12-31"}T${String(m.match_time || "23:59").slice(0,5)}:00Z`);

  function getHostData(){
    const app = window.AGCH_PUBLIC_APP;
    if (!app || typeof app.getTeamCalendarData !== "function") return null;
    return app.getTeamCalendarData();
  }

  function teamMatches(data){
    return data.matches.filter(m => m.team_a_id === state.teamId || m.team_b_id === state.teamId);
  }

  function opponent(data, match){
    const id = match.team_a_id === state.teamId ? match.team_b_id : match.team_a_id;
    return data.teams.find(t => t.id === id) || { name: "خصم غير محدد", logo_url: "assets/tournament.jpg" };
  }

  function currentTeam(data){
    return data.teams.find(t => t.id === state.teamId) || { name: "الفريق", logo_url: "assets/tournament.jpg" };
  }

  function matchStatus(match){
    if (match.status === "مباشر") return `<span class="tmc-status live">LIVE${match.minute != null ? ` · ${safe(match.minute)}′` : ""}</span>`;
    if (match.status === "انتهت") return `<span class="tmc-status finished">انتهت</span>`;
    if (match.status === "مؤجلة") return `<span class="tmc-status postponed">مؤجلة</span>`;
    if (match.status === "ملغاة") return `<span class="tmc-status cancelled">ملغاة</span>`;
    return `<span class="tmc-status upcoming">قادمة</span>`;
  }

  function scoreOrVs(match){
    if (["انتهت","مباشر"].includes(match.status)) return `${Number(match.score_a ?? 0)} — ${Number(match.score_b ?? 0)}`;
    return "VS";
  }

  function card(data, match, compact=false){
    const home = data.teams.find(t=>t.id===match.team_a_id) || {name:match.team_a_placeholder||"الفريق",logo_url:"assets/tournament.jpg"};
    const away = data.teams.find(t=>t.id===match.team_b_id) || {name:match.team_b_placeholder||"الفريق",logo_url:"assets/tournament.jpg"};
    const today = match.match_date === localDateKey();
    return `<article class="tmc-match-card ${compact ? "compact" : ""} ${today ? "today" : ""}" data-route="match/${safe(match.id)}">
      <div class="tmc-match-top">${today ? '<strong class="tmc-today-label">⚽ مباراة اليوم</strong>' : `<strong>${safe(match.match_date || "موعد غير محدد")}</strong>`}${matchStatus(match)}</div>
      <div class="tmc-match-main">
        <div class="tmc-team"><img src="${safe(home.logo_url || "assets/tournament.jpg")}" alt=""><b>${safe(home.name)}</b></div>
        <div class="tmc-score">${safe(scoreOrVs(match))}</div>
        <div class="tmc-team"><img src="${safe(away.logo_url || "assets/tournament.jpg")}" alt=""><b>${safe(away.name)}</b></div>
      </div>
      <div class="tmc-match-meta"><span>${safe(timeText(match.match_time))}</span>${match.venue ? `<span>${safe(match.venue)}</span>` : ""}<span>${safe(match.stage || match.round_name || match.category || "المباراة")}</span></div>
      <button class="tmc-details" type="button" data-route="match/${safe(match.id)}">تفاصيل المباراة</button>
    </article>`;
  }

  function availableMonths(matches){
    return [...new Set(matches.map(m=>monthKeyOf(m.match_date)).filter(Boolean))].sort();
  }

  function chooseInitialMonth(matches){
    const months = availableMonths(matches);
    if (!months.length) return "";
    const current = monthKeyOf(localDateKey());
    if (months.includes(current)) return current;
    const future = months.find(m => m > current);
    return future || months[months.length-1];
  }

  function calendarGrid(data, matches, monthKey){
    const [year, month] = monthKey.split("-").map(Number);
    const first = new Date(Date.UTC(year, month-1, 1));
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const jsDay = first.getUTCDay();
    const saturdayFirstOffset = (jsDay + 1) % 7;
    const byDate = new Map();
    matches.filter(m=>monthKeyOf(m.match_date)===monthKey).forEach(m=>{
      if (!byDate.has(m.match_date)) byDate.set(m.match_date, []);
      byDate.get(m.match_date).push(m);
    });
    const cells = [];
    for(let i=0;i<saturdayFirstOffset;i++) cells.push('<div class="tmc-day empty" aria-hidden="true"></div>');
    for(let day=1;day<=days;day++){
      const date = `${year}-${pad(month)}-${pad(day)}`;
      const dMatches = byDate.get(date) || [];
      const live = dMatches.some(m=>m.status==="مباشر");
      const finished = dMatches.length && dMatches.every(m=>m.status==="انتهت");
      const cancelled = dMatches.length && dMatches.every(m=>m.status==="ملغاة");
      const today = date === localDateKey();
      const cls = ["tmc-day",dMatches.length?"has-match":"",live?"is-live":"",finished?"is-finished":"",cancelled?"is-cancelled":"",today?"is-today":""].filter(Boolean).join(" ");
      const marker = live ? '<span class="tmc-live-dot">LIVE</span>' : dMatches.length ? `<span class="tmc-ball">⚽${dMatches.length>1?` ${dMatches.length}`:""}</span>` : "";
      cells.push(`<button class="${cls}" type="button" data-tmc-date="${date}" ${dMatches.length?"":"disabled"}><span class="tmc-day-num">${day}</span>${marker}</button>`);
    }
    return `<div class="tmc-weekdays">${WEEKDAYS_AR.map(d=>`<span>${d}</span>`).join("")}</div><div class="tmc-grid">${cells.join("")}</div>`;
  }

  function listView(data, matches){
    const rows = matches.slice().sort((a,b)=>dateMs(a)-dateMs(b));
    if (!rows.length) return '<div class="tmc-empty">لا توجد مباريات مسجلة لهذا الفريق.</div>';
    const groups = new Map();
    rows.forEach(m=>{const k=monthKeyOf(m.match_date)||"غير-محدد";if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m);});
    return `<div class="tmc-list">${[...groups.entries()].map(([k,items])=>`<section><h4>${k==="غير-محدد"?"موعد غير محدد":monthLabel(k)}</h4>${items.map(m=>card(data,m,true)).join("")}</section>`).join("")}</div>`;
  }

  function nextMatch(matches){
    const now = Date.now();
    return matches.filter(m=>["قادمة","مؤجلة"].includes(m.status) && dateMs(m)>=now).sort((a,b)=>dateMs(a)-dateMs(b))[0] || null;
  }

  function render(){
    const root = document.getElementById("teamMatchCalendarRoot");
    const data = getHostData();
    if (!root || !data || !state.teamId) return;
    const matches = teamMatches(data);
    const months = availableMonths(matches);
    if (!state.monthKey || !months.includes(state.monthKey)) state.monthKey = chooseInitialMonth(matches);
    const monthMatches = state.monthKey ? matches.filter(m=>monthKeyOf(m.match_date)===state.monthKey) : [];
    const nearest = nextMatch(matches);
    root.innerHTML = `<section class="tmc-shell">
      <div class="tmc-head"><div><span class="eyebrow">TEAM MATCH CALENDAR</span><h2>تقويم مباريات الفريق</h2></div><div class="tmc-view-switch"><button class="${state.view==="calendar"?"active":""}" data-tmc-view="calendar">📅 التقويم</button><button class="${state.view==="list"?"active":""}" data-tmc-view="list">☰ قائمة المباريات</button></div></div>
      ${nearest ? `<div class="tmc-next"><span>المباراة القادمة</span>${card(data,nearest,true)}</div>` : ""}
      ${months.length ? `<div class="tmc-month-tabs">${months.map(m=>`<button class="${m===state.monthKey?"active":""}" data-tmc-month="${m}">${safe(monthLabel(m))}</button>`).join("")}</div>` : ""}
      ${state.view === "list" ? listView(data,matches) : months.length ? `<div class="tmc-calendar-card"><div class="tmc-calendar-nav"><button type="button" data-tmc-prev>‹ الشهر السابق</button><strong>${safe(monthLabel(state.monthKey))}</strong><button type="button" data-tmc-next>الشهر التالي ›</button></div>${calendarGrid(data,matches,state.monthKey)}<div id="tmcDayMatches" class="tmc-day-matches">${monthMatches.length ? '<p class="tmc-hint">اضغط على يوم مميز لعرض المباراة.</p>' : '<div class="tmc-empty">لا توجد مباريات مسجلة لهذا الفريق خلال هذا الشهر.</div>'}</div></div>` : '<div class="tmc-empty">لا توجد مباريات مسجلة لهذا الفريق.</div>'}
    </section>`;
  }

  function moveMonth(dir){
    const data=getHostData(); if(!data) return;
    const months=availableMonths(teamMatches(data));
    const i=months.indexOf(state.monthKey); const ni=i+dir;
    if(ni>=0&&ni<months.length){state.monthKey=months[ni];render();}
  }

  document.addEventListener("click", (e)=>{
    const month=e.target.closest("[data-tmc-month]"); if(month){state.monthKey=month.dataset.tmcMonth;render();return;}
    const view=e.target.closest("[data-tmc-view]"); if(view){state.view=view.dataset.tmcView;render();return;}
    if(e.target.closest("[data-tmc-prev]")){moveMonth(-1);return;}
    if(e.target.closest("[data-tmc-next]")){moveMonth(1);return;}
    const day=e.target.closest("[data-tmc-date]");
    if(day){
      const data=getHostData(); const box=document.getElementById("tmcDayMatches"); if(!data||!box)return;
      const items=teamMatches(data).filter(m=>m.match_date===day.dataset.tmcDate);
      box.innerHTML=items.map(m=>card(data,m)).join("") || '<div class="tmc-empty">لا توجد مباراة في هذا اليوم.</div>';
    }
  });

  window.AGCH_TEAM_CALENDAR = {
    mount(teamId){ state.teamId=teamId; state.monthKey=""; state.view="calendar"; queueMicrotask(render); },
    refresh(){ render(); }
  };
})();
