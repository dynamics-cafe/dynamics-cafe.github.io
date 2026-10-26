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
  const show = (node, on) => { node.style.opacity = on ? 1 : 0; };

  // same convention as SVG rotate(deg, cx, cy)
  const rot = (x, y, cx, cy, deg) => {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
  };

  // A vessel that fills with coffee from yBottom up to yTop. `clip` is the closed inside
  // shape (defaults to the outline); `under` is an optional layer below the coffee (milk).
  function vessel(g, outline, yTop, yBottom, opts = {}) {
    const id = "brew-clip-" + (++uid);
    const cp = make("clipPath", { id }, make("defs", {}, g));
    P(opts.clip || outline, "", cp);
    const inner = make("g", { "clip-path": `url(#${id})` }, g);
    let base = yBottom;
    if (opts.under) {
      make("rect", { class: "milk", x: -20, width: 160, y: opts.under, height: yBottom - opts.under + 2 }, inner);
      base = opts.under;
    }
    const coffee = make("rect", { class: "coffee", x: -20, width: 160, y: base, height: 0 }, inner);
    P(outline, "line", g);
    return {
      level(f) {
        const y = base - f * (base - yTop);
        coffee.setAttribute("y", y);
        coffee.setAttribute("height", Math.max(0, base - y + (opts.under ? 0 : 2)));
        return y;
      }
    };
  }

  // A pot that tilts towards a cup and pours from its spout tip.
  function pourer(group, stream, { px, py, angle, tx, ty, tip }) {
    return (e, pouring, cx, cy) => {
      group.setAttribute("transform", `translate(${tx * e} ${ty * e}) rotate(${angle * e} ${px} ${py})`);
      if (!pouring) return show(stream, false);
      const [x, y] = rot(tip[0], tip[1], px, py, angle * e);
      const X = x + tx * e, Y = y + ty * e;
      stream.setAttribute("d", `M${X.toFixed(1)} ${Y.toFixed(1)} C${X.toFixed(1)} ${(Y + 6).toFixed(1)} ${cx + 1} ${(cy - 8).toFixed(1)} ${cx} ${cy.toFixed(1)}`);
      show(stream, true);
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
          const pouring = t > 0.8 && t < 5.7;
          show(streams, pouring);
          cup.level(ease(ramp(t, 0.9, 5.7)));
          const a = -70 + 70 * ease(ramp(t, 0, 0.7)) - 70 * ease(ramp(t, 5.8, 6.5)) + (pouring ? Math.sin(t * 9) * 3 : 0);
          needle.setAttribute("transform", `rotate(${a} 38 26)`);
        };
      }
    },
    {
      name: "Pour-over", place: "Japan", duration: 7.5,
      build(g) {
        const water = P("", "water", g);
        const cup = vessel(g, "M44 79 H76 V98 Q76 106 68 106 H52 Q44 106 44 98 Z", 82, 106);
        P("M76 84 Q84 84 84 91.5 Q84 99 76 98.5", "line", g);
        const drip = drops(g, 60);
        P("M42 77 H78", "line", g);
        P("M57 72 V77 M63 72 V77", "line", g);
        const cone = vessel(g, "M45 50 H75 L64 72 H56 Z", 56, 72);
        P("M51 55 L57.5 68 M69 55 L62.5 68", "line thin", g);
        P("M24 108.5 H96", "line", g);
        const kettle = make("g", {}, g);
        P("M88 40 H108 Q111 52 107 60 H89 Q85 52 88 40 Z", "line", kettle);
        P("M89 40 Q98 33 107 40", "line", kettle);
        make("circle", { class: "knob", cx: 98, cy: 34.5, r: 1.8 }, kettle);
        P("M108 43 Q117 45 113 56", "line", kettle);
        P("M89 56 Q80 56 78 47 Q76 39 70 37", "line", kettle);
        cone.level(0.55);
        return t => {
          const e = ease(ramp(t, 0, 0.8)) - ease(ramp(t, 6.2, 6.9));
          kettle.setAttribute("transform", `rotate(${18 - 18 * e} 98 50)`);
          const pouring = t > 0.7 && t < 6.2;
          water.setAttribute("d", "M70 37 C 68 40, 64 46, 63 56");
          show(water, pouring);
          const y = cup.level(ease(ramp(t, 1.2, 6.4)));
          drip(t, t > 1.0 && t < 6.4, 79, y);
        };
      }
    },
    {
      name: "Turkish coffee", place: "Türkiye", duration: 8,
      build(g) {
        const fire = flames(g, [72, 80, 88], 108);
        P("M60 108.5 H100", "line", g);
        const cup = vessel(g, "M21 90 H39 L37 101 Q36 104 33 104 H27 Q24 104 23 101 Z", 92, 104);
        P("M38.6 93 Q44 93 43 97 Q42 100 37.5 100", "line", g);
        P("M15 106.5 Q30 109.5 45 106.5", "line", g);
        const stream = P("", "stream", g);
        const pot = make("g", {}, g);
        const foam = P("", "foam", pot);
        P("M68 62 L72 68 Q64 84 67 100 H91 Q94 84 86 68 L90 62", "line", pot);
        P("M88 71 L112 61", "line thick", pot);
        const pour = pourer(pot, stream, { px: 79, py: 82, angle: -45, tx: -20, ty: 3, tip: [68, 62] });
        return t => {
          fire(t, 1 - ramp(t, 3.0, 3.3));
          const f = ease(ramp(t, 0.4, 3.0)) * (1 - ramp(t, 3.8, 6.6));
          foam.setAttribute("d", `M70 63 Q79 ${63 - 13 * f} 88 63 Z`);
          show(foam, f > 0.03);
          const e = ease(ramp(t, 3.0, 3.8)) - ease(ramp(t, 6.6, 7.4));
          const y = cup.level(ease(ramp(t, 3.8, 6.6)));
          pour(e, t > 3.7 && t < 6.6, 30, y);
        };
      }
    },
    {
      name: "French press", place: "France", duration: 8,
      build(g) {
        const cup = vessel(g, "M16 92 H42 V98 Q42 106 34 106 H24 Q16 106 16 98 Z", 95, 106);
        P("M16 95 Q10 95 10 99 Q10 103 17 102.5", "line", g);
        P("M10 108.5 H100", "line", g);
        const stream = P("", "stream", g);
        const press = make("g", {}, g);
        const inside = vessel(press, "M66 54 V100 Q66 102 68 102 H88 Q90 102 90 100 V54",
          60, 102, { clip: "M66 54 V100 Q66 102 68 102 H88 Q90 102 90 100 V54 Z" });
        P("M64 54 H92 V50 H64 Z", "line", press);
        P("M64 52 L61 50", "line", press);
        P("M90 60 H97 Q99 60 99 62 V90 Q99 92 97 92 H90", "line", press);
        const plunger = make("g", {}, press);
        P("M78 14 V58 M67.5 58 H88.5", "line", plunger);
        make("circle", { class: "line", cx: 78, cy: 11, r: 3 }, plunger);
        const pour = pourer(press, stream, { px: 78, py: 78, angle: -50, tx: -10, ty: 4, tip: [61, 50] });
        return t => {
          plunger.setAttribute("transform", `translate(0 ${38 * ease(ramp(t, 0.6, 3.0))})`);
          const f = ease(ramp(t, 3.8, 6.8));
          inside.level(0.88 - 0.6 * f);
          const e = ease(ramp(t, 3.0, 3.8)) - ease(ramp(t, 6.8, 7.6));
          const y = cup.level(f);
          pour(e, t > 3.7 && t < 6.8, 29, y);
        };
      }
    },
    {
      name: "Phin", place: "Vietnam", duration: 7.5,
      build(g) {
        const glass = vessel(g, "M44 70 L47 104 Q47 106 49 106 H71 Q73 106 73 104 L76 70", 74, 106,
          { clip: "M44 70 L47 104 Q47 106 49 106 H71 Q73 106 73 104 L76 70 Z", under: 96 });
        const drip = drops(g, 60);
        const filter = vessel(g, "M50 67 V46 H70 V67", 50, 67, { clip: "M50 67 V46 H70 V67 Z" });
        P("M39 68 H81", "line thick", g);
        P("M47 46 H73 M52 46 V42 H68 V46 M57 42 V39 H63 V42", "line", g);
        P("M30 108.5 H90", "line", g);
        return t => {
          const f = ease(ramp(t, 0.6, 6.6));
          filter.level(0.9 - 0.75 * f);
          const y = glass.level(f);
          drip(t, t > 0.4 && t < 6.6, 71, y);
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
      name: "Jebena", place: "Ethiopia", duration: 8,
      build(g) {
        const cup = vessel(g, "M20 92 H40 L38 102 Q37 105 34 105 H26 Q23 105 22 102 Z", 94, 105);
        P("M68 108.5 Q84 104 100 108.5", "line", g);
        P("M12 108.5 H48", "line", g);
        const stream = P("", "stream", g);
        const pot = make("g", {}, g);
        make("circle", { class: "line", cx: 84, cy: 89, r: 15 }, pot);
        P("M78 76 L81 50 M90 76 L87 50 M79 50 H89", "line", pot);
        P("M89 55 Q100 58 97 81", "line", pot);
        P("M71.5 83 L60 73 M74.5 78 L63 69.5 M60 73 L63 69.5", "line", pot);
        const pour = pourer(pot, stream, { px: 84, py: 89, angle: -40, tx: -18, ty: -6, tip: [61, 71] });
        return t => {
          const e = ease(ramp(t, 1.0, 2.0)) - ease(ramp(t, 6.0, 6.9));
          const y = cup.level(ease(ramp(t, 2.0, 6.0)));
          pour(e, t > 1.9 && t < 6.0, 30, y);
        };
      }
    },
    {
      name: "AeroPress", place: "USA", duration: 7,
      build(g) {
        const mug = vessel(g, "M38 80 H78 V100 Q78 106 72 106 H44 Q38 106 38 100 Z", 84, 106);
        P("M78 85 Q88 85 88 93 Q88 101 78 100.5", "line", g);
        const stream = P("M60 80 V106", "stream", g);
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
          stream.setAttribute("d", `M60 80 V${y.toFixed(1)}`);
          show(stream, t > 0.9 && t < 5.6);
        };
      }
    },
    {
      name: "Moka", place: "Italy", duration: 8,
      build(g) {
        const fire = flames(g, [70, 78, 86], 108);
        P("M54 108.5 H102", "line", g);
        const cup = vessel(g, "M18 92 H40 V98 Q40 106 33 106 H25 Q18 106 18 98 Z", 94, 106);
        P("M18 95 Q12 95 12 99 Q12 103 19 102.5", "line", g);
        P("M10 108.5 H46", "line", g);
        const stream = P("", "stream", g);
        const pot = make("g", {}, g);
        P("M67 100 H89 L86 78 H70 Z", "line", pot);
        P("M70 78 L67 56 H89 L86 78", "line", pot);
        P("M67 56 L59 52 L66.5 61", "line", pot);
        P("M89 60 Q100 60 99 68 L97 76 H87", "line", pot);
        const lid = make("g", {}, pot);
        P("M66 56 H90 L86 50 H70 Z", "line", lid);
        make("circle", { class: "knob", cx: 78, cy: 47.5, r: 2.2 }, lid);
        const pour = pourer(pot, stream, { px: 78, py: 78, angle: -55, tx: -8, ty: 2, tip: [59, 52] });
        return t => {
          fire(t, 1 - ramp(t, 2.5, 2.8));
          const gurgle = t > 1.3 && t < 2.5 ? -Math.abs(Math.sin(t * 22)) * 1.4 : 0;
          lid.setAttribute("transform", `translate(0 ${gurgle})`);
          const e = ease(ramp(t, 2.6, 3.4)) - ease(ramp(t, 6.8, 7.6));
          const y = cup.level(ease(ramp(t, 3.4, 6.8)));
          pour(e, t > 3.3 && t < 6.8, 29, y);
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

    let i = 0, t = 0, slide = -1, last = 0, raf = null, visible = true;
    scenes[0].g.style.display = "";
    scenes[0].update(0);
    if (caption) caption.textContent = label(scenes[0]);

    if (still && typeof still === "object") {
      scenes[0].g.style.display = "none";
      const s = scenes[still.scene];
      s.g.style.display = "";
      s.update(still.time);
      if (caption) caption.textContent = label(s);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      scenes[0].update(scenes[0].duration);    // one still frame: a full cup
      return;
    }

    const frame = now => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const cur = scenes[i], next = scenes[(i + 1) % scenes.length];

      if (slide < 0) {
        t += dt;
        cur.update(Math.min(t, cur.duration));
        if (t >= cur.duration) {
          slide = 0;
          next.update(0);
          next.g.style.display = "";
        }
      } else {
        slide += dt;
        const e = ease(Math.min(1, slide / SLIDE));
        cur.g.setAttribute("transform", `translate(${-SIZE * e} 0)`);
        next.g.setAttribute("transform", `translate(${SIZE * (1 - e)} 0)`);
        if (caption) {
          caption.style.opacity = Math.abs(1 - 2 * e);
          caption.textContent = label(e < 0.5 ? cur : next);
        }
        if (slide >= SLIDE) {
          cur.g.style.display = "none";
          cur.g.removeAttribute("transform");
          next.g.removeAttribute("transform");
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

  window.BrewDoodle = { mount, scenes: SCENES.map(s => `${s.name} · ${s.place}`) };
})();
