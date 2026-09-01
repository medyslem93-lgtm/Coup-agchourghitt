(() => {
  "use strict";

  const LIVE_TEXT = "مباشر";
  const TICK_MS = 1000;

  function parseKickoff(date, time) {
    if (!date || !time) return null;
    const clean = String(time).slice(0, 5);
    const value = Date.parse(`${date}T${clean}:00Z`);
    return Number.isFinite(value) ? value : null;
  }

  function minuteFromKickoff(kickoff) {
    const elapsed = Math.max(0, Date.now() - kickoff);
    return Math.max(1, Math.floor(elapsed / 60000) + 1);
  }

  function matchMinute(match) {
    if (!match || match.status !== LIVE_TEXT) return null;
    const kickoff = parseKickoff(match.match_date, match.match_time);
    if (!kickoff) return Number(match.minute) || 1;
    return minuteFromKickoff(kickoff);
  }

  function updateVisibleClocks() {
    document.querySelectorAll('[data-live-kickoff]').forEach((node) => {
      const kickoff = Number(node.dataset.liveKickoff);
      if (!Number.isFinite(kickoff)) return;
      node.textContent = `${minuteFromKickoff(kickoff)}′`;
    });
  }

  window.AGCH_LIVE_CLOCK = {
    matchMinute,
    kickoff(match) {
      return parseKickoff(match?.match_date, match?.match_time);
    },
    markup(match) {
      if (!match || match.status !== LIVE_TEXT) return "";
      const kickoff = parseKickoff(match.match_date, match.match_time);
      const minute = kickoff ? minuteFromKickoff(kickoff) : (Number(match.minute) || 1);
      return kickoff
        ? `<span class="live-minute" data-live-kickoff="${kickoff}">${minute}′</span>`
        : `<span class="live-minute">${minute}′</span>`;
    }
  };

  window.setInterval(updateVisibleClocks, TICK_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateVisibleClocks();
  });
})();
