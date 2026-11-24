/* Christmas garlands (part of js/season.js's "garland" decoration).

   Every card gets an evergreen garland draped along its top edge, drawn in the site's own
   illustration style (brown ink line work, flat colour), with a different mix of hanging
   ornaments on each card. Drawn to the card's real width, so nothing is ever stretched. */
(function () {
  if (!(window.DynamicsCafeSeason && window.DynamicsCafeSeason.has("garland"))) return;

  const NS = "http://www.w3.org/2000/svg";
  const INK = "#4A1D0B";
  const STRING = "#9A6B3F";
  const NEEDLES = ["#2E6638", "#3B7A45", "#4C8C50", "#5E9C5A"];
  const CARDS = ".barista, .talk-panel, .event, .policy-toc, .counter-card";

  // small, deterministic random numbers: the same card always gets the same garland
  function rng(seed) {
    let s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return () => (s = s * 16807 % 2147483647) / 2147483647;
  }

  /* ---------- ornaments (drawn around 0,0 = where the string ends) ---------- */

  const O = {
    bauble(color, band) {
      return `<rect x="-2.6" y="-1" width="5.2" height="4" rx="1" fill="#C9A13B" stroke="${INK}" stroke-width=".8"/>
        <circle cx="0" cy="10" r="7.5" fill="${color}" stroke="${INK}" stroke-width="1.1"/>
        ${band ? `<path d="M-7.2 9 Q0 12.5 7.2 9" fill="none" stroke="${band}" stroke-width="1.6"/>
                  <path d="M-6.6 13 Q0 16 6.6 13" fill="none" stroke="${band}" stroke-width=".9" stroke-dasharray="1.2 1.6"/>` : ""}
        <ellipse cx="-2.6" cy="7" rx="1.6" ry="2.4" fill="#fff" opacity=".55" transform="rotate(25 -2.6 7)"/>`;
    },
    star() {
      const p = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 3.6 : 8.4, a = -Math.PI / 2 + i * Math.PI / 5;
        p.push((r * Math.cos(a)).toFixed(2) + "," + (9 + r * Math.sin(a)).toFixed(2));
      }
      return `<polygon points="${p.join(" ")}" fill="#E8B43A" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
        <circle cx="-1.6" cy="7" r="1.1" fill="#fff" opacity=".7"/>`;
    },
    snowflake() {
      let arms = "";
      for (let i = 0; i < 6; i++) {
        const a = i * 60;
        arms += `<g transform="rotate(${a} 0 10)"><line x1="0" y1="10" x2="0" y2="1.5"/><line x1="0" y1="4.6" x2="-2.4" y2="2.6"/><line x1="0" y1="4.6" x2="2.4" y2="2.6"/></g>`;
      }
      return `<g stroke="#4F7FA8" stroke-width="1.3" stroke-linecap="round">${arms}</g><circle cx="0" cy="10" r="1.4" fill="#4F7FA8"/>`;
    },
    bell() {
      return `<path d="M-6.5 14 C-6.5 6 -4.5 2.5 0 2.5 C4.5 2.5 6.5 6 6.5 14 L8 16 L-8 16 Z" fill="#E1A83A" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
        <circle cx="0" cy="17.5" r="1.8" fill="#C9A13B" stroke="${INK}" stroke-width=".8"/>
        <path d="M-1 2.5 C-5 -1.5 -7 2 -3.5 3.2 M1 2.5 C5 -1.5 7 2 3.5 3.2" fill="#C8312B" stroke="${INK}" stroke-width=".8"/>
        <path d="M-3.5 7 Q-4.2 10 -4.2 13" stroke="#fff" stroke-width="1" opacity=".6" fill="none"/>`;
    },
    cup() {
      return `<path d="M-7 4 H6 V11 C6 15 3.5 17 -0.5 17 C-4.5 17 -7 15 -7 11 Z" fill="#FFF8EC" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
        <path d="M6 6.5 C10 6.5 10 12 5.6 12" fill="none" stroke="${INK}" stroke-width="1.1"/>
        <ellipse cx="-0.5" cy="4.6" rx="6" ry="1.4" fill="#7A3E16"/>
        <path d="M-7 10 H6" stroke="#C8312B" stroke-width="1.4"/>
        <path d="M-2.5 1.5 C-4 -0.5 -1 -1.5 -2.5 -3.5 M1.5 1.5 C0 -0.5 3 -1.5 1.5 -3.5" stroke="${STRING}" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".8"/>`;
    },
    bean() {
      return `<ellipse cx="0" cy="10" rx="6" ry="8.2" fill="#7A3E16" stroke="${INK}" stroke-width="1.1" transform="rotate(-18 0 10)"/>
        <path d="M-1.2 3 C2.8 6.5 -3.6 12.5 1.2 17" fill="none" stroke="#E9C79A" stroke-width="1.3" stroke-linecap="round"/>`;
    },
    cone() {
      let s = "";
      for (let row = 0; row < 4; row++) {
        const y = 4 + row * 3.6, n = row === 0 ? 2 : 3 - (row === 3 ? 1 : 0), w = 6.4 - row * 0.9;
        for (let k = 0; k < n; k++) {
          const x = (k - (n - 1) / 2) * w * 0.75;
          s += `<path d="M${(x - w / 2).toFixed(1)} ${y} Q${x.toFixed(1)} ${(y + 5.2).toFixed(1)} ${(x + w / 2).toFixed(1)} ${y}" fill="#A8672F" stroke="${INK}" stroke-width=".9"/>`;
        }
      }
      return `<path d="M-1.2 0 L1.2 0 L1.2 4 L-1.2 4 Z" fill="#6B3A17"/>${s}`;
    }
  };

  // what hangs where: each card starts at a different point of the list, so neighbours differ
  const SET = [
    () => O.bauble("#C8312B", "#F2D28B"),
    () => O.star(),
    () => O.cup(),
    () => O.bauble("#2F7A48", "#F2D28B"),
    () => O.snowflake(),
    () => O.bell(),
    () => O.bean(),
    () => O.bauble("#3D74B4", null),
    () => O.cone(),
    () => O.bauble("#D6A33A", "#C8312B")
  ];

  /* ---------- the garland ---------- */

  function bow(x, y) {
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
      <path d="M0 0 C-9 -7 -12 2 -2 1.5 M0 0 C9 -7 12 2 2 1.5" fill="#C8312B" stroke="${INK}" stroke-width="1"/>
      <path d="M-1 1 L-5 10 M1 1 L5 9" stroke="#C8312B" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M-1 1 L-5 10 M1 1 L5 9" stroke="${INK}" stroke-width=".6" fill="none" opacity=".6"/>
      <circle cx="0" cy=".6" r="2.2" fill="#A82420" stroke="${INK}" stroke-width=".8"/></g>`;
  }

  function berries(x, y, r) {
    let s = "";
    [[-2.6, 0.6], [2.4, 1.2], [0, -1.8]].forEach(([dx, dy]) => {
      const cx = x + dx + (r() - 0.5), cy = y + dy + (r() - 0.5);
      s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.5" fill="#C8312B" stroke="${INK}" stroke-width=".7"/>
            <circle cx="${(cx - 0.8).toFixed(1)}" cy="${(cy - 0.8).toFixed(1)}" r=".7" fill="#fff" opacity=".7"/>`;
    });
    return s;
  }

  function draw(card, index) {
    const W = card.clientWidth;
    if (!W) return;
    const r = rng(9973 * (index + 1));
    const inset = 16, top = 3;
    const span = W - inset * 2;
    const swags = Math.max(2, Math.round(span / 230));
    const sw = span / swags;
    const sag = Math.min(24, sw * 0.13);
    let needles = "", branch = "", deco = "", hang = "";
    const start = (index * 3) % SET.length;
    let oi = 0;

    for (let k = 0; k < swags; k++) {
      const x0 = inset + k * sw, x1 = x0 + sw;
      const cx = (x0 + x1) / 2, cy = top + sag * 2;           // quadratic control point
      const P = t => [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1,
                      (1 - t) * (1 - t) * top + 2 * (1 - t) * t * cy + t * t * top];
      const D = t => [2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx), 2 * (1 - t) * (cy - top) + 2 * t * (top - cy)];
      branch += `M${x0.toFixed(1)} ${top} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${top} `;
      const steps = Math.round(sw / 3.2);
      // a darker, fuller underlayer first, then lighter needles on top
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i <= steps; i++) {
          const t = i / steps, [x, y] = P(t), [dx, dy] = D(t);
          const a = Math.atan2(dy, dx);
          for (const side of [-1, 1]) {
            const ang = a + side * (0.95 + r() * 0.35) + (pass ? 0.15 : -0.1);
            const len = (pass ? 7 : 10.5) + r() * 3.5;
            const col = NEEDLES[(pass ? 2 : 0) + Math.floor(r() * 2)];
            needles += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + Math.cos(ang) * len).toFixed(1)}" y2="${(y + Math.sin(ang) * len).toFixed(1)}" stroke="${col}"/>`;
          }
        }
      }
      // ornaments: one at the low point, sometimes a second, shorter one beside it
      const picks = [[0.5, 10 + r() * 16]];
      if (sw > 150 && r() > 0.35) picks.push([r() > 0.5 ? 0.27 : 0.73, 4 + r() * 8]);
      for (const [t, len] of picks) {
        const [x, y] = P(t);
        const o = SET[(start + oi++) % SET.length]();
        hang += `<line x1="${x.toFixed(1)}" y1="${(y + 2).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + len).toFixed(1)}" stroke="${STRING}" stroke-width=".9"/>
                 <g transform="translate(${x.toFixed(1)} ${(y + len).toFixed(1)}) rotate(${((r() - 0.5) * 10).toFixed(1)}) scale(1.4)">${o}</g>`;
      }
      // berries along the swag
      const bt = 0.22 + r() * 0.2, [bx, by] = P(bt), [ex, ey] = P(1 - bt);
      deco += berries(bx, by + 2, r) + berries(ex, ey + 2, r);
    }
    // a bow where the garland is pinned: both ends and between the swags
    for (let k = 0; k <= swags; k++) deco += bow(inset + k * sw, top + 1);

    const H = top + sag + 80;
    let svg = card.querySelector(":scope > .garland-svg");
    if (!svg) {
      svg = document.createElementNS(NS, "svg");
      svg.setAttribute("class", "garland-svg");
      svg.setAttribute("aria-hidden", "true");
      card.prepend(svg);
    }
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = `${hang}
      <path d="${branch}" fill="none" stroke="#5A3A1E" stroke-width="1.6"/>
      <g stroke-width="1.5" stroke-linecap="round">${needles}</g>
      ${deco}`;
    card.dataset.garlandWidth = W;
  }

  const ro = new ResizeObserver(entries => entries.forEach(e => {
    const card = e.target;
    if (+card.dataset.garlandWidth !== card.clientWidth) draw(card, +card.dataset.garlandIndex);
  }));

  function scan() {
    document.querySelectorAll(CARDS).forEach((card, i) => {
      if (card.dataset.garlandIndex) {
        // the card's content was replaced (e.g. a seminar card filled in later): draw again
        if (!card.querySelector(":scope > .garland-svg")) draw(card, +card.dataset.garlandIndex);
        return;
      }
      card.dataset.garlandIndex = i;
      card.classList.add("has-garland");
      draw(card, i);
      ro.observe(card);
    });
  }

  function start() {
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
