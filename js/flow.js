/*
  Dynamics Cafe background: a minimal phase portrait.
  Thin streamlines of a planar system (spiral sinks, a spiral source and a
  saddle) are drawn once; a few small comets then travel along them.
  The canvas is fixed behind the whole page.
*/
(() => {
  const canvas = document.getElementById("flow");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const LINE = "102, 66, 33";                       // flyer brown
  const COMETS = ["#E88838", "#E8A858", "#C4661F"]; // logo oranges

  let w, h, dpr, S, foci, lines, comets, raf = null, last = 0;

  function field(x, y) {
    let vx = 0, vy = 0;
    for (const f of foci) {
      const dx = x - f.x, dy = y - f.y;
      const g = f.k / (dx * dx + dy * dy + 0.02);
      const a = 0.22 * Math.sign(f.s);
      vx += g * (-dy * f.s - dx * a);
      vy += g * (dx * f.s - dy * a);
    }
    return [vx, vy];
  }

  // trace one streamline from a seed, in both directions
  function trace(px, py) {
    const half = (dir) => {
      const pts = [];
      let x = px / S, y = py / S;
      for (let i = 0; i < 1400; i++) {
        const [vx, vy] = field(x, y);
        const sp = Math.hypot(vx, vy);
        if (sp < 1e-6) break;
        x += (dir * vx / sp) * (2.5 / S);
        y += (dir * vy / sp) * (2.5 / S);
        const X = x * S, Y = y * S;
        if (X < -60 || X > w + 60 || Y < -60 || Y > h + 60) break;
        // stop when winding tightly into a core
        if (foci.some(f => Math.hypot(x - f.x, y - f.y) < 0.02)) break;
        pts.push([X, Y]);
      }
      return pts;
    };
    const back = half(-1).reverse();
    return back.concat([[px, py]], half(1));
  }

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.max(w, h);

    foci = [
      { x: 0.78 * w / S, y: 0.32 * h / S, k: 1.0, s: 1.3 },
      { x: 0.16 * w / S, y: 0.74 * h / S, k: 0.9, s: -1.1 },
      { x: 0.46 * w / S, y: 0.52 * h / S, k: 0.7, s: 1.0 },
    ];

    // same number of streamlines and comets on every screen,
    // so the phone looks as rich as the desktop
    const nx = 6, ny = 6;
    lines = [];
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const px = ((i + 0.5 + 0.4 * Math.sin(i * 7 + j * 3)) / nx) * w;
        const py = ((j + 0.5 + 0.4 * Math.cos(i * 5 + j * 11)) / ny) * h;
        const pts = trace(px, py);
        if (pts.length > 120) lines.push(pts);
      }
    }

    const nc = 12;
    comets = Array.from({ length: nc }, (_, i) => newComet(i));
    paintLines();
  }

  function newComet(i) {
    const line = lines[(Math.random() * lines.length) | 0];
    return {
      line,
      i: Math.random() * line.length * 0.5,
      speed: 70 + Math.random() * 70,             // px / s
      color: COMETS[i % COMETS.length],
      tail: 110 + Math.random() * 70,              // px
    };
  }

  // static layer lives in its own canvas so each frame only draws the comets
  const bg = document.createElement("canvas");
  function paintLines() {
    bg.width = canvas.width; bg.height = canvas.height;
    const b = bg.getContext("2d");
    b.setTransform(dpr, 0, 0, dpr, 0, 0);
    b.lineWidth = 1;
    b.lineJoin = b.lineCap = "round";
    b.strokeStyle = `rgba(${LINE}, 0.16)`;
    for (const pts of lines) {
      b.beginPath();
      b.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) b.lineTo(pts[k][0], pts[k][1]);
      b.stroke();
    }
  }

  function drawComet(c) {
    const pts = c.line;
    const head = Math.floor(c.i);
    const tailPts = Math.round(c.tail / 2.5);
    ctx.lineCap = "round";
    ctx.strokeStyle = c.color;
    for (let k = 0; k < tailPts; k++) {
      const a = head - k, b = head - k - 1;
      if (b < 0 || a >= pts.length) continue;
      const t = 1 - k / tailPts;
      ctx.globalAlpha = t * t * 0.9;
      ctx.lineWidth = 0.6 + t * 1.9;
      ctx.beginPath();
      ctx.moveTo(pts[a][0], pts[a][1]);
      ctx.lineTo(pts[b][0], pts[b][1]);
      ctx.stroke();
    }
    if (head >= 0 && head < pts.length) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(pts[head][0], pts[head][1], 2.8, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bg, 0, 0, w, h);
    for (let n = 0; n < comets.length; n++) {
      const c = comets[n];
      c.i += (c.speed * dt) / 2.5;
      if (c.i > c.line.length + c.tail / 2.5) comets[n] = newComet(n);
      drawComet(comets[n]);
    }
    raf = requestAnimationFrame(frame);
  }

  function start() { if (!raf && !reduced) raf = requestAnimationFrame(frame); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }

  build();
  if (reduced) { ctx.drawImage(bg, 0, 0, w, h); return; }
  start();

  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(build, 200);
  });
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
})();
