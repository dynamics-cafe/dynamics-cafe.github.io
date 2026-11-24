/* Christmas garlands (the "garland" decoration of js/season.js).

   Hierarchy, so that nothing competes:
   - the next-seminar card gets the one featured garland, the richest piece on the site;
   - the team page gets one garland swagged across each row of cards, with a different
     ornament hanging over each person's card;
   - the "Give a talk" panel gets a single sprig on one corner;
   - everything else stays as it is (the header has the lights and the hat).

   One visual language throughout: dark ink outlines and flat painted fills, like the logo,
   in a small palette (evergreen, cranberry, brass and the site's copper).

   The ornaments hang like damped pendulums: they settle gently when the page opens and
   swing when the pointer brushes them (not for visitors who ask for reduced motion). */
(function () {
  if (!(window.DynamicsCafeSeason && window.DynamicsCafeSeason.has("garland"))) return;

  const NS = "http://www.w3.org/2000/svg";
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const INK = "#3A160A";
  const GREEN = { back: "#1F4A31", mid: "#2D6140", front: "#4A7F52", stem: "#2A3A1E" };
  const CRAN = "#A8323A", CRAN_DARK = "#7A2229";
  const BRASS = "#C9A24A", BRASS_LIGHT = "#E6C77A";
  const COPPER = "#D9782E";
  const STRING = "#8A6A44";

  function rng(seed) {
    let s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return () => (s = s * 16807 % 2147483647) / 2147483647;
  }
  const f = n => n.toFixed(1);

  /* ---------- ornaments: drawn hanging from (0,0), the end of their string ---------- */

  const cap = (w = 6) => `<path d="M-1.6 -0.6 a1.6 1.6 0 1 1 3.2 0" fill="none" stroke="${INK}" stroke-width="1"/>
    <rect x="${-w / 2}" y="0" width="${w}" height="4.2" rx="1" fill="${BRASS}" stroke="${INK}" stroke-width="1"/>`;

  function bauble(fill, shade, decor) {
    const band = decor === "band"
      ? `<path d="M-11 12.5 Q0 17 11 12.5" fill="none" stroke="${INK}" stroke-width="3.6"/>
         <path d="M-11 12.5 Q0 17 11 12.5" fill="none" stroke="${BRASS}" stroke-width="2.2"/>`
      : decor === "dots"
        ? [-6, 0, 6].map((x, i) => `<circle cx="${x}" cy="${i === 1 ? 16.4 : 15.4}" r="1.5" fill="${BRASS_LIGHT}" stroke="${INK}" stroke-width=".6"/>`).join("")
        : "";
    return `${cap()}
      <circle cx="0" cy="15" r="11.2" fill="${fill}" stroke="${INK}" stroke-width="1.4"/>
      <path d="M6.5 6.5 A11 11 0 0 1 4 25.4 A10 10 0 0 0 6.5 6.5Z" fill="${shade}" opacity=".85"/>
      ${band}
      <ellipse cx="-4.2" cy="10.4" rx="2" ry="3.4" fill="#fff" opacity=".6" transform="rotate(30 -4.2 10.4)"/>`;
  }

  function star() {
    const p = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 5.2 : 12, a = -Math.PI / 2 + i * Math.PI / 5;
      p.push([r * Math.cos(a), 13 + r * Math.sin(a)]);
    }
    const pts = k => p.map(([x, y]) => f(x * k) + "," + f(13 + (y - 13) * k)).join(" ");
    return `<path d="M0 0 V1.8" stroke="${INK}" stroke-width="1"/>
      <polygon points="${pts(1)}" fill="${BRASS}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
      <polygon points="${pts(0.45)}" fill="${BRASS_LIGHT}" opacity=".7"/>`;
  }

  function bell() {
    return `${cap(5)}
      <path d="M-9 20 C-9 9 -6 4.2 0 4.2 C6 4.2 9 9 9 20 L11 23 L-11 23 Z" fill="${BRASS}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M4 7 C7 10 7.6 15 7.6 20" fill="none" stroke="#A8822F" stroke-width="2.2" opacity=".8"/>
      <circle cx="0" cy="25" r="2.6" fill="${BRASS_LIGHT}" stroke="${INK}" stroke-width="1"/>
      <path d="M-3.6 10 Q-5 14 -5 19" stroke="#fff" stroke-width="1.4" opacity=".55" fill="none" stroke-linecap="round"/>
      <path d="M0 5 C-6 0 -9 5 -3 6 M0 5 C6 0 9 5 3 6" fill="${CRAN}" stroke="${INK}" stroke-width="1"/>`;
  }

  function cup() {
    return `${cap(5)}
      <path d="M-10 6 H9 V15 C9 21 5 24 -0.5 24 C-6 24 -10 21 -10 15 Z" fill="#FFF7EA" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M9 9 C14.5 9 14.5 17 8.6 17" fill="none" stroke="${INK}" stroke-width="1.4"/>
      <ellipse cx="-0.5" cy="6.8" rx="8.6" ry="2" fill="#6E3512"/>
      <path d="M-10 14 H9" stroke="${CRAN}" stroke-width="2.4"/>
      <ellipse cx="-0.5" cy="25.6" rx="13" ry="2.4" fill="#FFF7EA" stroke="${INK}" stroke-width="1.2"/>`;
  }

  function bean() {
    return `${cap(5)}
      <ellipse cx="0" cy="15.5" rx="8.4" ry="11.4" fill="#6E3512" stroke="${INK}" stroke-width="1.4" transform="rotate(-14 0 15.5)"/>
      <path d="M-1.6 5.4 C4 10 -5 17 1.6 25.6" fill="none" stroke="#E4C08F" stroke-width="1.8" stroke-linecap="round"/>
      <ellipse cx="-4" cy="11" rx="1.4" ry="3" fill="#fff" opacity=".35" transform="rotate(-14 -4 11)"/>`;
  }

  function cone() {
    let scales = "";
    const rows = [[0, 2], [5.2, 3], [10.4, 3], [15.6, 3], [20.8, 2]];
    rows.forEach(([y, n], ri) => {
      const w = 6.6 - Math.abs(ri - 2) * 0.6;
      for (let k = 0; k < n; k++) {
        const x = (k - (n - 1) / 2) * w;
        scales += `<path d="M${f(x - w / 2)} ${f(4.6 + y)} Q${f(x)} ${f(4.6 + y + 7.2)} ${f(x + w / 2)} ${f(4.6 + y)}" fill="#9A5A28" stroke="${INK}" stroke-width="1"/>`;
      }
    });
    return `${cap(5)}<ellipse cx="0" cy="17" rx="10" ry="13.4" fill="#6B3A17" stroke="${INK}" stroke-width="1.4"/>${scales}`;
  }

  function finial(fill, shade) {
    return `${cap(5)}
      <path d="M0 4.2 C9 8 11 16 6 24 C4 28 1.5 31 0 36 C-1.5 31 -4 28 -6 24 C-11 16 -9 8 0 4.2Z" fill="${fill}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M3 7 C9 12 8.4 19 4.6 24.6" fill="none" stroke="${shade}" stroke-width="2.4" opacity=".8"/>
      <path d="M-8.2 13 H8.2 M-7.2 20 H7.2" stroke="${BRASS_LIGHT}" stroke-width="1.6"/>
      <path d="M-3.6 9 Q-5.4 13 -4.6 17" stroke="#fff" stroke-width="1.4" opacity=".55" fill="none" stroke-linecap="round"/>`;
  }

  function snowflake() {
    let arms = "";
    for (let i = 0; i < 6; i++) {
      arms += `<g transform="rotate(${i * 60} 0 14)"><path d="M0 14 V3.4 M0 7.4 L-3.2 4.6 M0 7.4 L3.2 4.6 M0 10.4 L-2.2 8.6 M0 10.4 L2.2 8.6"/></g>`;
    }
    return `<path d="M0 0 V3.4" stroke="${STRING}" stroke-width="1"/>
      <g stroke="${INK}" stroke-width="3.4" stroke-linecap="round" fill="none">${arms}</g>
      <g stroke="#7FA7C6" stroke-width="1.8" stroke-linecap="round" fill="none">${arms}</g>`;
  }

  const ORN = {
    cranberry: () => bauble(CRAN, CRAN_DARK, "band"),
    evergreen: () => bauble("#2F6A47", "#1F4A31", "dots"),
    copperBall: () => bauble(COPPER, "#A8561C", "band"),
    star, bell, cup, bean, cone, snowflake,
    finial: () => finial(CRAN, CRAN_DARK),
    copperDrop: () => finial(COPPER, "#A8561C")
  };
  const HEIGHT = { star: 26, bell: 28, cup: 28, bean: 28, cone: 31, snowflake: 25, finial: 36, copperDrop: 36 };
  const oh = k => HEIGHT[k] || 27;

  /* ---------- garland pieces ---------- */

  // one sprig: a short stem with tapered needles, longest at the base
  function sprig(path, x, y, a, len, r, scale = 1) {
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    path.stem += `M${f(x)} ${f(y)} L${f(ex)} ${f(ey)} `;
    const n = Math.round(len / 2.1);
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1), px = x + (ex - x) * t, py = y + (ey - y) * t;
      const nl = (1 - t * 0.6) * (5.4 + r() * 1.6) * scale;
      for (const side of [-1, 1]) {
        const na = a + side * (0.62 + r() * 0.2);
        path.needles += `M${f(px)} ${f(py)} L${f(px + Math.cos(na) * nl)} ${f(py + Math.sin(na) * nl)} `;
      }
    }
  }

  function bow(x, y, s = 1) {
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${s})">
      <path d="M-1.5 2 L-6.5 13 L-4 12 L-3 14.6 Z M1.5 2 L6 12.6 L3.6 11.8 L2.6 14.4 Z" fill="${CRAN}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>
      <path d="M0 1 C-5 -6 -12 -3 -10.5 2 C-9.5 5.4 -4 4 0 1 Z M0 1 C5 -6 12 -3 10.5 2 C9.5 5.4 4 4 0 1 Z" fill="${CRAN}" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M-2.4 0 C-5.6 -2.4 -8 -1 -8 1 M2.4 0 C5.6 -2.4 8 -1 8 1" fill="none" stroke="${CRAN_DARK}" stroke-width="1.2"/>
      <ellipse cx="0" cy="1.2" rx="2.6" ry="2.4" fill="${CRAN_DARK}" stroke="${INK}" stroke-width="1"/></g>`;
  }

  function berries(x, y, r, n = 3) {
    let s = "";
    const spots = [[-3, 1], [3, 1.6], [0, -2.4], [-5.4, -1.8], [5.2, -1.4]];
    for (let i = 0; i < n; i++) {
      const [dx, dy] = spots[i], cx = x + dx + (r() - 0.5) * 0.8, cy = y + dy + (r() - 0.5) * 0.8;
      s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="2.9" fill="${CRAN}" stroke="${INK}" stroke-width="1"/>
            <circle cx="${f(cx - 0.9)}" cy="${f(cy - 0.9)}" r=".8" fill="#fff" opacity=".75"/>`;
    }
    return s;
  }

  const layer = (p, col, w) => `<path d="${p.needles}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" fill="none"/>
    <path d="${p.stem}" stroke="${GREEN.stem}" stroke-width="1.1" stroke-linecap="round" fill="none"/>`;

  /* A garland along a chain of swags between anchor points.
     Returns { svg, swags } so ornaments can be hung from it. */
  function garland(anchors, sag, r, opts = {}) {
    const segs = [];
    for (let k = 0; k < anchors.length - 1; k++) {
      const A = anchors[k], B = anchors[k + 1];
      segs.push({ A, B, C: { x: (A.x + B.x) / 2, y: Math.max(A.y, B.y) + sag * 2 } });
    }
    const out = drawCurves(segs, r, opts);
    let bows = "";
    anchors.forEach(p => { bows += bow(p.x, p.y - 1, opts.bowScale || 1); });
    out.svg += bows;
    return out;
  }

  // the garland itself, along quadratic curves {A, C (control), B}
  function drawCurves(segs, r, opts = {}) {
    const back = { stem: "", needles: "" }, mid = { stem: "", needles: "" }, front = { stem: "", needles: "" };
    let ribbonBack = "", ribbonFront = "", deco = "";
    const swags = [];
    const thick = opts.thick || 1;
    segs.forEach(({ A, B, C }) => {
      const P = t => ({ x: (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * C.x + t * t * B.x,
                        y: (1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * C.y + t * t * B.y });
      const D = t => Math.atan2(2 * (1 - t) * (C.y - A.y) + 2 * t * (B.y - C.y), 2 * (1 - t) * (C.x - A.x) + 2 * t * (B.x - C.x));
      swags.push({ P, D });
      const len = Math.hypot(B.x - A.x, B.y - A.y) * 1.05;
      const steps = Math.round(len / 6);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, p = P(t), a = D(t);
        const taper = opts.taper ? 0.55 + 0.45 * Math.min(1, t * 3, (1 - t) * 3) : 1;   // thinner at loose ends
        sprig(back, p.x, p.y, a + (i % 2 ? -0.55 : 0.55) + (r() - 0.5) * 0.3, (15 + r() * 6) * thick * taper, r, thick);
        sprig(mid, p.x, p.y, a + (i % 2 ? 0.45 : -0.45) + (r() - 0.5) * 0.3, (12 + r() * 5) * thick * taper, r, thick);
        if (i % 2 === 0) sprig(front, p.x, p.y, a + (r() - 0.5) * 0.9, (8 + r() * 4) * thick * taper, r);
      }
      if (opts.ribbon) {
        const turns = Math.max(2, Math.round(len / 46));
        let seg = "", wasFront = null;
        const flush = isFront => { if (seg) { if (isFront) ribbonFront += seg; else ribbonBack += seg; } seg = ""; };
        for (let i = 0; i <= 120; i++) {
          const t = i / 120, p = P(t), a = D(t), ph = t * turns * Math.PI * 2;
          const off = Math.sin(ph) * 5.5 * thick, isFront = Math.cos(ph) > 0;
          const x = p.x - Math.sin(a) * off, y = p.y + Math.cos(a) * off;
          if (isFront !== wasFront) { flush(wasFront); seg = `M${f(x)} ${f(y)} `; wasFront = isFront; }
          else seg += `L${f(x)} ${f(y)} `;
        }
        flush(wasFront);
      }
      if (opts.berries !== false) [0.3, 0.7].forEach(t => { const p = P(t + (r() - 0.5) * 0.08); deco += berries(p.x, p.y + 1.5, r, 3 + (r() > 0.5 ? 1 : 0)); });
    });
    const ribbon = (d, col) => d ? `<path d="${d}" stroke="${INK}" stroke-width="4.6" stroke-linecap="round" fill="none"/>
      <path d="${d}" stroke="${col}" stroke-width="3" stroke-linecap="round" fill="none"/>` : "";
    const svg = layer(back, GREEN.back, 1.7 * Math.sqrt(thick)) + ribbon(ribbonBack, CRAN_DARK) + layer(mid, GREEN.mid, 1.5 * Math.sqrt(thick))
      + ribbon(ribbonFront, CRAN) + layer(front, GREEN.front, 1.3) + deco;
    return { svg, swags };
  }

  // a holly leaf, its base at (0,0), pointing along the angle a (degrees)
  function holly(x, y, a, s = 1) {
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)}) scale(${s})">
      <path d="M0 0 Q4 -6 8 -9.5 Q12 -5 17 -11.5 Q21 -5.5 26.5 -9.5 Q30.5 -4.5 37 0 Q30.5 4.5 26.5 9.5
               Q21 5.5 17 11.5 Q12 5 8 9.5 Q4 6 0 0Z"
            fill="#2F6A47" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M1 0 Q18 -1 34 0" fill="none" stroke="#7FB089" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M9 -0.6 L12 -5 M17.5 -0.6 L20.5 -6 M26 -0.4 L28.5 -4.6 M9 0.6 L12 5 M17.5 0.6 L20.5 6 M26 0.4 L28.5 4.6" stroke="#1F4A31" stroke-width=".9" stroke-linecap="round"/></g>`;
  }

  // a pine cone lying in the arrangement: overlapping rounded scales, base at (0,0), tip along a
  function pineCone(x, y, a, s = 1) {
    let scales = "";
    const rows = 7;
    for (let row = rows - 1; row >= 0; row--) {
      const t = row / (rows - 1);                       // 0 at the base, 1 at the tip
      const along = 4 + t * 30, half = 9.5 * Math.sin(Math.PI * (0.18 + 0.72 * (1 - t))) + 1.5;
      const n = row % 2 ? 3 : 4;
      for (let k = 0; k < n; k++) {
        const across = (k - (n - 1) / 2) * (half * 2 / n);
        const w = half * 2 / n + 1.6;
        scales += `<path d="M${f(along - 3)} ${f(across - w / 2)} Q${f(along + 6)} ${f(across)} ${f(along - 3)} ${f(across + w / 2)} Z"
          fill="${row % 2 ? "#8A4E22" : "#A0612E"}" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/>
          <path d="M${f(along + 1.4)} ${f(across - w / 4)} Q${f(along + 3.6)} ${f(across)} ${f(along + 1.4)} ${f(across + w / 4)}" fill="none" stroke="#D9A36A" stroke-width=".8" opacity=".7"/>`;
      }
    }
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)}) scale(${s})">
      <path d="M-4 0 L3 0" stroke="#5A3A1E" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="18" cy="0" rx="18" ry="10.6" fill="#6B3A17" stroke="${INK}" stroke-width="1.3"/>
      ${scales}</g>`;
  }

  // a bow with long ribbon tails flowing down (for the corner arrangement)
  function grandBow(x, y, s = 1) {
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${s})">
      <path d="M-2 3 C-6 14 -3 22 -9 34 L-5 33 L-4 37 C1 25 -1 15 2 4 Z" fill="${CRAN}" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M2 3 C8 12 6 24 13 31 L9 31.5 L9.6 35.4 C3 28 4 15 -1 4 Z" fill="${CRAN_DARK}" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M0 1 C-7 -9 -17 -5 -15 2 C-13.6 7 -6 6 0 1 Z M0 1 C7 -9 17 -5 15 2 C13.6 7 6 6 0 1 Z" fill="${CRAN}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M-3 -0.5 C-8 -4 -12 -2 -12 1.5 M3 -0.5 C8 -4 12 -2 12 1.5" fill="none" stroke="${CRAN_DARK}" stroke-width="1.4"/>
      <ellipse cx="0" cy="1.4" rx="3.6" ry="3.2" fill="${CRAN_DARK}" stroke="${INK}" stroke-width="1.1"/></g>`;
  }

  /* ---------- hanging ornaments (damped pendulums) ---------- */

  const swingers = [];

  function hang(x, y, kind, length, tilt) {
    const h = oh(kind);
    const i = swingers.length;
    swingers.push({ th: calm ? 0 : tilt, w: 0, L: length + h * 0.6, el: null });
    return `<g transform="translate(${f(x)} ${f(y)})"><g class="orn" data-i="${i}">
      <path d="M0 0 V${f(length)}" stroke="${STRING}" stroke-width="1.1"/>
      <g transform="translate(0 ${f(length)})">${ORN[kind]()}</g>
      <rect class="orn-hit" x="-15" y="${f(length - 2)}" width="30" height="${f(h + 6)}" fill="transparent"/>
    </g></g>`;
  }

  // theta'' = -(g / L) sin(theta) - c theta'
  let running = false, last = 0;
  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
    last = now;
    let moving = false;
    for (const s of swingers) {
      if (!s.el || !s.el.isConnected) continue;
      const acc = -(2600 / s.L) * Math.sin(s.th) - 2.4 * s.w;
      s.w += acc * dt;
      s.th += s.w * dt;
      if (Math.abs(s.th) > 0.002 || Math.abs(s.w) > 0.01) moving = true;
      else { s.th = 0; s.w = 0; }
      s.el.setAttribute("transform", `rotate(${(s.th * 180 / Math.PI).toFixed(2)})`);
    }
    if (moving) requestAnimationFrame(tick); else running = false;
  }
  function kick() {
    if (calm || running) return;
    running = true; last = performance.now();
    requestAnimationFrame(tick);
  }

  function wire(svg) {
    svg.querySelectorAll(".orn").forEach(g => {
      const s = swingers[+g.dataset.i];
      s.el = g;
      g.setAttribute("transform", `rotate(${(s.th * 180 / Math.PI).toFixed(2)})`);
      g.querySelector(".orn-hit").addEventListener("pointerenter", e => {
        const dir = e.movementX ? Math.sign(e.movementX) : (Math.random() > 0.5 ? 1 : -1);
        s.w += dir * (2.2 + Math.random());
        kick();
      });
    });
    kick();
  }

  function svgEl(cls) {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("class", "garland-svg " + cls);
    s.setAttribute("aria-hidden", "true");
    return s;
  }

  /* ---------- 1. the featured garland: the next-seminar card ---------- */

  function featured(card) {
    const W = card.clientWidth;
    if (!W) return;
    const r = rng(4242);
    const inset = 18, top = 6;
    const n = Math.max(2, Math.round((W - inset * 2) / 300));
    const anchors = Array.from({ length: n + 1 }, (_, k) => ({ x: inset + k * (W - inset * 2) / n, y: top }));
    const sag = Math.min(22, (W - inset * 2) / n * 0.1);
    const g = garland(anchors, sag, r, { ribbon: true, bowScale: 1.15 });
    // a curated arrangement: one main ornament at each low point, a shorter companion beside some
    const plan = ["cranberry", "star", "copperDrop", "evergreen", "cup", "bell", "finial", "bean", "copperBall", "snowflake"];
    let hangs = "", pi = 0;
    g.swags.forEach((sw, k) => {
      const p = sw.P(0.5);
      hangs += hang(p.x, p.y + 3, plan[pi++ % plan.length], 16 + (k % 2) * 12, k % 2 ? 0.12 : -0.12);
      if (W > 520) {
        const q = sw.P(k % 2 ? 0.28 : 0.72);
        hangs += hang(q.x, q.y + 3, plan[pi++ % plan.length], 6 + (k % 3) * 3, k % 2 ? -0.1 : 0.1);
      }
    });
    let svg = card.querySelector(":scope > .garland-featured");
    if (!svg) { svg = svgEl("garland-featured"); card.prepend(svg); }
    const H = top + sag + 80;
    svg.setAttribute("width", W); svg.setAttribute("height", H); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = hangs + g.svg;
    card.classList.add("has-featured-garland");
    card.dataset.garlandW = W;
    wire(svg);
  }

  /* ---------- 2. the team page: one garland across each row of cards ---------- */

  const PEOPLE = ["cup", "star", "cranberry", "copperDrop", "bell", "finial", "evergreen", "bean"];

  function teamRows(grid) {
    const cards = [...grid.querySelectorAll(":scope > .barista")];
    if (!cards.length) return;
    const gr = grid.getBoundingClientRect();
    const rows = [];
    cards.forEach((c, i) => {
      const b = c.getBoundingClientRect();
      const box = { x: b.left - gr.left, y: b.top - gr.top, w: b.width, i };
      const row = rows.find(rw => Math.abs(rw.y - box.y) < 4);
      if (row) row.cards.push(box); else rows.push({ y: box.y, cards: [box] });
    });
    const r = rng(777);
    let out = "";
    rows.forEach(row => {
      const cs = row.cards.sort((a, b) => a.x - b.x);
      const anchors = [{ x: cs[0].x + 14, y: row.y + 4 }];
      cs.forEach((c, k) => {
        const next = cs[k + 1];
        anchors.push(next ? { x: (c.x + c.w + next.x) / 2, y: row.y + 1 } : { x: c.x + c.w - 14, y: row.y + 4 });
      });
      const g = garland(anchors, 17, r, { ribbon: true });
      let hangs = "";
      g.swags.forEach((sw, k) => {
        // each person's own ornament hangs beside their portrait, alternating sides
        const idx = cs[k].i, p = sw.P(idx % 2 ? 0.8 : 0.2);
        hangs += hang(p.x, p.y + 3, PEOPLE[idx % PEOPLE.length], 14 + (idx % 3) * 5, idx % 2 ? -0.14 : 0.14);
      });
      out += hangs + g.svg;
    });
    let svg = grid.querySelector(":scope > .garland-rows");
    if (!svg) { svg = svgEl("garland-rows"); grid.appendChild(svg); }
    svg.setAttribute("width", gr.width); svg.setAttribute("height", gr.height);
    svg.setAttribute("viewBox", `0 0 ${gr.width} ${gr.height}`);
    svg.innerHTML = out;
    grid.dataset.garlandW = gr.width;
    wire(svg);
  }

  /* ---------- 3. a single sprig on the corner of the "Give a talk" panel ---------- */

  /* A corner swag: a garland along the top edge and down the side, meeting at the corner
     in a cluster of holly, pine cones and berries, tied with a bow whose tails flow down. */
  function cornerSprig(card) {
    const r = rng(31);
    const W = 300, H = 230, cx = 262, cy = 26;          // cx, cy: the card's corner inside the drawing
    const top = { A: { x: 18, y: 30 }, C: { x: 150, y: 46 }, B: { x: cx - 4, y: cy } };
    const side = { A: { x: cx, y: cy + 4 }, C: { x: cx - 14, y: 120 }, B: { x: cx - 2, y: 212 } };
    const g = drawCurves([top, side], r, { ribbon: true, taper: true, thick: 1.15, berries: false });
    let cluster = "";
    // holly leaves fanning out from the corner, under the cones and the bow
    [[-160, 1.1], [-120, 1], [-205, 0.95], [110, 1], [150, 1.05], [-15, 0.9], [55, 0.85]]
      .forEach(([ang, sc]) => { cluster += holly(cx - 2, cy + 4, ang, sc); });
    cluster += pineCone(cx - 18, cy + 18, 148, 0.9) + pineCone(cx - 4, cy + 22, 112, 0.8);
    cluster += berries(cx - 30, cy + 2, r, 5) + berries(cx + 8, cy + 30, r, 4) + berries(cx - 6, cy - 6, r, 3);
    // berry clusters along the two arms
    [[0.35, top], [0.7, top]].forEach(([t]) => {
      const p = g.swags[0].P(t); cluster += berries(p.x, p.y + 1.5, r, 3);
    });
    [[0.45], [0.8]].forEach(([t]) => { const p = g.swags[1].P(t); cluster += berries(p.x - 1, p.y, r, 3); });
    const p = g.swags[0].P(0.42);
    const svg = svgEl("garland-corner");
    svg.setAttribute("width", W); svg.setAttribute("height", H); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = hang(p.x, p.y + 4, "cranberry", 18, 0.12) + g.svg + cluster + grandBow(cx - 2, cy - 2, 1.35);
    card.prepend(svg);
    card.classList.add("has-corner-sprig");
    wire(svg);
  }

  /* ---------- placing them, and keeping them in place ---------- */

  const ro = new ResizeObserver(entries => entries.forEach(e => {
    const el = e.target, grid = el.classList.contains("barista-grid");
    const w = grid ? el.getBoundingClientRect().width : el.clientWidth;
    if (+el.dataset.garlandW === w) return;
    if (grid) teamRows(el); else featured(el);
  }));

  function scan() {
    const next = document.querySelector('.event.deck-slide[data-kind="Next seminar"]');
    if (next && !next.querySelector(":scope > .garland-featured")) {
      featured(next);
      if (!next.dataset.garlandObserved) { next.dataset.garlandObserved = "1"; ro.observe(next); }
    }
    const grid = document.getElementById("barista-grid");
    if (grid && grid.querySelector(".barista") && !grid.querySelector(":scope > .garland-rows")) {
      teamRows(grid);
      if (!grid.dataset.garlandObserved) {
        grid.dataset.garlandObserved = "1";
        ro.observe(grid);
        // portraits arriving can change the heights, and so the rows' positions
        grid.addEventListener("load", () => teamRows(grid), true);
      }
    }
    const talk = document.querySelector(".talk-panel");
    if (talk && !talk.querySelector(":scope > .garland-corner")) cornerSprig(talk);
  }

  function start() {
    scan();
    new MutationObserver(muts => {
      if (muts.every(m => m.target.closest && m.target.closest(".garland-svg"))) return;   // our own drawing
      scan();
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
