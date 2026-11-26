/*
  The organisers ("baristas"), from data/organizers.json.
  - On the home page: a row of faces in the "Behind the counter" teaser.
  - On baristas.html: one card each (photo, role, affiliation, a few lines, their usual coffee, links).
  Empty fields are simply left out. Photos come from the speaker-photos release, never from the repository.
*/
(() => {
  const faces = document.getElementById("barista-faces");
  const grid = document.getElementById("barista-grid");
  if (!faces && !grid) return;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const initials = name => name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();

  // round portrait, or the person's initials until a photo is added. The photo is the element's
  // background, not an <img>: search engines don't pick background images as the site's thumbnail.
  const face = (o, cls) => o.photo
    ? `<span class="${cls} is-photo" data-src="${esc(o.photo)}"${cls === "barista-photo" ? ` role="img" aria-label="Portrait of ${esc(o.name)}"` : ""}></span>`
    : `<span class="${cls} is-initials" aria-hidden="true">${esc(initials(o.name))}</span>`;

  // show each photo once loaded; one that fails to load falls back to the initials
  const fallback = root => root.querySelectorAll(".is-photo[data-src]").forEach(holder => {
    const img = new Image();
    img.addEventListener("load", () => { holder.style.backgroundImage = `url("${img.src}")`; });
    img.addEventListener("error", () => {
      holder.classList.remove("is-photo");
      holder.classList.add("is-initials");
      holder.removeAttribute("role");
      holder.removeAttribute("aria-label");
      holder.textContent = initials(holder.closest("[data-name]")?.dataset.name || "");
    });
    img.src = holder.dataset.src;
  });

  fetch("data/organizers.json?v=20261124b")
    .then(r => r.json())
    .then(list => {
      if (faces) {
        faces.innerHTML = list.map(o => `<span data-name="${esc(o.name)}" title="${esc(o.name)}">${face(o, "barista-face")}</span>`).join("");
        fallback(faces);
      }
      if (grid) {
        grid.innerHTML = list.map(o => `
          <article class="barista" data-name="${esc(o.name)}">
            ${face(o, "barista-photo")}
            <h2>${esc(o.name)}</h2>
            <p class="barista-role">${esc(o.role)}</p>
            ${(o.affiliation || []).length ? `<p class="barista-affiliation">${o.affiliation.map(esc).join("<br>")}</p>` : ""}
            ${o.bio ? `<p class="barista-bio">${esc(o.bio)}</p>` : ""}
            ${o.coffee ? `<p class="barista-coffee"><span>Usual order</span>${esc(o.coffee)}</p>` : ""}
            ${(o.links || []).length ? `<p class="speaker-links barista-links">${o.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`).join("")}</p>` : ""}
          </article>`).join("");
        fallback(grid);
      }
    })
    .catch(() => {
      if (grid) grid.innerHTML = `<p class="muted">The team list is temporarily unavailable.</p>`;
      if (faces) faces.remove();
    });
})();
