(() => {
  "use strict";

  const COPY = {
    ar: {
      title: "البث المباشر",
      live: "مباشر الآن",
      unavailable: "البث المباشر غير متاح حاليًا.",
      unsupported: "نوع البث غير مدعوم.",
      hlsUnsupported: "هذا المتصفح لا يدعم تشغيل هذا البث.",
      watch: "مشاهدة البث",
      facebookLive: "بث مباشر من Facebook",
      facebookHint: "يعرض Facebook بعض روابط البث داخل تطبيقه أو موقعه مباشرة.",
      facebookOpen: "فتح البث على فيسبوك",
    },
    fr: {
      title: "Direct",
      live: "En direct",
      unavailable: "Le direct n’est pas disponible actuellement.",
      unsupported: "Ce type de direct n’est pas pris en charge.",
      hlsUnsupported: "Ce navigateur ne peut pas lire ce direct.",
      watch: "Regarder le direct",
      facebookLive: "Direct sur Facebook",
      facebookHint: "Certains liens Facebook sont lisibles uniquement sur Facebook.",
      facebookOpen: "Ouvrir le direct sur Facebook",
    },
    en: {
      title: "Live Stream",
      live: "Live Now",
      unavailable: "The live stream is currently unavailable.",
      unsupported: "This stream type is not supported.",
      hlsUnsupported: "This browser cannot play this live stream.",
      watch: "Watch Live",
      facebookLive: "Live on Facebook",
      facebookHint: "Some Facebook live links can only be watched directly on Facebook.",
      facebookOpen: "Open live on Facebook",
    },
  };

  const LIVEKIT_SDK = "https://cdn.jsdelivr.net/npm/livekit-client@2.15.6/dist/livekit-client.umd.min.js";
  let hlsLoader = null;
  let liveKitLoader = null;
  const activePlayers = new WeakMap();

  function locale() {
    const lang = (document.documentElement.lang || "ar").toLowerCase();
    return lang.startsWith("fr") ? "fr" : lang.startsWith("en") ? "en" : "ar";
  }

  function copy() {
    return COPY[locale()];
  }

  function safeHttpsUrl(value) {
    try {
      const parsed = new URL(String(value || "").trim());
      return parsed.protocol === "https:" ? parsed : null;
    } catch {
      return null;
    }
  }

  function youtubeId(value) {
    const url = safeHttpsUrl(value);
    if (!url) return "";
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] || "";
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
      else {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["live", "embed", "shorts"].includes(parts[0])) id = parts[1] || "";
      }
    }
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : "";
  }

  function youtubeEmbed(value) {
    const id = youtubeId(value);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1` : "";
  }

  function facebookEmbed(value) {
    const url = safeHttpsUrl(value);
    if (!url || !/(^|\.)facebook\.com$/i.test(url.hostname)) return "";
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.href)}&show_text=false&autoplay=true`;
  }

  function isFacebookShareUrl(value) {
    const url = safeHttpsUrl(value);
    if (!url || !/(^|\.)facebook\.com$/i.test(url.hostname)) return false;
    return /^\/share\/(?:v|r)\//i.test(url.pathname);
  }

  function destroy(container) {
    const player = activePlayers.get(container);
    activePlayers.delete(container);
    if (player?.destroy) player.destroy();
    container.querySelectorAll("iframe,video").forEach((node) => {
      try {
        if (node.tagName === "VIDEO") {
          node.pause();
          node.removeAttribute("src");
          node.load();
        }
      } catch {}
      node.remove();
    });
  }

  function message(container, text) {
    destroy(container);
    const stage = container.querySelector("[data-stream-media]") || container.querySelector("[data-stream-stage]") || container;
    stage.innerHTML = `<div class="stream-unavailable" role="status"><span aria-hidden="true">◉</span><p>${escapeText(text)}</p></div>`;
    container.classList.add("stream-error");
  }

  function escapeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function facebookDirect(container, value) {
    const url = safeHttpsUrl(value);
    if (!url || !/(^|\.)facebook\.com$/i.test(url.hostname)) return message(container, copy().unavailable);
    const stage = container.querySelector("[data-stream-media]") || container.querySelector("[data-stream-stage]") || container;
    const box = document.createElement("div");
    box.className = "facebook-live-direct";
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", copy().facebookLive);
    box.style.cssText = "min-height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:28px 20px;text-align:center;background:linear-gradient(145deg,#101318,#181d25);border-radius:22px;color:#fff";

    const badge = document.createElement("div");
    badge.textContent = "f";
    badge.setAttribute("aria-hidden", "true");
    badge.style.cssText = "width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:#1877f2;color:#fff;font:700 40px/1 Arial,sans-serif";

    const title = document.createElement("strong");
    title.textContent = copy().facebookLive;
    title.style.cssText = "font-size:20px;line-height:1.5";

    const hint = document.createElement("p");
    hint.textContent = copy().facebookHint;
    hint.style.cssText = "margin:0;max-width:520px;opacity:.78;font-size:14px;line-height:1.7";

    const link = document.createElement("a");
    link.href = url.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer external";
    link.textContent = copy().facebookOpen;
    link.style.cssText = "display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 22px;border-radius:14px;background:#1877f2;color:#fff;text-decoration:none;font-weight:800;font-size:16px";

    box.append(badge, title, hint, link);
    stage.replaceChildren(box);
    container.classList.remove("stream-error");
    container.classList.add("stream-ready");
  }

  function frame(container, src, title, sandbox = "") {
    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = title;
    iframe.loading = "lazy";
    iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    if (sandbox) iframe.setAttribute("sandbox", sandbox);
    let loaded = false;
    iframe.addEventListener("load", () => {
      loaded = true;
      container.classList.add("stream-ready");
    }, { once: true });
    iframe.addEventListener("error", () => message(container, copy().unavailable), { once: true });
    (container.querySelector("[data-stream-media]") || container.querySelector("[data-stream-stage]")).replaceChildren(iframe);
    setTimeout(() => {
      if (document.contains(container) && !loaded) message(container, copy().unavailable);
    }, 15000);
  }

  function loadHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsLoader) return hlsLoader;
    hlsLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.6.13/dist/hls.min.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = () => window.Hls ? resolve(window.Hls) : reject(new Error("HLS unavailable"));
      script.onerror = () => reject(new Error("HLS failed to load"));
      document.head.appendChild(script);
    });
    return hlsLoader;
  }

  function loadLiveKit() {
    if (window.LivekitClient) return Promise.resolve(window.LivekitClient);
    if (liveKitLoader) return liveKitLoader;
    liveKitLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = LIVEKIT_SDK;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = () => window.LivekitClient ? resolve(window.LivekitClient) : reject(new Error("LiveKit unavailable"));
      script.onerror = () => reject(new Error("LiveKit failed to load"));
      document.head.appendChild(script);
    });
    return liveKitLoader;
  }

  async function hls(container, source) {
    const video = document.createElement("video");
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("webkit-playsinline", "");
    video.addEventListener("error", () => message(container, copy().unavailable), { once: true });
    (container.querySelector("[data-stream-media]") || container.querySelector("[data-stream-stage]")).replaceChildren(video);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = source;
      video.addEventListener("loadedmetadata", () => {
        container.classList.add("stream-ready");
        video.play().catch(() => {});
      }, { once: true });
      return;
    }

    try {
      const Hls = await loadHls();
      if (!Hls.isSupported()) return message(container, copy().hlsUnsupported);
      const player = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });
      let networkRetries = 0;
      let mediaRetries = 0;
      activePlayers.set(container, player);
      player.loadSource(source);
      player.attachMedia(video);
      player.on(Hls.Events.MANIFEST_PARSED, () => {
        networkRetries = 0;
        mediaRetries = 0;
        container.classList.add("stream-ready");
        video.play().catch(() => {});
      });
      player.on(Hls.Events.ERROR, (_event, data) => {
        if (!data?.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 2) {
          networkRetries += 1;
          player.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetries < 1) {
          mediaRetries += 1;
          player.recoverMediaError();
        } else {
          message(container, copy().unavailable);
        }
      });
    } catch {
      message(container, copy().hlsUnsupported);
    }
  }

  async function liveKit(container, matchId) {
    const stage = container.querySelector("[data-stream-media]") || container.querySelector("[data-stream-stage]");
    if (!stage || !matchId) return message(container, copy().unavailable);

    try {
      const tokenAbort = new AbortController();
      const tokenTimeout = setTimeout(() => tokenAbort.abort(), 12000);
      const tokenRequest = fetch("/api/livekit-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          matchId,
          identity: `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          role: "viewer",
        }),
        signal: tokenAbort.signal,
      }).finally(() => clearTimeout(tokenTimeout));
      const [LK, tokenResponse] = await Promise.all([
        loadLiveKit(),
        tokenRequest,
      ]);
      const auth = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !auth.url || !auth.token) throw new Error(auth.error || "token_failed");

      const room = new LK.Room({ adaptiveStream: true, autoSubscribe: true, disconnectOnPageLeave: true });
      let disposed = false;
      let receivedTrack = false;
      const media = new Set();
      const attachedTracks = new Set();
      const attach = (track) => {
        const trackId = track?.sid || track?.mediaStreamTrack?.id;
        if (trackId && attachedTracks.has(trackId)) return;
        if (trackId) attachedTracks.add(trackId);
        const element = track.attach();
        media.add(element);
        element.autoplay = true;
        if (element.tagName === "VIDEO") {
          element.controls = true;
          element.playsInline = true;
          element.setAttribute("webkit-playsinline", "");
          stage.querySelectorAll("video").forEach((node) => node.remove());
          stage.prepend(element);
        } else {
          element.hidden = true;
          stage.appendChild(element);
          element.play?.().catch(() => {
            const unlock = document.createElement("button");
            unlock.type = "button";
            unlock.className = "livekit-audio-unlock";
            unlock.textContent = locale() === "ar" ? "تشغيل الصوت" : locale() === "fr" ? "Activer le son" : "Enable audio";
            unlock.onclick = () => element.play().then(() => unlock.remove()).catch(() => {});
            stage.appendChild(unlock);
          });
        }
        receivedTrack = true;
        container.classList.add("stream-ready");
      };
      const detach = (track) => {
        const trackId = track?.sid || track?.mediaStreamTrack?.id;
        if (trackId) attachedTracks.delete(trackId);
        track.detach().forEach((element) => {
          media.delete(element);
          element.remove();
        });
      };

      room.on(LK.RoomEvent.TrackSubscribed, attach);
      room.on(LK.RoomEvent.TrackUnsubscribed, detach);
      room.on(LK.RoomEvent.Disconnected, () => {
        if (!disposed && document.contains(container)) message(container, copy().unavailable);
      });

      activePlayers.set(container, {
        destroy() {
          disposed = true;
          media.forEach((element) => element.remove());
          media.clear();
          attachedTracks.clear();
          room.disconnect();
        },
      });
      await room.connect(auth.url, auth.token);

      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          if (publication.track) attach(publication.track);
        });
      });

      setTimeout(() => {
        if (document.contains(container) && !receivedTrack) message(container, copy().unavailable);
      }, 15000);
    } catch {
      message(container, copy().unavailable);
    }
  }

  function render(container, input = {}) {
    if (!container) return;
    destroy(container);
    container.classList.remove("stream-error", "stream-ready");
    const enabled = input.enabled === true || input.enabled === "true";
    const status = String(input.status || "offline").toLowerCase();
    const type = String(input.type || "").toLowerCase();
    if (!enabled || status !== "live") {
      container.hidden = true;
      return;
    }
    container.hidden = false;
    if (type === "livekit") return liveKit(container, input.matchId);
    const url = safeHttpsUrl(input.url);
    if (!url) return message(container, copy().unavailable);

    if (type === "youtube") {
      const src = youtubeEmbed(url.href);
      return src ? frame(container, src, copy().title) : message(container, copy().unavailable);
    }
    if (type === "facebook") {
      if (isFacebookShareUrl(url.href)) return facebookDirect(container, url.href);
      const src = facebookEmbed(url.href);
      return src ? frame(container, src, copy().title) : facebookDirect(container, url.href);
    }
    if (type === "hls") return hls(container, url.href);
    if (type === "embed") {
      return frame(container, url.href, copy().title, "allow-scripts allow-same-origin allow-presentation");
    }
    message(container, copy().unsupported);
  }

  function mount(id = "matchLiveStream") {
    const container = typeof id === "string" ? document.getElementById(id) : id;
    if (!container) return;
    render(container, {
      enabled: container.dataset.streamEnabled,
      status: container.dataset.streamStatus,
      type: container.dataset.streamType,
      url: container.dataset.streamUrl,
      matchId: container.dataset.matchId,
    });
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-stream-jump]");
    if (!button) return;
    event.preventDefault();
    const target = document.getElementById(button.dataset.streamJump || "matchLiveStream");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  window.AGCH_LIVE_STREAM = {
    mount,
    render,
    destroy,
    copy,
    youtubeId,
    youtubeEmbed,
    facebookEmbed,
    isFacebookShareUrl,
    facebookDirect,
    safeHttpsUrl,
    liveKit,
  };
})();
