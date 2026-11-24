/* Christmas decorations, switched on by date: from 24 November to 10 January (Rome time), every
   year, with nothing to remember. Loaded in <head> of every page, before the header is written.

   To change the dates or the decorations, edit START, END and FEATURES below.
   To preview or test, add to any page address (it then stays on in that tab while you browse):
     ?xmas=on         all decorations, whatever the date
     ?xmas=off        none, whatever the date (also ends a preview)
     ?xmas=hat,globe  only the ones listed

   Decorations (each is a class on <html>, styled in style.css under "Christmas"):
     logo    Christmas logo in the header and browser tab
     footer  festive line in the footer credit
     globe   snow falling inside the round "Brewing..." illustration
     garland an evergreen garland along the top of each card, with different ornaments
             hanging from it card to card (drawn by js/garland.js)
     hat     a Santa hat riding on the header pill
     lights  a string of lights along the bottom of the header */
(function () {
  const START = { month: 11, day: 24 };     // 24 November
  const END = { month: 1, day: 10 };        // 10 January (inclusive)
  const FEATURES = ["logo", "footer", "globe", "garland", "hat", "lights"];
  // Master switch. false: hidden from visitors, shown only with ?xmas=on (preview).
  // true: on by date, START to END.
  const LIVE = true;

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

  // lights: a string of bulbs along the bottom of the header, each on its own rhythm
  if (on.includes("lights")) {
    const COLORS = [["#B8323C", "#FF8A8A"], ["#E0A23A", "#FFE3A0"], ["#2F7A4E", "#9FE0B0"],
                    ["#D9782E", "#FFC28A"], ["#F3E7C9", "#FFFFFF"]];
    const INK = "#3A160A";
    const draw = bar => {
      const W = bar.clientWidth;
      if (!W || +bar.dataset.lightsW === W) return;
      bar.dataset.lightsW = W;
      const gap = 58, n = Math.max(4, Math.round(W / gap)), step = W / n;
      let wireA = "M0 3", wireB = "M0 3", bulbs = "", glows = "";
      for (let i = 0; i < n; i++) {
        const x0 = i * step, x1 = x0 + step, mx = x0 + step / 2;
        wireA += ` Q${(mx).toFixed(1)} 15 ${x1.toFixed(1)} 3`;
        wireB += ` Q${(mx).toFixed(1)} 13 ${x1.toFixed(1)} 4`;
        const [col, core] = COLORS[(i * 3) % COLORS.length];
        const tilt = ((i * 37) % 23) - 11, y = 9.5;            // hanging at slightly different angles
        const dur = (2.6 + ((i * 53) % 17) / 10).toFixed(2), delay = (-((i * 71) % 29) / 10).toFixed(2);
        glows += `<ellipse class="xl-glow" cx="${mx.toFixed(1)}" cy="${y + 12}" rx="13" ry="15" fill="url(#xl-g${(i * 3) % COLORS.length})" style="animation-duration:${dur}s;animation-delay:${delay}s"/>`;
        bulbs += `<g transform="translate(${mx.toFixed(1)} ${y}) rotate(${tilt})">
          <rect x="-3.4" y="-1" width="6.8" height="6" rx="1.4" fill="#1F3A28" stroke="${INK}" stroke-width=".9"/>
          <path d="M-4.6 5.4 C-6.8 10 -5.4 16 0 21.5 C5.4 16 6.8 10 4.6 5.4 Z" fill="${col}" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
          <path class="xl-core" d="M-2 8 C-3 11 -2 15 0 18 C2 15 3 11 2 8 Z" fill="${core}" style="animation-duration:${dur}s;animation-delay:${delay}s"/>
          <path d="M-2.6 7.6 C-3.6 10 -3.4 12.6 -2.4 14.4" stroke="#fff" stroke-width="1.1" opacity=".7" fill="none" stroke-linecap="round"/></g>`;
      }
      const grads = COLORS.map(([c], k) => `<radialGradient id="xl-g${k}"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join("");
      let svg = bar.querySelector(":scope > .xmas-lights-svg");
      if (!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "xmas-lights-svg");
        svg.setAttribute("aria-hidden", "true");
        bar.appendChild(svg);
      }
      svg.setAttribute("width", W); svg.setAttribute("height", 40); svg.setAttribute("viewBox", `0 0 ${W} 40`);
      svg.innerHTML = `<defs>${grads}</defs>${glows}
        <path d="${wireB}" stroke="#1F3A28" stroke-width="1.3" fill="none"/>
        <path d="${wireA}" stroke="#2A4A34" stroke-width="1.5" fill="none"/>${bulbs}`;
    };
    document.addEventListener("DOMContentLoaded", () => {
      const bar = document.querySelector(".site-header .header-bar");
      if (!bar) return;
      draw(bar);
      new ResizeObserver(() => draw(bar)).observe(bar);
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
      const flakes = Array.from({ length: 34 }, () => ({
        x: Math.random() * S, y: Math.random() * S, r: 1.5 + Math.random() * 2.3,
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
        g.beginPath();
        g.moveTo(0, S - 22);
        g.bezierCurveTo(S * 0.25, S - 34, S * 0.45, S - 20, S * 0.62, S - 28);
        g.bezierCurveTo(S * 0.78, S - 35, S * 0.9, S - 24, S, S - 30);
        g.lineTo(S, S); g.lineTo(0, S); g.closePath();
        g.fillStyle = "#fff";
        g.fill();
        g.strokeStyle = "rgba(90, 120, 150, 0.55)";
        g.lineWidth = 1.2;
        g.stroke();
        g.shadowColor = "rgba(40, 70, 100, 0.55)";
        g.shadowBlur = 3;
        g.fillStyle = "#fff";
        for (const f of flakes) {
          f.y += f.v * dt; f.d += dt * 0.9;
          if (f.y > S - 26) { f.y = -4; f.x = Math.random() * S; }
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

})();
