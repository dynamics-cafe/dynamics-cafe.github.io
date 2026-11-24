/* Privacy notice: the contents list follows your reading.

   - Laptop: a pill in the contents list glides to the section you are reading, and clicking
     a section glides the page there.
   - Phone and tablet (the contents list is at the top, out of view while reading): a slim bar
     stays at the top with the current section and how far through the notice you are; tap it
     to go back to the contents. */
(function () {
  const toc = document.querySelector(".policy-toc");
  const list = toc && toc.querySelector("ol");
  const article = document.querySelector(".policy-text");
  if (!list || !article) return;

  const links = [...list.querySelectorAll("a")];
  const sections = links.map(a => document.getElementById(a.getAttribute("href").slice(1)));
  const dc = () => window.DynamicsCafe || {};
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- the pill in the contents list ---------- */

  const pill = document.createElement("span");
  pill.className = "policy-toc-pill";
  pill.setAttribute("aria-hidden", "true");
  list.prepend(pill);

  /* ---------- the bar for small screens ---------- */

  const strip = document.createElement("button");
  strip.type = "button";
  strip.className = "policy-strip";
  strip.setAttribute("aria-label", "Back to the contents");
  strip.innerHTML = `
    <span class="policy-strip-num"></span>
    <span class="policy-strip-name"></span>
    <span class="policy-strip-up" aria-hidden="true">Contents
      <svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 15l6-6 6 6"/></svg>
    </span>
    <span class="policy-strip-progress" aria-hidden="true"><span></span></span>`;
  document.querySelector(".policy").prepend(strip);
  const stripNum = strip.querySelector(".policy-strip-num");
  const stripName = strip.querySelector(".policy-strip-name");
  const stripBar = strip.querySelector(".policy-strip-progress span");

  let active = -1;

  function place(i) {
    const a = links[i];
    pill.style.height = a.offsetHeight + "px";
    pill.style.transform = `translateY(${a.getBoundingClientRect().top - list.getBoundingClientRect().top}px)`;
    links.forEach((l, k) => l.classList.toggle("is-on", k === i));
    if (i === active) return;
    active = i;
    links.forEach((l, k) => k === i ? l.setAttribute("aria-current", "location") : l.removeAttribute("aria-current"));
    stripNum.textContent = a.querySelector("span").textContent;
    stripName.textContent = a.textContent.replace(/^\s*\d+/, "").trim();
  }

  function current() {
    const doc = document.documentElement;
    // at the very bottom, the last (short) sections can never reach the top: pick the last one
    if (window.scrollY + window.innerHeight >= doc.scrollHeight - 4) return sections.length - 1;
    const line = window.innerHeight * 0.35;
    let i = 0;
    sections.forEach((s, k) => { if (s.getBoundingClientRect().top < line) i = k; });
    return i;
  }

  function update() {
    if (!dc().isGliding || !dc().isGliding()) place(current());
    // the small-screen bar: shown once the contents list is out of view, until the notice ends
    const tr = toc.getBoundingClientRect(), ar = article.getBoundingClientRect();
    strip.classList.toggle("is-shown", tr.bottom < 0 && ar.bottom > 120);
    const done = Math.min(1, Math.max(0, (window.innerHeight * 0.35 - ar.top) / ar.height));
    stripBar.style.transform = `scaleX(${done})`;
  }

  links.forEach((a, i) => a.addEventListener("click", e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    place(i);
    history.pushState(null, "", a.getAttribute("href"));
    const glide = dc().glideTo;
    if (glide) glide(sections[i], update);
    else sections[i].scrollIntoView({ behavior: calm ? "auto" : "smooth" });
  }));

  strip.addEventListener("click", () => {
    const glide = dc().glideTo;
    if (glide) glide(toc, update); else toc.scrollIntoView({ behavior: calm ? "auto" : "smooth" });
  });

  place(current());
  requestAnimationFrame(() => requestAnimationFrame(() => list.classList.add("is-ready")));
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", () => { const i = active; active = -1; place(i); update(); });
  window.addEventListener("load", update);
  if (document.fonts) document.fonts.ready.then(() => { const i = active; active = -1; place(i); });
  update();
})();
