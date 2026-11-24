/* Header links: one dark pill slides under the link of the page (or section) you are on.
   Loaded right after the header, so the pill is in place before the page is first drawn
   (which also lets the page-to-page transition move it smoothly). */
(function () {
  const links = document.querySelector("nav .links");
  if (!links) return;
  const items = [...links.querySelectorAll("a")];
  const pill = document.createElement("span");
  pill.className = "nav-pill";
  pill.setAttribute("aria-hidden", "true");
  links.prepend(pill);
  links.classList.add("has-pill");

  let active = items.find(a => a.getAttribute("aria-current") === "page") || items[0];

  function place(a) {
    pill.style.width = a.offsetWidth + "px";
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
    items.forEach(i => i.classList.toggle("is-on", i === a));
  }

  function set(a) {
    if (!a || a === active) return;
    active = a;
    place(a);
  }

  place(active);
  // the first placement must not animate
  requestAnimationFrame(() => requestAnimationFrame(() => links.classList.add("is-ready")));
  if (document.fonts) document.fonts.ready.then(() => place(active));
  window.addEventListener("resize", () => place(active));

  // Home page: the pill follows the section you are reading (Seminars / Give a talk)
  const inPage = items.filter(a => a.getAttribute("href").startsWith("#"));
  if (!inPage.length) return;
  // looked up when needed: this script runs before the rest of the page exists
  const sections = () => inPage.map(a => [a, document.getElementById(a.getAttribute("href").slice(1))]).filter(([, s]) => s);
  let hold = 0;

  function spy() {
    if (Date.now() < hold) return;
    const list = sections();
    if (!list.length) return;
    let current = list[0][0];
    for (const [a, s] of list) if (s.getBoundingClientRect().top < window.innerHeight * 0.45) current = a;
    set(current);
  }

  inPage.forEach(a => a.addEventListener("click", () => {
    set(a);
    hold = Date.now() + 1200;            // let the smooth scroll finish before following again
  }));
  window.addEventListener("scrollend", () => { hold = 0; spy(); });
  window.addEventListener("scroll", spy, { passive: true });
  window.addEventListener("load", spy);
  if (location.hash) {
    const a = inPage.find(i => i.getAttribute("href") === location.hash);
    if (a) { active = a; place(a); }
  }
})();
