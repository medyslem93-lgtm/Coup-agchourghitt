(() => {
  "use strict";
  const LIVE = "مباشر";
  const matches = new Map();
  const number = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  function seconds(match, now = Date.now()) {
    let total = number(match?.clock_elapsed_seconds ?? number(match?.minute) * 60);
    if (match?.clock_running && match.clock_anchor_at) {
      const anchor = Date.parse(match.clock_anchor_at);
      if (Number.isFinite(anchor)) total += Math.max(0, Math.floor((now - anchor) / 1000));
    }
    return Math.floor(total);
  }
  function format(match, now = Date.now()) {
    const value = seconds(match, now);
    return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  }
  function minute(match, now = Date.now()) { return Math.floor(seconds(match, now) / 60); }
  function phase(match, now = Date.now()) {
    const value = minute(match, now);
    return value > 90 ? "وقت إضافي" : value >= 45 ? "الشوط الثاني" : "الشوط الأول";
  }
  window.AGCH_MATCH_CLOCK = { seconds, format, minute, phase };
  function setText(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }
  function paint() {
    const now = Date.now();
    document.querySelectorAll('[data-route^="match/"]').forEach(card => {
      const id = String(card.getAttribute("data-route") || "").replace(/^match\//, "");
      const match = matches.get(id);
      if (!match) return;
      setText(card.querySelector(".score-block small,.match-score small"), `${minute(match, now)}′`);
    });
    const id = (location.hash.match(/match\/([^/?#]+)/) || [])[1];
    const match = matches.get(id);
    if (!match) return;
    const value = minute(match, now);
    const stream = document.getElementById("matchLiveStream");
    setText(document.querySelector(".match-center-score small"), `${value}′`);
    if (stream?.dataset.matchId !== id) return;
    setText(stream.querySelector("[data-broadcast-minute]"), format(match, now));
    setText(stream.querySelector("[data-broadcast-period]"), phase(match, now));
    setText(stream.querySelector("[data-stream-kicker-text]"), `مباشر الآن · ${value}′`);
  }
  window.addEventListener("agh:live-state", event => {
    matches.clear();
    for (const match of event.detail?.matches || []) {
      if (match.status === LIVE || match.stream_status === "live") matches.set(String(match.id), match);
    }
    paint();
  });
  window.addEventListener("hashchange", () => requestAnimationFrame(paint));
  setInterval(() => { if (!document.hidden) paint(); }, 1000);
})();
