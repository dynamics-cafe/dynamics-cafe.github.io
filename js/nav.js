/* The site header, written once for every page.

   Each page has an empty placeholder right after <body>, followed by this script:

     <header class="site-header" id="site-header"></header>
     <script src="js/nav.js?v=..." data-page="seminars"></script>

   (data-page is "seminars" for the home page, "baristas" for the team page). The script runs
   before the rest of the page is drawn, so the header never flickers in. To add a link or change
   the header, edit only this file.

   What it does:
   - one dark pill slides under the link of the page (or, on the home page, the section) you are on;
   - after you scroll past the header, a slim copy of it stays at the top of the window
     (on phones it hides while you scroll down and comes back as soon as you scroll up);
   - links to the other page fade the content out and the pill glides on to its new place;
   - links within the page scroll there gently. */
(function () {
  const script = document.currentScript;
  const page = (script && script.dataset.page) || "seminars";
  const home = page === "seminars";
  const header = document.getElementById("site-header");
  if (!header) return;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = () => window.matchMedia("(max-width: 650px)").matches;

  // Christmas decorations (js/season.js), when in season
  const xmas = f => !!(window.DynamicsCafeSeason && window.DynamicsCafeSeason.has(f));

  const LINKS = [
    { key: "seminars", label: "Seminars",    href: home ? "#seminars" : "./" },
    { key: "talk",     label: "Give a talk", href: home ? "#contact" : "./#contact" },
    { key: "baristas", label: "Baristas",    href: "baristas.html" }
  ];

  header.innerHTML = `
    <div class="header-bar">
      <div class="container">
        <nav aria-label="Main">
          <a class="logo" href="./">
            <img src="${xmas("logo") ? "img/xmas/logo-512.webp" : "img/logo-512.webp"}" alt="" class="nav-logo" width="512" height="501">
            <span>Dynamics Cafe<small>Seminar Group</small></span>
          </a>
          <div class="nav-right">
            <div class="links has-pill">
              <span class="nav-pill" aria-hidden="true"></span>
              <span class="nav-hat" aria-hidden="true"><i></i></span>
              ${LINKS.map(l => `<a href="${l.href}" data-key="${l.key}"${l.key === page ? ' aria-current="page"' : ""}>${l.label}</a>`).join("")}
            </div>
            <a class="nav-icon" href="https://www.linkedin.com/company/dynamics-cafe/" target="_blank" rel="noopener noreferrer"
               aria-label="Dynamics Cafe on LinkedIn" title="Dynamics Cafe on LinkedIn">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.7V21h-4z"/></svg>
            </a>
          </div>
        </nav>
      </div>
    </div>`;

  const bar = header.querySelector(".header-bar");
  const links = header.querySelector(".links");
  const pill = header.querySelector(".nav-pill");
  // the Christmas hat (js/season.js) is its own element: it rides on the pill and glides with it,
  // and on pages without a pill it rests on the outer bar, at the same height (no jump)
  const hat = header.querySelector(".nav-hat");
  const hatAt = x => { hat.style.transform = `translateX(${x}px)`; };
  const items = [...links.querySelectorAll("a")];
  // pages without their own link (e.g. the privacy notice) have no pill
  let active = items.find(a => a.dataset.key === page) || null;

  /* ---------- the sliding pill ---------- */

  function place(a) {
    pill.classList.toggle("is-off", !a);
    items.forEach(i => i.classList.toggle("is-on", i === a));
    hatAt(a ? a.offsetLeft : 0);
    if (!a) return;
    pill.style.width = a.offsetWidth + "px";
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
  }

  function set(a) {
    if (!a || a === active) return;
    active = a;
    place(a);
  }

  if (home && location.hash === "#contact") active = items[1];

  // Arriving from the other page: start the pill where it was there, then let it glide
  let from = null;
  try {
    from = JSON.parse(sessionStorage.getItem("navFrom") || "null");
    sessionStorage.removeItem("navFrom");
  } catch (e) { /* storage blocked: no glide */ }
  const arriving = !calm && from && Date.now() - from.t < 4000;

  if (arriving) {
    document.documentElement.classList.add("is-arriving");
    if (from.index < 0) {
      // coming from a page without a pill: it fades in where it belongs
      place(active);
      pill.classList.add("is-off");
      hatAt(0);                               // the hat starts where it rested on the outer bar
    } else {
      pill.style.width = from.width + "px";
      pill.style.transform = `translateX(${from.left}px)`;
      items.forEach(i => i.classList.toggle("is-on", i === items[from.index]));
      hatAt(from.left);
      if (!active) pill.classList.remove("is-off");   // fades out from where it was
    }
  } else {
    place(active);
  }

  requestAnimationFrame(() => requestAnimationFrame(() => {
    links.classList.add("is-ready");          // from now on, moves are animated
    if (arriving) place(active);
  }));
  // once the web font is in, widths can change slightly (not before the glide has started)
  if (document.fonts) document.fonts.ready.then(() => { if (links.classList.contains("is-ready")) place(active); });
  window.addEventListener("resize", () => { measure(); place(active); });

  /* ---------- leaving for the other page ---------- */

  function samePage(a) {
    const path = p => p.replace(/index\.html$/, "");
    return path(a.pathname) === path(location.pathname);
  }

  // any link to another page of the site (header, footer, cards)
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.origin !== location.origin || a.target || a.hasAttribute("download")) return;
    if (samePage(a)) return;                 // links within the page: gentle scroll, below
    if (calm) return;
    e.preventDefault();
    // the content fades out; the next page then slides the pill over in one movement
    try {
      sessionStorage.setItem("navFrom", JSON.stringify(active
        ? { left: active.offsetLeft, width: active.offsetWidth, index: items.indexOf(active), t: Date.now() }
        : { index: -1, t: Date.now() }));
    } catch (err) { /* fine: no glide */ }
    document.documentElement.classList.add("is-leaving");
    setTimeout(() => { location.href = a.href; }, 300);
  });

  // Coming back with the browser's Back button can restore the faded-out page: undo the fade
  window.addEventListener("pageshow", e => {
    if (e.persisted) {
      document.documentElement.classList.remove("is-leaving");
      active = items.find(a => a.dataset.key === page) || null;
      place(active);
    }
  });

  /* ---------- the header that stays at the top ---------- */

  let fullHeight = 0, floating = false, hidden = false, lastY = window.scrollY, scrolling = false;
  let quietUntil = 2500;                     // the page may still be jumping into place: no hiding yet

  function measure() {
    if (floating) return;
    header.style.height = "";
    fullHeight = header.offsetHeight;
    header.style.height = fullHeight + "px";   // keeps the page still when the bar starts floating
  }

  function onScroll() {
    const y = window.scrollY;
    if (!floating && y > fullHeight + 30) {
      floating = true;
      header.classList.add("is-floating");
      document.documentElement.style.setProperty("--bar-height", bar.offsetHeight + "px");
      place(active);
    } else if (floating && y < fullHeight) {
      floating = false;
      header.classList.remove("is-floating", "is-hidden");
      hidden = false;
      place(active);
    }
    // phones: out of the way while reading down, back as soon as you scroll up
    if (floating && phone() && performance.now() - quietUntil > 0) {
      const dy = y - lastY;
      if (dy > 6 && !hidden && !scrolling) { hidden = true; header.classList.add("is-hidden"); }
      else if (dy < -6 && hidden) { hidden = false; header.classList.remove("is-hidden"); }
    }
    lastY = y;
  }

  measure();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("load", () => { measure(); onScroll(); });

  /* ---------- gentle scrolling within the page ---------- */

  function offsetTop() {
    return parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  }

  function glideTo(target, onDone) {
    const start = window.scrollY;
    const end = Math.max(0, Math.min(
      target ? target.getBoundingClientRect().top + start - offsetTop() : 0,
      document.documentElement.scrollHeight - window.innerHeight));
    const distance = end - start;
    if (calm || Math.abs(distance) < 2) { window.scrollTo({ top: end, behavior: "instant" }); onDone(); return; }
    const duration = Math.min(1300, 650 + Math.abs(distance) * 0.25);
    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const t0 = performance.now();
    scrolling = true;
    let cancelled = false;
    const cancel = () => { cancelled = true; };
    window.addEventListener("wheel", cancel, { once: true, passive: true });
    window.addEventListener("touchstart", cancel, { once: true, passive: true });
    (function step(now) {
      if (cancelled) { scrolling = false; onDone(); return; }
      const t = Math.min(1, (now - t0) / duration);
      window.scrollTo({ top: start + distance * ease(t), behavior: "instant" });
      if (t < 1) requestAnimationFrame(step);
      else { scrolling = false; onDone(); }
    })(t0);
  }

  // shared with other scripts (e.g. the contents list of the privacy notice)
  window.DynamicsCafe = Object.assign(window.DynamicsCafe || {}, { glideTo, isGliding: () => scrolling });

  // The home page: the pill follows the section you are reading
  const inPage = items.filter(a => a.getAttribute("href").startsWith("#"));
  const sections = () => inPage
    .map(a => [a, document.getElementById(a.getAttribute("href").slice(1))])
    .filter(([, s]) => s);

  function spy() {
    if (scrolling) return;
    const list = sections();
    if (!list.length) return;
    let current = list[0][0];
    for (const [a, s] of list) if (s.getBoundingClientRect().top < window.innerHeight * 0.45) current = a;
    set(current);
  }

  inPage.forEach(a => a.addEventListener("click", e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = a.getAttribute("href").slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    set(a);
    history.pushState(null, "", id === "seminars" ? location.pathname : "#" + id);
    glideTo(id === "seminars" ? null : target, spy);
  }));

  if (inPage.length) {
    window.addEventListener("scroll", spy, { passive: true });
    window.addEventListener("load", spy);
  }
})();
