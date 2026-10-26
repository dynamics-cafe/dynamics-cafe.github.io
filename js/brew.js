/*
  "Brewing..." doodle: coffee from around the world, one method at a time.
  Each scene brews until its cup is full, then slides out to the left inside the
  circle while the next one slides in from the right, forever.
  Drawn as SVG line art in a 120 x 120 box; the circle shows -28..148 of it.
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

  // A cup that fills from yBottom up to yTop. `under`: a layer below the coffee (milk);
  // `foam`: a thin foam band riding on the surface.
  function vessel(g, outline, yTop, yBottom, opts = {}) {
    const inner = clipGroup(g, opts.clip || outline);
    let base = yBottom;
    if (opts.under) {
      make("rect", { class: "milk", x: -20, width: 160, y: opts.under, height: yBottom - opts.under + 2 }, inner);
      base = opts.under;
    }
    const coffee = make("rect", { class: "coffee", x: -20, width: 160, y: base, height: 0 }, inner);
    const foam = opts.foam ? make("rect", { class: "foam-fill", x: -20, width: 160, y: base, height: 0 }, inner) : null;
    P(outline, "line", g);
    return {
      level(f) {
        const y = base - f * (base - yTop);
        coffee.setAttribute("y", y);
        coffee.setAttribute("height", Math.max(0, base - y + (opts.under ? 0 : 2)));
        if (foam) {
          const h = Math.min(opts.foam, base - y);
          foam.setAttribute("y", y);
          foam.setAttribute("height", Math.max(0, h));
        }
        return y;
      }
    };
  }

  // Coffee inside a pot that tilts. The pot's shape turns with the pot, but the liquid is
  // counter-rotated so its surface always stays level, like real liquid.
  function tank(pot, clip, { px, py, foam = 0 }) {
    const inner = clipGroup(pot, clip);
    const level = make("g", {}, inner);
    const coffee = make("rect", { class: "coffee", x: -60, width: 240, y: 200, height: 200 }, level);
    const top = foam ? make("rect", { class: "foam-fill", x: -60, width: 240, y: 200, height: foam }, level) : null;
    return (surface, angle, foamH = foam) => {
      level.setAttribute("transform", `rotate(${-angle} ${px} ${py})`);
      coffee.setAttribute("y", f1(surface));
      if (top) {
        top.setAttribute("y", f1(surface));
        top.setAttribute("height", Math.max(0, foamH));
      }
    };
  }

  // A falling stream of liquid: it leaves the spout and curves down under gravity
  // (sideways distance grows like the square root of the drop), drawn as a ribbon that
  // thins as it falls, with a faint highlight running down it.
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

  // A pot that lifts, tilts towards the cup and pours. While pouring it tips further
  // (angle0 -> angle1) as it empties; the liquid surface sits at the spout lip.
  function pouring(pot, { px, py, tx, ty, tip, angle0, angle1, rest, empty }) {
    const tipAt = a => rot(tip[0], tip[1], px, py, a);
    // phase: lift 0..1, pour 0..1, back 0..1
    return (lift, pour, back) => {
      const e = lift * (1 - back);
      const a = lift > 0 ? (angle0 + (angle1 - angle0) * pour) * e : 0;
      pot.setAttribute("transform", `translate(${f1(tx * e)} ${f1(ty * e)}) rotate(${f1(a)} ${px} ${py})`);
      const lip = tipAt(a)[1] + 1.2;
      let surface;
      if (back > 0) surface = lerp(lerp(rest, lip, lift), empty, back);
      else if (pour > 0) surface = lip;
      else surface = lerp(rest, lip, lift);
      const [x, y] = tipAt(a);
      return { angle: a, surface, tip: [x + tx * e, y + ty * e] };
    };
  }

  // Three drops falling from (x, y0) to the surface y1.
  function drops(g, x) {
    const ds = [0, 1, 2].map(() => P("M0 -3.4 q-2.6 3.8 0 5.8 q2.6 -2 0 -5.8 z", "drop", g));
    return (t, on, y0, y1) => ds.forEach((d, k) => {
      const ph = (t * 1.6 + k / 3) % 1;
      d.setAttribute("transform", `translate(${x} ${y0 + ph * (y1 - y0)})`);
      d.style.opacity = on && y1 - y0 > 3 ? Math.min(1, ph * 6, (1 - ph) * 6) : 0;
    });
  }

  // Little gas flames under a pot.
  function flames(g, xs, y) {
    const fs = xs.map(x => P(`M${x} ${y} q-3 -4 0 -7.5 q3 3.5 0 7.5 z`, "flame", g));
    return (t, on) => fs.forEach((f, k) => {
      const s = 0.8 + 0.22 * Math.sin(t * 13 + k * 2.1);
      f.setAttribute("transform", `translate(${xs[k]} ${y}) scale(1 ${s}) translate(${-xs[k]} ${-y})`);
      f.style.opacity = on;
    });
  }

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
          needle.setAttribute("transform", `rotate(${a} 38 26)`);
        };
      }
    },
    {
      // V60 dripper on a cup, gooseneck kettle pouring a thin stream of water onto the coffee bed
      name: "Pour-over", place: "Japan", duration: 8,
      build(g) {
        P("M22 108.5 H98", "line", g);
        const cup = vessel(g, "M44 80 H76 V97 Q76 106 67 106 H53 Q44 106 44 97 Z", 83, 106);
        P("M76 85 Q84 85 84 92 Q84 99 76 98.5", "line", g);
        const drip = stream(g);
        P("M41 78 H79", "line thick", g);
        P("M56.5 72.5 V78 M63.5 72.5 V78", "line", g);
        const bed = vessel(g, "M44 50 H76 L64 72.5 H56 Z", 54, 72.5);
        P("M51 55 L57.6 68.5 M60 55 V69 M69 55 L62.4 68.5", "line thin", g);
        const bloom = [[53, 0], [60, 1], [67, 2]].map(([x, k]) => make("circle", { class: "bubble", cx: x, cy: 60, r: 1.3 }, g));
        const water = stream(g, "water-liquid");
        const kettle = make("g", {}, g);
        P("M86 40 H104 L109 62 H81 Z", "line", kettle);
        P("M87 40 Q95 32 103 40", "line", kettle);
        make("circle", { class: "knob", cx: 95, cy: 34.5, r: 1.8 }, kettle);
        P("M104 44 Q115 45 113 54 Q112 60 107.5 61", "line", kettle);
        P("M82.5 57 Q73 57 71 47 Q69.5 38 64 37 Q60.5 37 60.5 41", "line", kettle);
        return t => {
          const e = ease(ramp(t, 0, 0.8)) - ease(ramp(t, 6.4, 7.1));
          kettle.setAttribute("transform", `rotate(${f1(14 - 14 * e)} 95 60)`);
          const pourOn = t > 0.8 && t < 6.4;
          const [tx, ty] = rot(60.5, 41, 95, 60, 14 - 14 * e);
          const surfaceBed = bed.level(0.35 + 0.35 * ease(ramp(t, 0.9, 2.2)));
          water(tx, ty + 0.5, 59.5, surfaceBed, 1.4, 1.1, pourOn);
          bloom.forEach((b, k) => {
            b.setAttribute("cy", f1(surfaceBed + 1.6));
            b.style.opacity = pourOn ? 0.5 + 0.5 * Math.sin(t * 5 + k * 2) : 0;
          });
          const y = cup.level(ease(ramp(t, 1.6, 6.8)));
          drip(60, 78.5, 60, y, 1.3, 1.1, t > 1.5 && t < 6.8);
        };
      }
    },
    {
      // cezve on the flame: the coffee foams up to the rim, then it is poured, foam and all
      name: "Turkish coffee", place: "Türkiye", duration: 8.5,
      build(g) {
        const fire = flames(g, [72, 80, 88], 108);
        P("M60 108.5 H100", "line", g);
        const cup = vessel(g, "M21 90 H39 L37 101 Q36 104 33 104 H27 Q24 104 23 101 Z", 92, 104, { foam: 2.4 });
        P("M38.6 93 Q44 93 43 97 Q42 100 37.5 100", "line", g);
        P("M15 106.5 Q30 109.5 45 106.5", "line", g);
        const pourStream = stream(g);
        const pot = make("g", {}, g);
        const inside = "M68 62 L72 68 Q64 84 67 100 H91 Q94 84 86 68 L90 62 Z";
        const fill = tank(pot, inside, { px: 79, py: 82, foam: 3 });
        P("M68 62 L72 68 Q64 84 67 100 H91 Q94 84 86 68 L90 62", "line", pot);
        P("M88 71 L112 61", "line thick", pot);
        const move = pouring(pot, { px: 79, py: 82, tx: -21, ty: 1, tip: [68, 62], angle0: -38, angle1: -78, rest: 64, empty: 96 });
        return t => {
          fire(t, 1 - ramp(t, 3.0, 3.3));
          const lift = ease(ramp(t, 3.0, 3.8)), pour = ease(ramp(t, 3.8, 7.0)), back = ease(ramp(t, 7.0, 7.8));
          const m = move(lift, pour, back);
          const rise = ease(ramp(t, 0.3, 3.0));
          const restSurface = 74 - 10 * rise;                       // foams up to the rim
          fill(lift > 0 ? m.surface : restSurface, m.angle, 2 + 2.5 * rise);
          const y = cup.level(pour);
          pourStream(m.tip[0], m.tip[1], 30, y, 2.6, 1.8, t > 3.8 && t < 7.0);
        };
      }
    },
    {
      // glass beaker in a metal frame: plunge the grounds down, then pour
      name: "French press", place: "France", duration: 8.5,
      build(g) {
        P("M8 108.5 H104", "line", g);
        const cup = vessel(g, "M14 92 H40 V98 Q40 106 32 106 H22 Q14 106 14 98 Z", 95, 106);
        P("M14 95 Q8 95 8 99 Q8 103 15 102.5", "line", g);
        const pourStream = stream(g);
        const press = make("g", {}, g);
        const inside = "M67 54 V100 Q67 102 69 102 H87 Q89 102 89 100 V54 Z";
        const fill = tank(press, inside, { px: 78, py: 78 });
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
        const move = pouring(press, { px: 78, py: 78, tx: -12, ty: 3, tip: [60.5, 51], angle0: -32, angle1: -70, rest: 59, empty: 92 });
        return t => {
          const press01 = ease(ramp(t, 0.5, 3.0));
          const disc = 60 + 37 * press01;
          plunger.setAttribute("transform", `translate(0 ${f1(37 * press01)})`);
          grounds.setAttribute("y", f1(disc + 0.5));
          grounds.setAttribute("height", f1(5 - 0.5 * press01));
          const lift = ease(ramp(t, 3.0, 3.8)), pour = ease(ramp(t, 3.8, 7.0)), back = ease(ramp(t, 7.0, 7.8));
          const m = move(lift, pour, back);
          fill(m.surface, m.angle);
          const y = cup.level(pour);
          pourStream(m.tip[0], m.tip[1], 27, y, 2.6, 1.8, t > 3.8 && t < 7.0);
        };
      }
    },
    {
      // phin: a small metal filter with a perforated plate, resting on a glass of condensed milk
      name: "Phin", place: "Vietnam", duration: 8,
      build(g) {
        P("M30 108.5 H90", "line", g);
        const glass = vessel(g, "M46 74 L48.5 104 Q48.5 106 50.5 106 H69.5 Q71.5 106 71.5 104 L74 74", 77, 106,
          { clip: "M46 74 L48.5 104 Q48.5 106 50.5 106 H69.5 Q71.5 106 71.5 104 L74 74 Z", under: 97 });
        P("M46 74 A14 2 0 0 0 74 74", "line thin", g);                              // front of the glass rim
        const drip = drops(g, 60);
        const chamber = vessel(g, "M51 70 V48 M69 70 V48", 50, 70, { clip: "M51 70 V48 H69 V70 Z" });
        P("M38 70 A22 3.4 0 0 0 82 70 A22 3.4 0 0 0 38 70 Z", "line plate", g);   // perforated plate
        [44, 50, 56, 64, 70, 76].forEach(x => make("circle", { class: "hole", cx: x, cy: 70.4, r: 0.8 }, g));
        P("M51 48 A9 1.8 0 0 0 69 48 A9 1.8 0 0 0 51 48", "line", g);              // chamber rim
        P("M49.5 46 Q60 36 70.5 46 Z", "line", g);                                   // domed lid
        P("M58 39.5 V36.5 H62 V39.5", "line", g);                                    // lid knob
        return t => {
          const f = ease(ramp(t, 0.5, 7.0));
          chamber.level(0.92 - 0.8 * f);
          const y = glass.level(f);
          drip(t, t > 0.3 && t < 7.0, 74.5, y);
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
      // jebena: the clay pot is full of coffee, lifted and poured into small handleless cups
      name: "Jebena", place: "Ethiopia", duration: 8.5,
      build(g) {
        const cup = vessel(g, "M20 92 H40 L38 102 Q37 105 34 105 H26 Q23 105 22 102 Z", 94, 105);
        P("M68 108.5 Q84 104 100 108.5", "line", g);
        P("M12 108.5 H48", "line", g);
        const pourStream = stream(g);
        const pot = make("g", {}, g);
        const fill = tank(pot, [
          "M69 89 A15 15 0 1 0 99 89 A15 15 0 1 0 69 89 Z",
          "M78 77 L81 50 H87 L90 77 Z",
          "M72.5 82.5 L60.5 71.5 L63.5 69.5 L76 78 Z"
        ], { px: 84, py: 89 });
        make("circle", { class: "line", cx: 84, cy: 89, r: 15 }, pot);
        P("M78 76 L81 50 M90 76 L87 50 M79 50 H89", "line", pot);
        P("M89 55 Q100 58 97 81", "line", pot);
        P("M71.5 83 L60 73 M74.5 78 L63 69.5 M60 73 L63 69.5", "line", pot);
        const move = pouring(pot, { px: 84, py: 89, tx: -19, ty: -6, tip: [61.5, 71], angle0: -26, angle1: -66, rest: 62, empty: 98 });
        return t => {
          const lift = ease(ramp(t, 1.0, 2.0)), pour = ease(ramp(t, 2.0, 6.8)), back = ease(ramp(t, 6.8, 7.7));
          const m = move(lift, pour, back);
          fill(m.surface, m.angle);
          const y = cup.level(pour);
          pourStream(m.tip[0], m.tip[1], 30, y, 2.6, 1.8, t > 2.0 && t < 6.8);
        };
      }
    },
    {
      name: "AeroPress", place: "USA", duration: 7,
      build(g) {
        const mug = vessel(g, "M38 80 H78 V100 Q78 106 72 106 H44 Q38 106 38 100 Z", 84, 106);
        P("M78 85 Q88 85 88 93 Q88 101 78 100.5", "line", g);
        const jet = P("M60 80 V106", "stream", g);
        const chamber = vessel(g, "M50 79 V36 M70 79 V36", 40, 78, { clip: "M50 79 V36 H70 V79 Z" });
        P("M42 79 H74", "line thick", g);
        P("M66 50 H69 M66 58 H69 M66 66 H69", "line thin", g);
        const plunger = make("g", {}, g);
        P("M52.5 40 V12 H67.5 V40", "line", plunger);
        P("M49 12 H71", "line thick", plunger);
        P("M52 40 H68", "line thick", plunger);
        P("M24 108.5 H96", "line", g);
        return t => {
          const p = ease(ramp(t, 0.8, 5.6));
          plunger.setAttribute("transform", `translate(0 ${34 * p})`);
          chamber.level(0.95 * (1 - p) + 0.02);
          const y = mug.level(p);
          jet.setAttribute("d", `M60 80 V${y.toFixed(1)}`);
          show(jet, t > 0.9 && t < 5.6);
        };
      }
    },
    {
      // moka: heat until the coffee gurgles up into the top chamber, then lift and pour
      name: "Moka", place: "Italy", duration: 8.5,
      build(g) {
        const fire = flames(g, [70, 78, 86], 108);
        P("M54 108.5 H102", "line", g);
        const cup = vessel(g, "M18 92 H40 V98 Q40 106 33 106 H25 Q18 106 18 98 Z", 94, 106);
        P("M18 95 Q12 95 12 99 Q12 103 19 102.5", "line", g);
        P("M10 108.5 H46", "line", g);
        const pourStream = stream(g);
        const pot = make("g", {}, g);
        const fill = tank(pot, ["M70 78 L67 56 H89 L86 78 Z", "M67.5 57 L60 52.5 L66.5 60 Z"], { px: 78, py: 78 });
        P("M67 100 H89 L86 78 H70 Z", "line", pot);
        P("M70 78 L67 56 H89 L86 78", "line", pot);
        P("M67 56 L59 52 L66.5 61", "line", pot);
        P("M89 60 Q100 60 99 68 L97 76 H87", "line", pot);
        const lid = make("g", {}, pot);
        P("M66 56 H90 L86 50 H70 Z", "line", lid);
        make("circle", { class: "knob", cx: 78, cy: 47.5, r: 2.2 }, lid);
        const move = pouring(pot, { px: 78, py: 78, tx: -9, ty: 1, tip: [59.5, 52.5], angle0: -30, angle1: -70, rest: 60, empty: 76 });
        return t => {
          fire(t, 1 - ramp(t, 2.8, 3.1));
          const gurgle = t > 1.4 && t < 2.8 ? -Math.abs(Math.sin(t * 22)) * 1.4 : 0;
          lid.setAttribute("transform", `translate(0 ${gurgle})`);
          const lift = ease(ramp(t, 2.9, 3.7)), pour = ease(ramp(t, 3.7, 7.0)), back = ease(ramp(t, 7.0, 7.8));
          const m = move(lift, pour, back);
          const up = 78 - 18 * ease(ramp(t, 0.8, 2.8));             // coffee rising into the top chamber
          fill(lift > 0 ? m.surface : up, m.angle);
          const y = cup.level(pour);
          pourStream(m.tip[0], m.tip[1], 29, y, 2.4, 1.7, t > 3.7 && t < 7.0);
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
    const label = s => `${s.name} · ${s.place}`;

    if (still && typeof still === "object") {
      const s = scenes[still.scene];
      s.g.style.display = "";
      s.update(still.time);
      if (caption) caption.textContent = label(s);
      return;
    }

    let i = 0, t = 0, slide = -1, last = 0, raf = null, visible = true;
    scenes[0].g.style.display = "";
    scenes[0].update(0);
    if (caption) caption.textContent = label(scenes[0]);

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
          caption.style.opacity = Math.abs(1 - 2 * e);
          caption.textContent = label(e < 0.5 ? cur : next);
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
