/*
  Dynamics Cafe background: particles integrating a planar dynamical system.
  The field is a sum of spiral sinks (the swirl in the cup), one spiral
  source and a saddle, whose centres drift slowly so the phase portrait
  keeps changing. Trails are drawn by fading the canvas every frame.
*/
(() => {
  const canvas = document.getElementById("flow");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Logo colours: caramel, orange, copper, coffee
  const COLORS = ["#E8A858", "#E88838", "#C4661F", "#8A4A1C", "#664221"];

  let w, h, dpr, particles, t = 0, raf = null, visible = true, portrait = false;

  // Field lives in a unit-ish square scaled to the canvas height.
  function field(x, y, t) {
    // centres of the sinks drift on small Lissajous orbits
    const c = [
      { x: 0.68 + 0.05 * Math.sin(t * 0.21), y: 0.02 + 0.05 * Math.cos(t * 0.17), k: 1.0, s: 1.4 },
      { x: 1.32 + 0.05 * Math.cos(t * 0.19), y: -0.28 + 0.05 * Math.sin(t * 0.23), k: 0.8, s: -1.2 },
      { x: 0.05 + 0.06 * Math.sin(t * 0.15), y: 0.3 + 0.05 * Math.cos(t * 0.13), k: 0.9, s: 1.1 },
    ];
    let vx = 0, vy = 0;
    for (const p of c) {
      const dx = x - p.x, dy = y - p.y;
      const r2 = dx * dx + dy * dy + 0.03;
      const g = p.k / r2;
      // rotation (s) plus attraction/repulsion
      vx += g * (-dy * p.s - dx * 0.16 * Math.sign(p.s));
      vy += g * (dx * p.s - dy * 0.16 * Math.sign(p.s));
    }
    // saddle between the sinks: attracting along y, repelling along x
    const sx = x - 0.95, sy = y - 0.1;
    const gs = 0.5 / (sx * sx + sy * sy + 0.05);
    vx += gs * sx;
    vy -= gs * sy;
    return [vx, vy];
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    portrait = h > w;
    // same particle density per unit of the phase portrait on every screen
    const n = Math.round(Math.min(420, (90 * W() * H()) / (scale() * scale())));
    particles = Array.from({ length: n }, () => spawn({}, true));
  }

  // canvas px <-> field coords. On tall (phone) screens the same portrait is
  // rotated 90 degrees, so the composition matches the desktop one.
  const W = () => (portrait ? h : w);
  const H = () => (portrait ? w : h);
  const scale = () => Math.max(H(), W() * 0.5) * 0.75;
  const toField = (px, py) => {
    const a = portrait ? py : px, b = portrait ? px : py;
    return [a / scale() - 0.1, (b - H() / 2) / scale()];
  };

  function spawn(p, initial) {
    p.px = Math.random() * w;
    p.py = Math.random() * h;
    p.age = initial ? Math.random() * 300 : 0;
    p.life = 220 + Math.random() * 380;
    p.color = COLORS[(Math.random() * COLORS.length) | 0];
    p.width = 1.1 + Math.random() * 1.7;
    return p;
  }

  function step(dtScale) {
    // fade previous frame -> trails
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0, 0, 0, 0.045)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";

    for (const p of particles) {
      const [fx, fy] = toField(p.px, p.py);
      const [vx, vy] = field(fx, fy, t);
      const sp = Math.hypot(vx, vy) || 1;
      // follow the streamline; speed grows gently with field strength
      const v = (0.7 + Math.min(sp, 4) * 0.35) / sp;
      const dx = (portrait ? vy : vx) * v * dtScale;
      const dy = (portrait ? vx : vy) * v * dtScale;
      const nx = p.px + dx, ny = p.py + dy;

      const fade = Math.min(1, p.age / 30, (p.life - p.age) / 40);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = Math.max(0, fade);
      ctx.lineWidth = p.width;
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      p.px = nx; p.py = ny; p.age++;
      if (p.age > p.life || nx < -50 || nx > w + 50 || ny < -50 || ny > h + 50) spawn(p);
    }
    ctx.globalAlpha = 1;
  }

  function frame() {
    t += 0.016;
    step(1);
    raf = visible ? requestAnimationFrame(frame) : null;
  }

  resize();

  if (reduced) {
    // one static, fully drawn portrait
    for (let i = 0; i < 260; i++) { t += 0.016; step(1); }
    return;
  }

  // warm up so the first paint already has trails
  for (let i = 0; i < 160; i++) { t += 0.016; step(1); }
  frame();

  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { resize(); for (let i = 0; i < 120; i++) { t += 0.016; step(1); } }, 150);
  });
  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  });
})();
