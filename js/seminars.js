const SEMINARS_FILE = "data/seminars.json";

// Convert a wall-clock time in an IANA zone (e.g. 14:00 Europe/Rome) to a
// real instant, so daylight-saving changes are always handled correctly.
function zonedToDate(dateStr, timeStr, timeZone) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const wanted = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wanted;

  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric", month: "numeric", day: "numeric",
        hour: "numeric", minute: "numeric"
      }).formatToParts(new Date(guess)).map(p => [p.type, p.value])
    );
    const shown = Date.UTC(
      +parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute
    );
    guess += wanted - shown;
  }

  return new Date(guess);
}

// Fill a portrait frame with any image: cover the frame, zoom around the face, keep the face a
// little above centre, and never leave empty edges.
function fitPortrait(frame, img) {
  if (!img.naturalWidth) return;
  const [fx, fy] = (frame.dataset.focus || "50% 35%").split(/\s+/).map(v => parseFloat(v) / 100);
  const zoom = Math.max(1, parseFloat(frame.dataset.zoom) || 1);
  const bw = frame.clientWidth, bh = frame.clientHeight;
  const s = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * zoom;
  const w = img.naturalWidth * s, h = img.naturalHeight * s;
  const left = Math.min(0, Math.max(bw - w, bw / 2 - fx * w));
  const top = Math.min(0, Math.max(bh - h, bh * 0.42 - fy * h));
  Object.assign(img.style, {
    position: "absolute", width: w + "px", height: h + "px",
    left: left + "px", top: top + "px", maxWidth: "none"
  });
}

function formatTimeRange(start, minutes, timeZone) {
  const end = new Date(start.getTime() + minutes * 60000);
  const hm = {
    timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  };
  const f = new Intl.DateTimeFormat("en-GB", hm);
  const zoneName = (locale) => new Intl.DateTimeFormat(locale, {
    timeZone, timeZoneName: "short"
  }).formatToParts(start).find(p => p.type === "timeZoneName").value;
  // prefer real abbreviations (CEST, EDT, BST) over "GMT+2"
  let zone = zoneName("en-US");
  if (/^(GMT|UTC)/.test(zone)) zone = zoneName("en-GB");
  return `${f.format(start)}–${f.format(end)} ${zone}`;
}

async function loadNextSeminar() {
  const container = document.getElementById("next-seminar");

  if (!container) return;

  try {
    const response = await fetch(SEMINARS_FILE, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Could not load seminar data");
    }

    const seminars = await response.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextSeminar = seminars
      .filter(seminar => {
        const date = new Date(`${seminar.date}T00:00:00`);
        return date >= today;
      })
      .sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
      })[0];


    if (!nextSeminar) {
      container.innerHTML = `
        <p class="muted">Next seminar</p>

        <h3>Coming soon</h3>

        <p>
          Details of the next Dynamics Cafe seminar
          will appear here shortly.
        </p>

        <p class="muted">
          Seminars take place on the second Friday of every month
          at 14:00 Europe/Rome Time.
        </p>
      `;

      return;
    }


    const tz = nextSeminar.timezone || "Europe/Rome";
    const minutes = nextSeminar.duration_minutes || 60;
    const hasTime = /^\d{1,2}:\d{2}$/.test(nextSeminar.time || "");
    const start = zonedToDate(nextSeminar.date, hasTime ? nextSeminar.time : "00:00", tz);

    const date = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    }).format(start);

    const cityName = tz.split("/").pop().replace(/_/g, " ");
    let timeLine = "";

    if (hasTime) {
      const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const main = `${formatTimeRange(start, minutes, tz)} (${cityName} time)`;
      let local = "";

      if (localTz && localTz !== tz) {
        const sameDay = new Intl.DateTimeFormat("en-GB", { timeZone: localTz, dateStyle: "short" }).format(start)
          === new Intl.DateTimeFormat("en-GB", { timeZone: tz, dateStyle: "short" }).format(start);
        const localDay = sameDay ? "" : new Intl.DateTimeFormat("en-GB", {
          timeZone: localTz, weekday: "short", day: "numeric", month: "short"
        }).format(start) + ", ";
        local = `<br><span class="muted">Your local time: ${localDay}${formatTimeRange(start, minutes, localTz)}</span>`;
      }

      timeLine = `<br>${main}${local}`;
    }

    // optional portrait: any image shape works. "photo_focus" is where the face is (% of the image),
    // "photo_zoom" zooms in around it; the frame is always filled, never left empty.
    const photo = nextSeminar.photo
      ? `<div class="speaker-photo" data-focus="${nextSeminar.photo_focus || "50% 35%"}" data-zoom="${nextSeminar.photo_zoom || 1}"><img src="${nextSeminar.photo}" alt="Portrait of ${nextSeminar.speaker}" loading="lazy" decoding="async"></div>`
      : "";

    // profile links supplied by the speaker (Google Scholar, ResearchGate, website, ...)
    const links = (nextSeminar.speaker_links || []).filter(l => l && l.url);
    const speakerLinks = links.length
      ? `<span class="speaker-links">${links.map(l =>
          `<a href="${l.url}" target="_blank" rel="noopener noreferrer">${l.label}</a>`
        ).join("")}</span>`
      : "";

    // abstract: blank lines in the JSON text become separate paragraphs
    const abstractBlock = nextSeminar.abstract
      ? `<section class="abstract" aria-label="Abstract">
           <p class="abstract-label">Abstract</p>
           <div class="abstract-body">
             ${String(nextSeminar.abstract).split(/\n\s*\n/).map(t => `<p class="abstract-text">${t.trim()}</p>`).join("")}
           </div>
         </section>`
      : "";

    const joinButton =
      nextSeminar.meeting_url &&
      !nextSeminar.meeting_url.startsWith("REPLACE")
        ? `
          <div class="buttons">
            <a
              class="button"
              href="${nextSeminar.meeting_url}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Join the seminar →
            </a>
          </div>
        `
        : "";


    container.innerHTML = `

      <p class="muted">
        Next seminar
      </p>

      <h3>
        ${nextSeminar.title}
      </h3>

      <div class="event-grid${abstractBlock ? " has-abstract" : ""}">
      <div class="event-main">

      <div class="event-who">
      <div class="speaker${photo ? " has-photo" : ""}">
        ${photo}
        <p class="speaker-info">
          <strong>${nextSeminar.speaker}</strong>
          <span>${nextSeminar.affiliation}</span>
        </p>
      </div>
      ${speakerLinks}
      </div>

      <div class="event-when">
      <p>
        <strong>${date}</strong>${timeLine}
      </p>

      ${joinButton}

      <p class="meeting-note">
        The meeting link changes for each seminar.
        This page always points to the current one.
      </p>
      </div>

      </div>

      ${abstractBlock}
      </div>
    `;

    // portrait: fit to the frame once loaded (and on resize); drop the frame if the file fails to load
    const frames = [...container.querySelectorAll(".speaker-photo")];
    frames.forEach(frame => {
      const img = frame.querySelector("img");
      const place = () => fitPortrait(frame, img);
      img.addEventListener("load", place);
      if (img.complete && img.naturalWidth) place();
      img.addEventListener("error", () => {
        const speaker = frame.closest(".speaker");
        frame.remove();
        if (speaker) speaker.classList.remove("has-photo");
      });
    });
    if (frames.length) {
      window.addEventListener("resize", () =>
        frames.forEach(f => f.isConnected && fitPortrait(f, f.querySelector("img")))
      );
    }

  } catch (error) {

    console.error(error);

    container.innerHTML = `
      <p class="muted">
        Seminar information is temporarily unavailable.
      </p>
    `;
  }
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function pastCard(seminar) {
  const tz = seminar.timezone || "Europe/Rome";
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).format(new Date(`${seminar.date}T12:00:00`));

  const photo = seminar.photo
    ? `<div class="past-photo" data-focus="${escapeHtml(seminar.photo_focus || "50% 35%")}" data-zoom="${escapeHtml(seminar.photo_zoom || 1)}"><img src="${escapeHtml(seminar.photo)}" alt="" decoding="async"></div>`
    : "";

  const keywords = Array.isArray(seminar.keywords) && seminar.keywords.length
    ? `<p class="past-keywords">${seminar.keywords.map(k => `<span>${escapeHtml(k)}</span>`).join("")}</p>`
    : "";

  // links: whatever the speaker shared, plus the recording and slides if we have them
  const links = [
    ...(seminar.recording_url ? [{ label: "Watch the recording", url: seminar.recording_url }] : []),
    ...(seminar.slides_url ? [{ label: "Slides", url: seminar.slides_url }] : []),
    ...(seminar.speaker_links || [])
  ].filter(l => l && l.url);

  const linkRow = links.length
    ? `<p class="past-links">${links.map(l =>
        `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`
      ).join("")}</p>`
    : "";

  const abstract = seminar.abstract
    ? `<div class="past-abstract-wrap">
         <p class="past-abstract">${escapeHtml(seminar.abstract)}</p>
         <button class="past-more" type="button" aria-expanded="false" hidden>Read the full abstract</button>
       </div>`
    : "";

  return `
    <article class="past-card">
      <p class="past-date">${escapeHtml(date)}</p>
      <h3>${escapeHtml(seminar.title)}</h3>

      <div class="past-speaker${photo ? " has-photo" : ""}">
        ${photo}
        <p>
          <strong>${escapeHtml(seminar.speaker)}</strong>
          ${seminar.affiliation ? `<span>${escapeHtml(seminar.affiliation)}</span>` : ""}
        </p>
      </div>

      ${abstract}
      ${keywords}
      ${linkRow}
    </article>
  `;
}

function setupCarousel(section, track) {
  const buttons = [...section.querySelectorAll(".carousel-btn")];
  const controls = section.querySelector(".carousel-controls");

  const step = () => {
    const card = track.querySelector(".past-card");
    return card ? card.getBoundingClientRect().width + 20 : track.clientWidth;
  };

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const scrollable = max > 4;
    controls.hidden = !scrollable;
    buttons[0].disabled = track.scrollLeft <= 4;
    buttons[1].disabled = track.scrollLeft >= max - 4;
    // soft fades on the edges that still have cards beyond them
    track.classList.toggle("fade-left", scrollable && track.scrollLeft > 4);
    track.classList.toggle("fade-right", scrollable && track.scrollLeft < max - 4);
  };

  buttons.forEach(btn =>
    btn.addEventListener("click", () =>
      track.scrollBy({ left: Number(btn.dataset.dir) * step(), behavior: "smooth" })
    )
  );

  track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  window.addEventListener("resize", update);
  track.addEventListener("keydown", event => {
    if (event.key === "ArrowRight") { track.scrollBy({ left: step(), behavior: "smooth" }); event.preventDefault(); }
    if (event.key === "ArrowLeft") { track.scrollBy({ left: -step(), behavior: "smooth" }); event.preventDefault(); }
  });

  update();
}

function setupAbstracts(track) {
  track.querySelectorAll(".past-abstract-wrap").forEach(wrap => {
    const text = wrap.querySelector(".past-abstract");
    const button = wrap.querySelector(".past-more");
    if (!text || !button) return;

    const measure = () => {
      if (wrap.classList.contains("is-open")) return;
      button.hidden = text.scrollHeight <= text.clientHeight + 2;
    };

    button.addEventListener("click", () => {
      const open = wrap.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(open));
      button.textContent = open ? "Show less" : "Read the full abstract";
      button.hidden = false;
    });

    measure();
    window.addEventListener("resize", measure);
  });
}

async function loadPastSeminars() {
  const section = document.getElementById("past");
  const track = document.getElementById("past-seminars");

  if (!section || !track) return;

  try {
    const response = await fetch(SEMINARS_FILE, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Could not load seminar archive");
    }

    const seminars = await response.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastSeminars = seminars
      .filter(seminar => new Date(`${seminar.date}T00:00:00`) < today)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // nothing to show yet: keep the whole archive section out of the page
    if (pastSeminars.length === 0) return;

    track.innerHTML = pastSeminars.map(pastCard).join("");
    section.hidden = false;

    // portraits: same fitting logic as the seminar card; drop the frame if a file fails to load
    track.querySelectorAll(".past-photo").forEach(frame => {
      const img = frame.querySelector("img");
      const place = () => fitPortrait(frame, img);
      img.addEventListener("load", place);
      if (img.complete && img.naturalWidth) place();
      img.addEventListener("error", () => {
        const speaker = frame.closest(".past-speaker");
        frame.remove();
        if (speaker) speaker.classList.remove("has-photo");
      });
      window.addEventListener("resize", () => frame.isConnected && fitPortrait(frame, img));
    });

    setupAbstracts(track);
    setupCarousel(section, track);

  } catch (error) {
    console.error(error);
  }
}

loadNextSeminar();
loadPastSeminars();
