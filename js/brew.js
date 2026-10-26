/*
  "Brewing..." doodle: coffee from around the world, one method at a time.
  Each scene brews until its cup is full, then slides out to the left inside the
  circle while the next one slides in from the right, forever.
  Drawn as SVG line art in a 120 x 120 box; the circle shows -28..148 of it.

  Pots and cups keep track of how much coffee they hold (the area of liquid in the
  drawing), so a pot loses exactly what lands in the cup, its level is always where
  that amount would sit in the tilted pot, and it tips just far enough to pour.
*/
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const SIZE = 176;           // viewBox width: how far a scene travels when it slides
  const SLIDE = 0.9;          // seconds per slide
  let uid = 0;

  const make = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const P = (d, cls, parent) => make("path", { d, class: cls }, parent);
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const ramp = (t, a, b) => clamp01((t - a) / (b - a));
  const ease = x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const lerp = (a, b, f) => a + (b - a) * f;
  const show = (node, on) => { node.style.opacity = on ? 1 : 0; };
  const f1 = v => v.toFixed(1);

  // same convention as SVG rotate(deg, cx, cy)
  const rot = (x, y, cx, cy, deg) => {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
  };

  const clipGroup = (g, shapes) => {
    const id = "brew-clip-" + (++uid);
    const cp = make("clipPath", { id }, make("defs", {}, g));
    [].concat(shapes).forEach(d => P(d, "", cp));
    return make("g", { "clip-path": `url(#${id})` }, g);
  };

  // ---- a little geometry ----

  // outline -> polygon (absolute M, L, H, V, Q and Z, which is all these drawings use)
  function polygon(d) {
    const tok = d.match(/[MLHVQZ]|-?\d*\.?\d+/g);
    const pts = [];
    let i = 0, x = 0, y = 0, cmd = "M";
    const num = () => parseFloat(tok[i++]);
    while (i < tok.length) {
      if (/[A-Z]/.test(tok[i])) cmd = tok[i++];
      if (cmd === "M" || cmd === "L") { x = num(); y = num(); pts.push([x, y]); }
      else if (cmd === "H") { x = num(); pts.push([x, y]); }
      else if (cmd === "V") { y = num(); pts.push([x, y]); }
      else if (cmd === "Q") {
        const cx = num(), cy = num(), ex = num(), ey = num();
        for (let k = 1; k <= 8; k++) {
          const u = k / 8;
          pts.push([(1 - u) * (1 - u) * x + 2 * (1 - u) * u * cx + u * u * ex,
                    (1 - u) * (1 - u) * y + 2 * (1 - u) * u * cy + u * u * ey]);
        }
        x = ex; y = ey;
      } else break;   // Z
    }
    return pts;
  }
  const toPath = pts => "M" + pts.map(p => p.map(f1).join(" ")).join(" L") + " Z";

  // area of the polygon below the horizontal line y = level (y grows downwards)
  function areaBelow(pts, level) {
    const out = [];
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k], q = pts[(k + 1) % pts.length];
      const pin = p[1] >= level, qin = q[1] >= level;
      if (pin) out.push(p);
      if (pin !== qin) { const u = (level - p[1]) / (q[1] - p[1]); out.push([p[0] + u * (q[0] - p[0]), level]); }
    }
    let A = 0;
    for (let k = 0; k < out.length; k++) { const p = out[k], q = out[(k + 1) % out.length]; A += p[0] * q[1] - q[0] * p[1]; }
    return Math.abs(A) / 2;
  }

  // the level at which the polygon holds `amount`
  function levelFor(pts, amount) {
    let lo = Infinity, hi = -Infinity;
    pts.forEach(p => { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); });
    if (amount <= 0) return hi + 1;
    for (let k = 0; k < 22; k++) {
      const mid = (lo + hi) / 2;
      if (areaBelow(pts, mid) > amount) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // ---- vessels ----

  // A cup (or glass, or carafe) that fills from yBottom up to yTop. `under`: a layer below the
  // coffee (condensed milk); `foam`: a thin foam band riding on the surface.
  function vessel(g, outline, yTop, yBottom, opts = {}) {
    const inner = clipGroup(g, opts.clip || outline);
    const pts = polygon(opts.clip || outline);
    let base = yBottom;
    if (opts.under) {
      make("rect", { class: "milk", x: -20, width: 160, y: opts.under, height: yBottom - opts.under + 2 }, inner);
      base = opts.under;
    }
    const coffee = make("rect", { class: "coffee", x: -20, width: 160, y: base, height: 0 }, inner);
    const foam = opts.foam ? make("rect", { class: "foam-fill", x: -20, width: 160, y: base, height: 0 }, inner) : null;
    if (!opts.noOutline) P(outline, "line", g);
    const amountAt = y => Math.max(0, areaBelow(pts, y) - areaBelow(pts, base));
    const setY = y => {
      coffee.setAttribute("y", f1(y));
      coffee.setAttribute("height", f1(Math.max(0, base - y + (opts.under ? 0 : 2))));
      if (foam) {
        foam.setAttribute("y", f1(y));
        foam.setAttribute("height", f1(Math.max(0, Math.min(opts.foam, base - y))));
      }
      return y;
    };
    return {
      full: amountAt(yTop),
      amountAt,
      level: f => setY(base - f * (base - yTop)),
      fillTo(amount) {
        let lo = yTop - 6, hi = base;
        for (let k = 0; k < 22; k++) { const mid = (lo + hi) / 2; if (amountAt(mid) > amount) lo = mid; else hi = mid; }
        return setY(amount <= 0 ? base : (lo + hi) / 2);
      }
    };
  }

  // A pot with coffee inside that turns about (px, py) and slides by (tx, ty)·e.
  // `lip`: the point the coffee must reach to pour; `spout`: where the stream leaves.
  function pot(group, interior, { px, py, tx = 0, ty = 0, lip, spout, foam = 0 }) {
    const pts = polygon(interior);
    const inner = clipGroup(group, toPath(pts));
    const levelG = make("g", {}, inner);       // turned back, so the surface stays level
    const coffee = make("rect", { class: "coffee", x: -80, width: 280, y: 300, height: 300 }, levelG);
    const foamR = foam ? make("rect", { class: "foam-fill", x: -80, width: 280, y: 300, height: foam }, levelG) : null;
    const surfaceAt = (amount, a) => levelFor(pts.map(p => rot(p[0], p[1], px, py, a)), amount);
    const lipY = a => rot(lip[0], lip[1], px, py, a)[1];
    // the smallest tilt (towards negative angles) that brings `amount` up to the lip
    const tiltFor = (amount, max = -120) => {
      let lo = 0, hi = max;
      if (surfaceAt(amount, 0) <= lipY(0)) return 0;
      for (let k = 0; k < 18; k++) {
        const mid = (lo + hi) / 2;
        if (surfaceAt(amount, mid) > lipY(mid)) lo = mid; else hi = mid;
      }
      return hi;
    };
    return {
      capacity: areaBelow(pts, -1e3),
      tiltFor,
      set(a, amount, e, foamH = foam) {
        group.setAttribute("transform", `translate(${f1(tx * e)} ${f1(ty * e)}) rotate(${f1(a)} ${px} ${py})`);
        levelG.setAttribute("transform", `rotate(${f1(-a)} ${px} ${py})`);
        const y = surfaceAt(amount, a);
        coffee.setAttribute("y", f1(y));
        if (foamR) {
          foamR.setAttribute("y", f1(y - foamH));
          foamR.setAttribute("height", f1(Math.max(0, foamH)));
          foamR.style.opacity = amount > 1 ? 1 : 0;
        }
        const [sx, sy] = rot(spout[0], spout[1], px, py, a);
        return [sx + tx * e, sy + ty * e];
      }
    };
  }

  // Lift (l0..l1) and tilt until the coffee reaches the lip; pour until p1, tipping further
  // as the pot empties; set it down by b1. The pot loses exactly what the cup gains.
  function pourRun(p, cup, start, { l0, l1, p1, b1 }) {
    const a0 = p.tiltFor(start);
    const a1 = p.tiltFor(start - cup.full);
    return (t, foamH) => {
      const e = ease(ramp(t, l0, l1)) * (1 - ease(ramp(t, p1, b1)));
      const y = cup.level(ease(ramp(t, l1, p1)));
      const left = start - cup.amountAt(y);
      let a;
      if (t < l1) a = a0 * ease(ramp(t, l0, l1));
      else if (t < p1) a = p.tiltFor(left);
      else a = a1 * (1 - ease(ramp(t, p1, b1)));
      const tip = p.set(a, left, e, foamH);
      return { tip, cupY: y, pouring: t >= l1 && t < p1 };
    };
  }

  // A falling stream: it leaves the spout and curves down under gravity (sideways distance
  // grows like the square root of the drop), drawn as a ribbon that thins as it falls,
  // with a faint highlight running down it.
  function stream(g, cls = "liquid") {
    const body = P("", cls, g);
    const shine = P("", "shine", g);
    return (x0, y0, x1, y1, w0 = 2.4, w1 = 1.5, on = true) => {
      if (!on || y1 - y0 < 1) { show(body, false); show(shine, false); return; }
      const pts = [];
      for (let k = 0; k <= 14; k++) {
        const s = k / 14;
        pts.push([x0 + (x1 - x0) * (0.7 * Math.sqrt(s) + 0.3 * s), y0 + (y1 - y0) * s]);
      }
      const left = [], right = [];
      pts.forEach((p, k) => {
        const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1];
        const n = Math.hypot(tx, ty) || 1;
        tx /= n; ty /= n;
        const w = lerp(w0, w1, k / 14) / 2;
        left.push([p[0] - ty * w, p[1] + tx * w]);
        right.push([p[0] + ty * w, p[1] - tx * w]);
      });
      body.setAttribute("d", "M" + left.map(p => p.map(f1).join(" ")).join(" L") +
        " L" + right.reverse().map(p => p.map(f1).join(" ")).join(" L") + " Z");
      shine.setAttribute("d", "M" + pts.map(p => p.map(f1).join(" ")).join(" L"));
      show(body, true); show(shine, true);
    };
  }

  // Three drops falling from (x, y0) to the surface y1.
  function drops(g, x) {
    const ds = [0, 1, 2].map(() => P("M0 -3.4 q-2.6 3.8 0 5.8 q2.6 -2 0 -5.8 z", "drop", g));
    return (t, on, y0, y1) => ds.forEach((d, k) => {
      const ph = (t * 1.6 + k / 3) % 1;
      d.setAttribute("transform", `translate(${x} ${f1(y0 + ph * (y1 - y0))})`);
      d.style.opacity = on && y1 - y0 > 3 ? Math.min(1, ph * 6, (1 - ph) * 6) : 0;
    });
  }

  // Little gas flames under a pot.
  function flames(g, xs, y) {
    const fs = xs.map(x => P(`M${x} ${y} q-3 -4 0 -7.5 q3 3.5 0 7.5 z`, "flame", g));
    return (t, on) => fs.forEach((f, k) => {
      const s = 0.8 + 0.22 * Math.sin(t * 13 + k * 2.1);
      f.setAttribute("transform", `translate(${xs[k]} ${y}) scale(1 ${f1(s)}) translate(${-xs[k]} ${-y})`);
      f.style.opacity = on;
    });
  }

  // jebena inside: spout, neck and round body as one outline
  const JEBENA = (() => {
    const pts = [[63, 69.5], [74.5, 78], [78, 76.2], [81, 50], [87, 50], [90, 76.2]];
    const a0 = Math.atan2(76.2 - 89, 90 - 84), a1 = Math.atan2(83 - 89, 71.5 - 84) + 2 * Math.PI;
    for (let k = 1; k < 24; k++) {
      const a = a0 + (a1 - a0) * k / 24;
      pts.push([84 + 15 * Math.cos(a), 89 + 15 * Math.sin(a)]);
    }
    pts.push([71.5, 83], [60, 73]);
    return toPath(pts);
  })();

  const SCENES = [
    {
      name: "Espresso", place: "Italy", duration: 7,
      build(g) {
        P("M27 10 H93 Q102 10 102 19 V105 Q102 114 93 114 H27 Q18 114 18 105 V19 Q18 10 27 10 Z", "line", g);
        P("M18 42 H102", "line", g);
        make("circle", { class: "line", cx: 38, cy: 26, r: 8 }, g);
        const needle = P("M38 26 L42 21", "line needle", g);
        make("circle", { class: "knob", cx: 80, cy: 26, r: 2.6 }, g);
        make("circle", { class: "knob", cx: 90, cy: 26, r: 2.6 }, g);
        P("M52 42 V47 H68 V42", "line", g);
        P("M47 47 H73 L70 55 H50 Z", "line", g);
        P("M73 50 H93", "line", g);
        P("M57 55 V58 M63 55 V58", "line", g);
        const streams = P("M57 60 V95 M63 60 V95", "stream", g);
        const cup = vessel(g, "M47 90 H73 V97 Q73 106 64 106 H56 Q47 106 47 97 Z", 93, 106);
        P("M73 93 Q80 93 80 98 Q80 102 72 102", "line", g);
        P("M30 108.5 H90", "line", g);
        return t => {
          const on = t > 0.8 && t < 5.7;
          show(streams, on);
          cup.level(ease(ramp(t, 0.9, 5.7)));
          const a = -70 + 70 * ease(ramp(t, 0, 0.7)) - 70 * ease(ramp(t, 5.8, 6.5)) + (on ? Math.sin(t * 9) * 3 : 0);
          needle.setAttribute("transform", `rotate(${f1(a)} 38 26)`);
        };
      }
    },
    {
      // V60 dripper on a cup; a gooseneck kettle pours a thin stream of water onto the bed,
      // and the coffee runs out of the cone into the cup
      name: "Pour-over", place: "Japan", duration: 8,
      build(g) {
        P("M22 108.5 H98", "line", g);
        const cup = vessel(g, "M44 80 H76 V97 Q76 106 67 106 H53 Q44 106 44 97 Z", 84, 106);
        P("M76 85 Q84 85 84 92 Q84 99 76 98.5", "line", g);
        const drip = stream(g);
        P("M41 78 H79", "line thick", g);
        P("M56.5 72.5 V78 M63.5 72.5 V78", "line", g);
        const bed = vessel(g, "M44 50 H76 L64 72.5 H56 Z", 54, 72.5);
        P("M51 55 L57.6 68.5 M60 55 V69 M69 55 L62.4 68.5", "line thin", g);
        const bloom = [53, 60, 67].map(x => make("circle", { class: "bubble", cx: x, cy: 60, r: 1.3 }, g));
        const water = stream(g, "water-liquid");
        const kettle = make("g", {}, g);
        P("M86 40 H104 L109 62 H81 Z", "line", kettle);
        P("M87 40 Q95 32 103 40", "line", kettle);
        make("circle", { class: "knob", cx: 95, cy: 34.5, r: 1.8 }, kettle);
        P("M104 44 Q115 45 113 54 Q112 60 107.5 61", "line", kettle);
        P("M82.5 57 Q73 57 71 47 Q69.5 38 64 37 Q60.5 37 60.5 41", "line", kettle);
        return t => {
          // upright at rest; tipped forward (towards the spout) to pour
          const e = ease(ramp(t, 0, 0.8)) - ease(ramp(t, 6.0, 6.7));
          const angle = -10 * e, dx = 1 * e, dy = -6 * e;
          kettle.setAttribute("transform", `translate(${f1(dx)} ${f1(dy)}) rotate(${f1(angle)} 95 50)`);
          const pourOn = t > 0.8 && t < 6.0;
          const [kx, ky] = rot(60.5, 41, 95, 50, angle);
          const tx = kx + dx, ty = ky + dy;
          // the bed wets and rises while water is poured, then drains as the coffee runs out
          const wet = ease(ramp(t, 0.9, 2.0)) - 0.9 * ease(ramp(t, 6.0, 7.4));
          const surfaceBed = bed.level(0.05 + 0.6 * wet);
          water(tx, ty + 0.5, 59.5, surfaceBed, 1.4, 1.1, pourOn);
          bloom.forEach((b, k) => {
            b.setAttribute("cy", f1(surfaceBed + 1.6));
            b.style.opacity = pourOn ? 0.5 + 0.5 * Math.sin(t * 5 + k * 2) : 0;
          });
          const y = cup.level(ease(ramp(t, 1.6, 7.4)));
          drip(60, 78.5, 60, y, 1.3, 1.1, t > 1.5 && t < 7.3);
        };
      }
    },
    {
      // cezve on the flame: the coffee foams up towards the rim, then it is poured, foam and all
      name: "Turkish coffee", place: "Türkiye", duration: 8.5,
      build(g) {
        const fire = flames(g, [72, 79, 86], 108);
        P("M60 108.5 H98", "line", g);
        const cup = vessel(g, "M17 88 H41 L38.5 101 Q37.5 105 33 105 H25 Q20.5 105 19.5 101 Z", 90.5, 105, { foam: 2.4 });
        P("M40.4 91.5 Q46 91.5 45.2 96 Q44.5 100 39 99.5", "line", g);
        P("M12 107.5 Q29 110.5 46 107.5", "line", g);
        const pour = stream(g);
        const body = make("g", {}, g);
        const cezve = "M71 73 L74 77 Q69 88 71 100 H87 Q89 88 84 77 L87 73 Z";
        const p = pot(body, cezve, { px: 79, py: 88, tx: -22, ty: -13, lip: [71, 73], spout: [70.5, 72.5], foam: 3 });
        P("M71 73 L74 77 Q69 88 71 100 H87 Q89 88 84 77 L87 73", "line", body);
        P("M85 80 L107 71", "line thick", body);
        const start = cup.full * 1.3;
        const run = pourRun(p, cup, start, { l0: 3.1, l1: 3.9, p1: 7.0, b1: 7.8 });
        return t => {
          fire(t, 1 - ramp(t, 3.0, 3.3));
          const rise = ease(ramp(t, 0.3, 3.0));
          const foam = 1.5 + 4 * rise * (1 - ease(ramp(t, 3.9, 7.0)) * 0.6);
          const m = run(t, foam);
          pour(m.tip[0], m.tip[1], 29.5, m.cupY, 2.6, 1.8, m.pouring);
        };
      }
    },
    {
      // glass beaker in a metal frame: plunge the grounds down, then pour one cup
      name: "French press", place: "France", duration: 8.5,
      build(g) {
        P("M8 108.5 H104", "line", g);
        const cup = vessel(g, "M14 92 H40 V98 Q40 106 32 106 H22 Q14 106 14 98 Z", 95, 106);
        P("M14 95 Q8 95 8 99 Q8 103 15 102.5", "line", g);
        const pour = stream(g);
        const press = make("g", {}, g);
        const inside = "M67 54 V100 Q67 102 69 102 H87 Q89 102 89 100 V54 Z";
        const p = pot(press, inside, { px: 78, py: 80, tx: -11, ty: -6, lip: [67, 54.5], spout: [60.5, 51] });
        const grounds = make("rect", { class: "grounds", x: 67, width: 22, y: 60, height: 5 }, clipGroup(press, inside));
        P("M67 54 V100 Q67 102 69 102 H87 Q89 102 89 100 V54", "line", press);
        P("M65 100 H91 M66 104 V101 M90 104 V101 M65 104.5 H91", "line", press);   // frame and feet
        P("M65 56 H91", "line thin", press);
        P("M89 60 Q99 60 99 68 V86 Q99 94 89 94", "line thick", press);            // handle
        P("M64 54 H92 L91 50 Q78 47 65 50 Z", "line", press);                       // lid
        P("M64.5 52.5 L60.5 51", "line", press);                                     // spout
        const plunger = make("g", {}, press);
        P("M78 14 V60", "line", plunger);
        P("M68 60 H88", "line thick", plunger);
        make("circle", { class: "line", cx: 78, cy: 11, r: 3 }, plunger);
        const start = 22 * 42;            // filled to about y = 60, just under the lid
        const run = pourRun(p, cup, start, { l0: 3.1, l1: 3.9, p1: 7.0, b1: 7.8 });
        return t => {
          const down = ease(ramp(t, 0.5, 3.0));
          plunger.setAttribute("transform", `translate(0 ${f1(37 * down)})`);
          grounds.setAttribute("y", f1(61 + 36.5 * down));
          grounds.setAttribute("height", f1(5 - 0.8 * down));
          const m = run(t);
          pour(m.tip[0], m.tip[1], 27, m.cupY, 2.6, 1.8, m.pouring);
        };
      }
    },
    {
      // phin: a small metal filter with a perforated plate, resting on a glass of condensed milk;
      // the glass gets exactly the coffee that drips out of the filter
      name: "Phin", place: "Vietnam", duration: 8,
      build(g) {
        P("M30 108.5 H90", "line", g);
        const glass = vessel(g, "M45 84 L47.5 104 Q47.5 106 49.5 106 H70.5 Q72.5 106 72.5 104 L75 84", 85, 106,
          { clip: "M45 84 L47.5 104 Q47.5 106 49.5 106 H70.5 Q72.5 106 72.5 104 L75 84 Z", under: 98 });
        P("M45 84 A15 2 0 0 0 75 84", "line thin", g);                              // front of the glass rim
        const drip = drops(g, 60);
        const chamber = vessel(g, "M51 82 V60 M69 82 V60", 62, 82, { clip: "M51 82 V60 H69 V82 Z" });
        P("M38 82 A22 3.4 0 0 0 82 82 A22 3.4 0 0 0 38 82 Z", "line plate", g);   // perforated plate
        [44, 50, 56, 64, 70, 76].forEach(x => make("circle", { class: "hole", cx: x, cy: 82.4, r: 0.8 }, g));
        P("M51 60 A9 1.8 0 0 0 69 60 A9 1.8 0 0 0 51 60", "line", g);              // chamber rim
        P("M49.5 58 Q60 48 70.5 58 Z", "line", g);                                   // domed lid
        P("M58 51.5 V48.5 H62 V51.5", "line", g);                                    // lid knob
        const top = 63, bottom = 80.5;
        const full = chamber.amountAt(top);
        return t => {
          const f = ease(ramp(t, 0.5, 7.0));
          const y = lerp(top, bottom, f);
          chamber.level((82 - y) / 20);
          const gy = glass.fillTo(full - chamber.amountAt(y));
          drip(t, t > 0.3 && t < 7.0, 86, gy);
        };
      }
    },
    {
      name: "Filter coffee", place: "USA", duration: 7.5,
      build(g) {
        P("M84 106 V34 H48 Q44 34 44 30 V22 Q44 18 48 18 H100 Q104 18 104 22 V106", "line", g);
        P("M51 34 L57 46 H71 L77 34", "line", g);
        const lamp = make("circle", { class: "lamp", cx: 94, cy: 28, r: 2.6 }, g);
        make("circle", { class: "line thin", cx: 94, cy: 28, r: 2.6 }, g);
        const carafe = vessel(g, "M52 56 H74 L72 62 Q82 70 81 92 Q80 106 68 106 H58 Q46 106 45 92 Q44 70 54 62 Z", 64, 106);
        P("M47 66 Q38 66 38 76 Q38 88 46 88", "line", g);
        P("M51 56 H75", "line thick", g);
        const drip = drops(g, 64);
        P("M36 108.5 H108", "line", g);
        return t => {
          lamp.style.opacity = t > 0.4 ? 1 : 0;
          const y = carafe.level(ease(ramp(t, 0.9, 6.6)));
          drip(t, t > 0.7 && t < 6.6, 48, y);
        };
      }
    },
    {
      // jebena: the clay pot holds a few cups; it is lifted and pours one small cup
      name: "Jebena", place: "Ethiopia", duration: 8.5,
      build(g) {
        const cup = vessel(g, "M19 90 H41 L39 102 Q38 105 35 105 H25 Q22 105 21 102 Z", 92, 105);
        P("M70 108.5 Q84 104.5 98 108.5", "line", g);
        P("M12 108.5 H48", "line", g);
        const pour = stream(g);
        const body = make("g", {}, g);
        const p = pot(body, JEBENA, { px: 84, py: 89, tx: -20, ty: -10, lip: [61.5, 71.3], spout: [61, 71.5] });
        make("circle", { class: "line", cx: 84, cy: 89, r: 15 }, body);
        P("M78 76 L81 50 M90 76 L87 50 M79 50 H89", "line", body);
        P("M89 55 Q100 58 97 81", "line", body);
        P("M71.5 83 L60 73 M74.5 78 L63 69.5 M60 73 L63 69.5", "line", body);
        const start = cup.full * 2.4;
        const run = pourRun(p, cup, start, { l0: 1.0, l1: 2.0, p1: 6.6, b1: 7.5 });
        return t => {
          const m = run(t);
          pour(m.tip[0], m.tip[1], 30, m.cupY, 2.6, 1.8, m.pouring);
        };
      }
    },
    {
      // the mug gets exactly the coffee the plunger pushes out of the chamber
      name: "AeroPress", place: "USA", duration: 7,
      build(g) {
        const mug = vessel(g, "M44 80 H76 V100 Q76 106 70 106 H50 Q44 106 44 100 Z", 84, 106);
        P("M76 85 Q85 85 85 93 Q85 101 76 100.5", "line", g);
        const jet = P("M60 80 V106", "stream", g);
        const chamber = vessel(g, "M50 79 V36 M70 79 V36", 41, 78, { clip: "M50 79 V36 H70 V79 Z" });
        P("M43 79 H77", "line thick", g);
        P("M66 50 H69 M66 58 H69 M66 66 H69", "line thin", g);
        const plunger = make("g", {}, g);
        P("M52.5 40 V12 H67.5 V40", "line", plunger);
        P("M49 12 H71", "line thick", plunger);
        P("M52 40 H68", "line thick", plunger);
        P("M24 108.5 H96", "line", g);
        const full = chamber.amountAt(41);
        return t => {
          const p = ease(ramp(t, 0.8, 5.6));
          plunger.setAttribute("transform", `translate(0 ${f1(34 * p)})`);
          const top = 41 + 34 * p;                  // the coffee sits right under the plunger seal
          chamber.level((78 - top) / 37);
          const y = mug.fillTo(full - chamber.amountAt(top));
          jet.setAttribute("d", `M60 80 V${f1(y)}`);
          show(jet, t > 0.9 && t < 5.6);
        };
      }
    },
    {
      // moka: heat until the coffee gurgles up into the top chamber, then lift and pour a cup
      name: "Moka", place: "Italy", duration: 8.5,
      build(g) {
        const fire = flames(g, [70, 78, 86], 108);
        P("M54 108.5 H102", "line", g);
        const cup = vessel(g, "M18 92 H40 V98 Q40 106 33 106 H25 Q18 106 18 98 Z", 94, 106);
        P("M18 95 Q12 95 12 99 Q12 103 19 102.5", "line", g);
        P("M10 108.5 H46", "line", g);
        const pour = stream(g);
        const body = make("g", {}, g);
        const p = pot(body, "M70 78 L66.5 61 L59.5 52.5 L67 56 H89 L86 78 Z",
          { px: 78, py: 78, tx: -10, ty: -6, lip: [59.8, 52.8], spout: [59.5, 52.5] });
        P("M67 100 H89 L86 78 H70 Z", "line", body);
        P("M70 78 L67 56 H89 L86 78", "line", body);
        P("M67 56 L59 52 L66.5 61", "line", body);
        P("M89 60 Q100 60 99 68 L97 76 H87", "line", body);
        const lid = make("g", {}, body);
        P("M66 56 H90 L86 50 H70 Z", "line", lid);
        make("circle", { class: "knob", cx: 78, cy: 47.5, r: 2.2 }, lid);
        const start = cup.full * 1.2;
        const run = pourRun(p, cup, start, { l0: 3.0, l1: 3.8, p1: 7.0, b1: 7.8 });
        return t => {
          fire(t, 1 - ramp(t, 2.8, 3.1));
          const gurgle = t > 1.4 && t < 2.8 ? -Math.abs(Math.sin(t * 22)) * 1.4 : 0;
          lid.setAttribute("transform", `translate(0 ${f1(gurgle)})`);
          if (t < 3.0) {
            // coffee rising into the top chamber
            p.set(0, start * ease(ramp(t, 0.8, 2.8)), 0);
            cup.level(0);
            pour(0, 0, 0, 0, 0, 0, false);
            return;
          }
          const m = run(t);
          pour(m.tip[0], m.tip[1], 29, m.cupY, 2.4, 1.7, m.pouring);
        };
      }
    },
  ];

  // `still` ({ scene, time }) draws one frozen frame instead of the loop (used for checking the drawings)
  function mount(art, still) {
    if (!art || art.dataset.brewing) return;
    art.dataset.brewing = "1";
    const caption = art.parentElement && art.parentElement.querySelector(".brew-caption");
    const svg = make("svg", { viewBox: "-28 -28 176 176", class: "brew-doodle", focusable: "false", "aria-hidden": "true" }, art);
    const scenes = SCENES.map(scene => {
      const g = make("g", {}, svg);
      g.style.display = "none";
      return { ...scene, g, update: scene.build(g) };
    });
    // the caption is always two lines (method, then place), so it never changes height
    const label = s => {
      if (!caption) return;
      caption.innerHTML = `<span class="brew-name"></span><span class="brew-place"></span>`;
      caption.firstChild.textContent = s.name;
      caption.lastChild.textContent = s.place;
    };

    if (still && typeof still === "object") {
      const s = scenes[still.scene];
      s.g.style.display = "";
      s.update(still.time);
      label(s);
      return s.update;
    }

    let i = 0, t = 0, slide = -1, last = 0, raf = null, visible = true, shown = null;
    scenes[0].g.style.display = "";
    scenes[0].update(0);
    label(scenes[0]);
    shown = scenes[0];

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      scenes[0].update(scenes[0].duration);    // one still frame: a full cup
      return;
    }

    const place = (cur, next, e) => {
      cur.g.setAttribute("transform", `translate(${f1(-SIZE * e)} 0)`);
      next.g.setAttribute("transform", `translate(${f1(SIZE * (1 - e))} 0)`);
    };

    const frame = now => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const cur = scenes[i], next = scenes[(i + 1) % scenes.length];

      if (slide < 0) {
        t += dt;
        cur.update(Math.min(t, cur.duration));
        if (t >= cur.duration) {
          // park the next scene off to the right before it becomes visible (no flash in the middle)
          slide = 0;
          next.update(0);
          place(cur, next, 0);
          next.g.style.display = "";
        }
      } else {
        slide += dt;
        const e = ease(Math.min(1, slide / SLIDE));
        place(cur, next, e);
        if (caption) {
          caption.style.opacity = f1(Math.abs(1 - 2 * e));
          const want = e < 0.5 ? cur : next;
          if (want !== shown) { label(want); shown = want; }
        }
        if (slide >= SLIDE) {
          cur.g.style.display = "none";
          next.g.setAttribute("transform", "translate(0 0)");
          i = (i + 1) % scenes.length;
          t = 0;
          slide = -1;
        }
      }
      raf = visible ? requestAnimationFrame(frame) : null;
    };

    const resume = () => { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(entries => {
        visible = entries[entries.length - 1].isIntersecting && !document.hidden;
        resume();
      }).observe(art);
    }
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; resume(); });
    resume();
  }

  window.BrewDoodle = { mount, scenes: SCENES.map(s => `${s.name} · ${s.place}`), durations: SCENES.map(s => s.duration) };
})();
