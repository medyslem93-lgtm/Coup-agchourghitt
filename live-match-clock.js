(() => {
  "use strict";
  const LIVE = "مباشر";
  let liveMatches = [];

  function kickoff(match) {
    if (!match?.match_date || !match?.match_time) return NaN;
    return Date.parse(`${match.match_date}T${String(match.match_time).slice(0, 8)}Z`);
  }

  function minute(match) {
    const start = kickoff(match);
    if (!Number.isFinite(start)) return Number(match?.minute) || 1;
    return Math.max(1, Math.floor((Date.now() - start) / 60000) + 1);
  }

  function paint() {
    document.querySelectorAll('[data-route^="match/"]').forEach((card) => {
      const id = String(card.getAttribute("data-route") || "").replace(/^match\//, "");
      const match = liveMatches.find((item) => String(item.id) === id);
      if (!match) return;
      const value = minute(match);
      const scoreMinute = card.querySelector(".score-block small, .match-score small");
      if (scoreMinute) {
        scoreMinute.classList.add("live-minute");
        scoreMinute.textContent = `${value}′`;
      }
      const status = card.querySelector(".status-pill");
      if (status && status.textContent.includes(LIVE)) {
        status.innerHTML = `<span class="live-dot"></span>${LIVE} · <span class="live-minute">${value}′</span>`;
      }
    });
  }

  async function start() {
    const config = window.AGCH_CONFIG || {};
    const db = window.supabase?.createClient?.(config.supabaseUrl, config.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
    if (!db) return;
    async function reload() {
      const { data, error } = await db.from("matches").select("id,status,match_date,match_time,minute").eq("status", LIVE);
      if (!error) liveMatches = data || [];
      paint();
    }
    await reload();
    const root = document.getElementById("appMain");
    if (root) new MutationObserver(paint).observe(root, { childList: true, subtree: true });
    setInterval(paint, 1000);
    db.channel("live-match-clock").on("postgres_changes", { event: "*", schema: "public", table: "matches" }, reload).subscribe();
  }

  window.addEventListener("DOMContentLoaded", start, { once: true });
})();
