/* Christmas decorations, switched on by date: from 24 November to 10 January (Rome time), every
   year, with nothing to remember. Loaded in <head> of every page, before the header is written.

   To change the dates or the decorations, edit START, END and FEATURES below.
   To preview or test, add to any page address (it then stays on in that tab while you browse):
     ?xmas=on         all decorations, whatever the date
     ?xmas=off        none, whatever the date (also ends a preview)
     ?xmas=hat,snow   only the ones listed

   Decorations (each is a class on <html>, styled in style.css under "Christmas"):
     logo    Christmas logo in the header and browser tab
     footer  festive line in the footer credit
     globe   snow falling inside the round "Brewing..." illustration
     holly   holly sprigs on the corners of the cards
     hat     a Santa hat riding on the header pill
     lights  a string of lights along the bottom of the header
     snow    a few snowflakes drifting down the background */
(function () {
  const START = { month: 11, day: 24 };     // 24 November
  const END = { month: 1, day: 10 };        // 10 January (inclusive)
  const FEATURES = ["logo", "footer", "globe", "holly", "hat", "lights", "snow"];
  // Master switch. false: hidden from visitors, shown only with ?xmas=on (preview).
  // true: on by date, START to END.
  const LIVE = false;

  function today() {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", month: "numeric", day: "numeric" })
      .formatToParts(new Date());
    const get = t => +parts.find(p => p.type === t).value;
    return { month: get("month"), day: get("day") };
  }

  function inSeason(d) {
    const n = d.month * 100 + d.day, s = START.month * 100 + START.day, e = END.month * 100 + END.day;
    return s <= e ? n >= s && n <= e : n >= s || n <= e;   // the season runs over New Year
  }

  let on = FEATURES;
  try {
    // a preview (?xmas=...) stays on while you browse the site in that tab; ?xmas=off ends it
    let q = new URLSearchParams(location.search).get("xmas");
    if (q) sessionStorage.setItem("xmas", q); else q = sessionStorage.getItem("xmas");
    if (q === "off") sessionStorage.removeItem("xmas");
    if (q === "off") on = [];
    else if (q && q !== "on") on = q.split(",").filter(f => FEATURES.includes(f));
    else if (!q && (!LIVE || !inSeason(today()))) on = [];
  } catch (e) {
    if (!LIVE || !inSeason(today())) on = [];
  }

  const root = document.documentElement;
  if (on.length) root.classList.add("xmas");
  on.forEach(f => root.classList.add("xmas-" + f));

  window.DynamicsCafeSeason = { has: f => on.includes(f) };

  // Christmas logo in the browser tab
  if (on.includes("logo")) {
    document.querySelectorAll('link[rel="icon"]').forEach(l => {
      l.href = l.href.replace(/img\/favicon-(\d+)\.png/, "img/xmas/favicon-$1.png");
    });
  }

  // snow globe: flakes falling inside the round "Brewing..." illustration, settling at the bottom
  if (on.includes("globe") && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const mountGlobe = art => {
      if (art.querySelector(".xmas-globe-snow")) return;
      const S = 176, dpr = Math.min(2, window.devicePixelRatio || 1);
      const c = document.createElement("canvas");
      c.className = "xmas-globe-snow";
      c.setAttribute("aria-hidden", "true");
      c.width = c.height = S * dpr;
      art.appendChild(c);
      const g = c.getContext("2d");
      g.scale(dpr, dpr);
      const flakes = Array.from({ length: 26 }, () => ({
        x: Math.random() * S, y: Math.random() * S, r: 1.1 + Math.random() * 1.9,
        v: 9 + Math.random() * 14, d: Math.random() * 6.3, s: 3 + Math.random() * 6
      }));
      let last = 0, raf = null, seen = false;
      function frame(now) {
        raf = requestAnimationFrame(frame);
        if (now - last < 33) return;
        const dt = Math.min(0.1, (now - last) / 1000 || 0);
        last = now;
        g.clearRect(0, 0, S, S);
        // a soft drift of settled snow along the bottom of the globe
        const ground = g.createRadialGradient(S / 2, S + 40, 20, S / 2, S + 40, 70);
        ground.addColorStop(0, "rgba(255,255,255,1)");
        ground.addColorStop(0.75, "rgba(255,255,255,0.95)");
        ground.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = ground;
        g.fillRect(0, S - 40, S, 40);
        g.shadowColor = "rgba(110, 70, 40, 0.45)";
        g.shadowBlur = 2;
        g.fillStyle = "#fff";
        for (const f of flakes) {
          f.y += f.v * dt; f.d += dt * 0.9;
          if (f.y > S - 8) { f.y = -4; f.x = Math.random() * S; }
          g.beginPath();
          g.arc(f.x + Math.sin(f.d) * f.s, f.y, f.r, 0, Math.PI * 2);
          g.fill();
        }
        g.shadowBlur = 0;
      }
      // animate only while the globe is on screen
      new IntersectionObserver(([e]) => {
        seen = e.isIntersecting;
        if (seen && !raf) { last = 0; raf = requestAnimationFrame(frame); }
        if (!seen && raf) { cancelAnimationFrame(raf); raf = null; }
      }).observe(art);
    };
    const scan = () => document.querySelectorAll(".brew-art").forEach(mountGlobe);
    document.addEventListener("DOMContentLoaded", () => {
      scan();
      new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    });
  }

  // a few snowflakes drifting down the background: small elements moved by the browser itself
  // (a full-screen canvas for them cost a quarter of the frame rate on slow computers)
  if (on.includes("snow") && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.addEventListener("DOMContentLoaded", () => {
      const layer = document.createElement("div");
      layer.className = "xmas-snow-layer";
      layer.setAttribute("aria-hidden", "true");
      const n = window.innerWidth < 650 ? 18 : 34;
      let html = "";
      for (let i = 0; i < n; i++) {
        const size = (3 + Math.random() * 5).toFixed(1);
        const fall = (16 + Math.random() * 18).toFixed(1);
        const sway = (3 + Math.random() * 4).toFixed(1);
        html += `<i style="left:${(Math.random() * 100).toFixed(2)}%;--s:${size}px;` +
          `animation-duration:${fall}s;animation-delay:-${(Math.random() * fall).toFixed(1)}s">` +
          `<b style="animation-duration:${sway}s;animation-delay:-${(Math.random() * sway).toFixed(1)}s"></b></i>`;
      }
      layer.innerHTML = html;
      document.body.prepend(layer);
    });
  }
})();
