(() => {
  "use strict";

  const shell = (paths) =>
    `<svg class="ui-nav-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const icons = {
    search: shell(
      '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.2 4.2"/>',
    ),
    home: shell(
      '<path d="m3.8 10.6 8.2-6.7 8.2 6.7v8.1a1.5 1.5 0 0 1-1.5 1.5H5.3a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M9.3 20.2v-6.1h5.4v6.1"/>',
    ),
    matches: shell(
      '<rect x="3.7" y="5.4" width="16.6" height="15" rx="4"/><path d="M8 3.5v4M16 3.5v4M3.7 10.1h16.6"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.3h.01M12 17.3h.01"/>',
    ),
    tournament: shell(
      '<path d="M7.2 4.1h9.6v3.2a4.8 4.8 0 0 1-9.6 0z"/><path d="M9.6 12v3.4h4.8V12M8 20h8M10 15.4V20m4-4.6V20"/><path d="M7.2 6H4.1v1.1a4.3 4.3 0 0 0 4.3 4.3M16.8 6h3.1v1.1a4.3 4.3 0 0 1-4.3 4.3"/>',
    ),
    teams: shell(
      '<circle cx="9" cy="8.1" r="3.1"/><circle cx="17.2" cy="9.3" r="2.3"/><path d="M3.4 20.1a5.6 5.6 0 0 1 11.2 0M14.3 16a4.7 4.7 0 0 1 6.3 4.1"/>',
    ),
    more: shell(
      '<rect x="4" y="4" width="6" height="6" rx="2"/><rect x="14" y="4" width="6" height="6" rx="2"/><rect x="4" y="14" width="6" height="6" rx="2"/><rect x="14" y="14" width="6" height="6" rx="2"/>',
    ),
  };

  const teamLogoSelectors = [
    ".team img",
    ".teamcard img",
    ".ref-team img",
    ".middle-side img",
    ".middle-team-visual img",
    ".middle-hero-team img",
    ".profile-logo",
    ".table-team img",
    ".favorite-card img",
    ".pred-team img",
    ".score-pick img",
    ".search-result img[data-team-logo]",
  ];
  const tournamentAlts = ["شعار كأس أغشوركيت", "شعار البطولة"];
  let navObserver = null,
    domObserver = null,
    lastToast = 0;

  const isTeamLogo = (img) => teamLogoSelectors.some((s) => img.matches?.(s));
  const isTournamentImage = (img) =>
    tournamentAlts.some((x) => (img.alt || "").includes(x)) ||
    img.id === "brandLogo" ||
    img.id === "heroLogo";
  const pointsToTournament = (img) =>
    /assets\/tournament\.jpg(?:$|\?)/.test(img.getAttribute("src") || "") ||
    /assets\/tournament\.jpg(?:$|\?)/.test(img.currentSrc || "");

  function setIcon(el, html) {
    if (!el || el.innerHTML === html) return;
    el.innerHTML = html;
  }

  function upgradeChrome() {
    document.body.classList.add("world-sport");
    const search = document.getElementById("searchBtn");
    if (search) {
      setIcon(search, icons.search);
      search.setAttribute("aria-label", "البحث");
      search.type = "button";
    }
    document.querySelectorAll(".nav [data-page]").forEach((btn) => {
      const span = btn.querySelector("span");
      if (span) setIcon(span, icons[btn.dataset.page] || icons.more);
      btn.type = "button";
      btn.setAttribute(
        "aria-label",
        btn.querySelector("b")?.textContent?.trim() ||
          btn.dataset.page ||
          "تنقل",
      );
      if (btn.classList.contains("active"))
        btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
  }

  function replaceBrokenTeamLogo(img) {
    if (!img || img.dataset.safeLogo === "placeholder") return;
    img.dataset.safeLogo = "placeholder";
    img.onerror = null;
    img.src = "assets/logo-placeholder.svg";
    img.alt = img.alt ? `${img.alt} — الشعار غير متوفر` : "الشعار غير متوفر";
    img.style.objectFit = "contain";
  }

  function prepareImage(img) {
    if (!(img instanceof HTMLImageElement)) return;
    img.decoding = "async";
    if (!img.loading) img.loading = "lazy";
    if (isTeamLogo(img)) {
      img.style.objectFit = "contain";
      if (pointsToTournament(img) && !isTournamentImage(img))
        replaceBrokenTeamLogo(img);
    }
  }

  function scanImages(root = document) {
    if (root instanceof HTMLImageElement) prepareImage(root);
    root.querySelectorAll?.("img").forEach(prepareImage);
  }

  function installImageGuard() {
    document.addEventListener(
      "error",
      (e) => {
        const img = e.target;
        if (!(img instanceof HTMLImageElement)) return;
        if (isTeamLogo(img) && !isTournamentImage(img))
          replaceBrokenTeamLogo(img);
        else if (isTournamentImage(img) && !pointsToTournament(img)) {
          img.onerror = null;
          img.src = "assets/tournament.jpg";
        }
      },
      true,
    );
    scanImages();
    domObserver = new MutationObserver((records) => {
      records.forEach((r) =>
        r.addedNodes.forEach((n) => {
          if (n.nodeType === 1) scanImages(n);
        }),
      );
    });
    domObserver.observe(document.body, { subtree: true, childList: true });
  }

  function manualGo(page) {
    const target = document.getElementById(page);
    if (!target) return false;
    document
      .querySelectorAll(".page")
      .forEach((p) => p.classList.toggle("active", p === target));
    document.querySelectorAll(".nav [data-page]").forEach((b) => {
      const on = b.dataset.page === page;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    try {
      history.replaceState(null, "", `#${page}`);
    } catch {}
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  function installNavigationGuard() {
    const original =
      typeof window.go === "function" ? window.go.bind(window) : null;
    window.go = function (page) {
      if (original) {
        try {
          const result = original(page);
          setTimeout(() => {
            manualGo(page);
            upgradeChrome();
          }, 0);
          return result;
        } catch (e) {
          console.warn("Primary navigation fallback used", e);
        }
      }
      return manualGo(page);
    };
    document.addEventListener("click", (e) => {
      const nav = e.target.closest(".nav [data-page]");
      if (nav) {
        const page = nav.dataset.page;
        setTimeout(() => {
          manualGo(page);
          upgradeChrome();
        }, 0);
      }
    });
    addEventListener("hashchange", () => {
      const page = location.hash.replace("#", "");
      if (page && document.getElementById(page)) manualGo(page);
    });
  }

  function enhanceButtons() {
    document
      .querySelectorAll("button:not([type])")
      .forEach((b) => (b.type = "button"));
    document
      .querySelectorAll("[data-open-match],[data-open-team],[data-news]")
      .forEach((el) => {
        if (!el.getAttribute("role") && el.tagName !== "BUTTON")
          el.setAttribute("role", "button");
      });
  }

  function ensureContentClearance() {
    document.documentElement.style.setProperty(
      "--safe-nav-space",
      "calc(120px + env(safe-area-inset-bottom))",
    );
    const nav = document.querySelector(".nav");
    if (nav) {
      const h = Math.ceil(nav.getBoundingClientRect().height || 78);
      document.documentElement.style.setProperty(
        "--ui-nav",
        `${Math.max(70, Math.min(h, 92))}px`,
      );
    }
  }

  function toast(text) {
    const now = Date.now();
    if (now - lastToast < 2500) return;
    lastToast = now;
    let el = document.getElementById("uiStatusToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "uiStatusToast";
      Object.assign(el.style, {
        position: "fixed",
        zIndex: "9999",
        left: "50%",
        bottom: "calc(104px + env(safe-area-inset-bottom))",
        transform: "translateX(-50%)",
        background: "#151b17",
        color: "#fff",
        border: "1px solid rgba(255,255,255,.12)",
        borderRadius: "14px",
        padding: "10px 14px",
        font: "700 11px Cairo",
        boxShadow: "0 12px 34px rgba(0,0,0,.3)",
        maxWidth: "calc(100vw - 32px)",
        textAlign: "center",
      });
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.hidden = false;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => (el.hidden = true), 2600);
  }

  function installNetworkState() {
    addEventListener("offline", () =>
      toast("لا يوجد اتصال بالإنترنت. سيتم عرض آخر بيانات محفوظة إن توفرت."),
    );
    addEventListener("online", () => toast("عاد الاتصال بالإنترنت."));
  }

  async function refreshServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
    } catch {}
  }

  function watchChrome() {
    const nav = document.querySelector(".nav");
    if (!nav) return;
    navObserver = new MutationObserver(() => {
      navObserver.disconnect();
      try {
        upgradeChrome();
        enhanceButtons();
        ensureContentClearance();
      } finally {
        navObserver.observe(nav, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["class"],
        });
      }
    });
    navObserver.observe(nav, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  function init() {
    upgradeChrome();
    enhanceButtons();
    installImageGuard();
    installNavigationGuard();
    installNetworkState();
    ensureContentClearance();
    watchChrome();
    scanImages();
    const page = location.hash.replace("#", "");
    if (page && document.getElementById(page))
      setTimeout(() => manualGo(page), 20);
    setTimeout(refreshServiceWorker, 900);
    addEventListener("resize", ensureContentClearance, { passive: true });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
