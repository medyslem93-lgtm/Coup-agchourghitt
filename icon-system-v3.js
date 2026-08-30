(() => {
  "use strict";

  const paths = {
    ball: '<circle cx="12" cy="12" r="8.5"/><path d="m9.2 9.4 2.8-2 2.8 2-1.1 3.3h-3.4zM7.2 15.8l3.1-3.1M13.7 12.7l3.1 3.1M7 8.4l2.2 1M14.8 9.4l2.2-1M9.2 18.1l-2-2.3M14.8 18.1l2-2.3"/>',
    target:
      '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2"/><path d="m15.2 8.8 4-4M16.2 4.8h3v3"/>',
    assist:
      '<circle cx="7" cy="12" r="3.2"/><circle cx="17" cy="7" r="2.5"/><path d="M9.8 10.5 14.6 8M9.8 13.5l6.8 3.2M17 13.8v5M14.5 16.3h5"/>',
    shield:
      '<path d="M12 3.5 19 6v5.3c0 4.4-2.8 7.5-7 9.2-4.2-1.7-7-4.8-7-9.2V6z"/><path d="m8.8 12 2 2 4.5-4.5"/>',
    star: '<path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z"/>',
    search:
      '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.2 4.2"/>',
    heart:
      '<path d="M20.2 9.1c0 5.2-8.2 10.1-8.2 10.1S3.8 14.3 3.8 9.1A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 8.2 1.8z"/>',
    crown: '<path d="m4 7 4.2 3.3L12 5l3.8 5.3L20 7l-1.4 10H5.4zM6 20h12"/>',
    calendar:
      '<rect x="3.7" y="5.3" width="16.6" height="15" rx="3.5"/><path d="M8 3.5v4M16 3.5v4M3.7 10h16.6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>',
    trophy:
      '<path d="M7.2 4.1h9.6v3.2a4.8 4.8 0 0 1-9.6 0zM10 12v5m4-5v5M8 20h8M7.2 6H4v1a4.4 4.4 0 0 0 4.4 4.4M16.8 6H20v1a4.4 4.4 0 0 1-4.4 4.4"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="2"/><rect x="14" y="4" width="6" height="6" rx="2"/><rect x="4" y="14" width="6" height="6" rx="2"/><rect x="14" y="14" width="6" height="6" rx="2"/>',
    bolt: '<path d="m13.8 2.8-8 11h5.7l-1.3 7.4 8-11h-5.7z"/>',
    users:
      '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M14.2 15.8a4.6 4.6 0 0 1 6.3 4.2"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    close: '<path d="m7 7 10 10M17 7 7 17"/>',
    whistle:
      '<path d="M5 13.5a5 5 0 1 0 10 0V9H9v4.5a1 1 0 0 1-2 0V8l7-3M15 10h5l-2 3h-3"/>',
  };

  const svg = (name, className = "ui-glyph") =>
    `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.grid}</svg>`;

  const setBoxIcon = (box, name) => {
    if (!box || box.dataset.iconV3 === name) return;
    box.dataset.iconV3 = name;
    box.innerHTML = svg(name);
  };

  const prependIcon = (element, name) => {
    if (!element || element.dataset.iconV3) return;
    element.dataset.iconV3 = name;
    element.insertAdjacentHTML("afterbegin", svg(name));
  };

  const decorate = (root = document) => {
    root.querySelectorAll?.("[data-quickcat]").forEach((button) => {
      const names = { الكبار: "trophy", الوسط: "shield", الصغار: "ball" };
      setBoxIcon(
        button.querySelector(":scope > span"),
        names[button.dataset.quickcat] || "ball",
      );
    });

    root.querySelectorAll?.(".stat-card[data-stat]").forEach((card) => {
      const names = {
        scorers: "target",
        assists: "assist",
        keeper: "shield",
        motm: "star",
      };
      setBoxIcon(
        card.querySelector(":scope > span"),
        names[card.dataset.stat] || "chart",
      );
    });

    const actions = [
      ["openLeaderboard", "crown"],
      ["moreSearch", "search"],
      ["favoriteBtn", "heart"],
    ];
    actions.forEach(([id, name]) => {
      const card = document.getElementById(id);
      if (!card || card.querySelector(":scope > .action-icon-v3")) return;
      card.insertAdjacentHTML(
        "afterbegin",
        `<i class="action-icon-v3">${svg(name)}</i>`,
      );
    });

    root
      .querySelectorAll?.(".match-card .match-meta > span:first-child")
      .forEach((item) => prependIcon(item, "trophy"));
    root
      .querySelectorAll?.(".match-card .match-footer > span:first-child")
      .forEach((item) => prependIcon(item, "calendar"));
    root
      .querySelectorAll?.(".match-card .match-footer > span:last-child")
      .forEach((item) => prependIcon(item, "clock"));

    root.querySelectorAll?.("[data-v2-pane]").forEach((button) => {
      const names = {
        overview: "grid",
        events: "bolt",
        lineups: "users",
        stats: "chart",
      };
      prependIcon(button, names[button.dataset.v2Pane] || "grid");
    });

    root.querySelectorAll?.("[data-pred-pane]").forEach((button) => {
      button.querySelector(":scope > span")?.remove();
      prependIcon(button, "trophy");
    });

    root.querySelectorAll?.(".player-row > span:last-child").forEach((box) => {
      if (box.dataset.iconV3) return;
      const count = (box.textContent.match(/\d+/) || ["0"])[0];
      box.dataset.iconV3 = "ball";
      box.innerHTML = `${svg("ball")}<b>${count}</b>`;
    });

    root.querySelectorAll?.(".search-result .mini-letter").forEach((box) => {
      if (/⚽/.test(box.textContent)) setBoxIcon(box, "ball");
    });

    root.querySelectorAll?.("[data-v2-close]").forEach((button) => {
      if (button.dataset.iconV3) return;
      button.dataset.iconV3 = "close";
      button.innerHTML = `${svg("close")}<span>إغلاق</span>`;
    });

    root.querySelectorAll?.(".event-row").forEach((row) => {
      const box = row.querySelector(":scope > span");
      const text = row.querySelector("b")?.textContent || "";
      const name = /هدف|جزاء/.test(text)
        ? "ball"
        : /بطاقة/.test(text)
          ? "shield"
          : /تبديل/.test(text)
            ? "users"
            : /رجل/.test(text)
              ? "star"
              : /بداية|نهاية/.test(text)
                ? "whistle"
                : "bolt";
      setBoxIcon(box, name);
    });
  };

  const init = () => {
    document.body.classList.add("icon-system-v3");
    decorate();
    new MutationObserver((records) => {
      records.forEach((record) =>
        record.addedNodes.forEach(
          (node) => node.nodeType === 1 && decorate(node),
        ),
      );
    }).observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
