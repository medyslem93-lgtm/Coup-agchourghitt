(() => {
  "use strict";

  const buildDateRail = () => {
    const rail = document.getElementById("dateRail");
    if (!rail) return;
    const today = new Date();
    rail.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index - 3);
      const day = new Intl.DateTimeFormat("ar-MR", { weekday: "short" }).format(
        date,
      );
      const active = index === 3;
      return `<span class="${active ? "active" : ""}"><small>${day}</small><b>${date.getDate()}</b>${active ? "<i>اليوم</i>" : ""}</span>`;
    }).join("");
  };

  const installQuickCategories = () => {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-quickcat]");
      if (!button) return;
      const category = button.dataset.quickcat;
      const target = document.querySelector(`[data-matchcat="${category}"]`);
      if (target) target.click();
      if (typeof window.go === "function") window.go("matches");
    });
  };

  const markFeaturedMatch = () => {
    const target = document.getElementById("nextMatch");
    if (!target) return;
    const apply = () =>
      target.querySelector(".match-card")?.classList.add("featured-match");
    apply();
    new MutationObserver(apply).observe(target, {
      childList: true,
      subtree: true,
    });
  };

  const init = () => {
    document.body.classList.add("sports-app-v2");
    buildDateRail();
    installQuickCategories();
    markFeaturedMatch();
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
