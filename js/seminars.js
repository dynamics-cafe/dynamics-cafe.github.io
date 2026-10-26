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

// "14:00–15:00" in the given zone, without any zone name
function formatClockRange(start, minutes, timeZone) {
  const end = new Date(start.getTime() + minutes * 60000);
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  });
  return `${f.format(start)}–${f.format(end)}`;
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

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// "9 October 2026", for the label above the cards
function shortDate(seminar) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: seminar.timezone || "Europe/Rome", day: "numeric", month: "long", year: "numeric"
  }).format(new Date(`${seminar.date}T12:00:00`));
}

// The series meets on the second Friday of every month. Used to show a planned date
// while the next seminar is not in the data file yet.
function secondFriday(year, month) {
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return 1 + ((5 - firstDay + 7) % 7) + 7;
}

function plannedDate(today) {
  const pad = n => String(n).padStart(2, "0");
  for (let step = 0; step < 3; step++) {
    const probe = new Date(today.getFullYear(), today.getMonth() + step, 1);
    const day = secondFriday(probe.getFullYear(), probe.getMonth());
    const candidate = new Date(probe.getFullYear(), probe.getMonth(), day);
    if (candidate >= today) return `${probe.getFullYear()}-${pad(probe.getMonth() + 1)}-${pad(day)}`;
  }
  return null;
}

// "14:00–15:00 CET (Rome time)" plus, for visitors elsewhere, their own local time.
function timeLines(start, minutes, tz, withLocal) {
  // the series always speaks in "Europe/Rome Time", so the label never changes with summer/winter time
  let out = `<br>${formatClockRange(start, minutes, tz)} ${tz.replace(/_/g, " ")} Time`;

  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (withLocal && localTz && localTz !== tz) {
    const day = z => new Intl.DateTimeFormat("en-GB", { timeZone: z, dateStyle: "short" }).format(start);
    const localDay = day(localTz) === day(tz) ? "" : new Intl.DateTimeFormat("en-GB", {
      timeZone: localTz, weekday: "short", day: "numeric", month: "short"
    }).format(start) + ", ";
    out += `<br><span class="muted">Your local time: ${localDay}${formatTimeRange(start, minutes, localTz)}</span>`;
  }
  return out;
}

const DATE_LONG = { weekday: "long", day: "numeric", month: "long", year: "numeric" };

// Affiliation as on the LinkedIn cards: one line each for the unit, the institution (with its
// acronym) and "City, Country". A list in the JSON gives one line per entry; plain text still works.
function affiliationLines(affiliation) {
  const lines = Array.isArray(affiliation) ? affiliation : [affiliation];
  return lines.filter(Boolean).map(escapeHtml).join("<br>");
}

// One seminar, drawn as a card. `past` switches off the join button and local-time lines.
function seminarCard(seminar, past) {
  const tz = seminar.timezone || "Europe/Rome";
  const minutes = seminar.duration_minutes || 60;
  const hasTime = /^\d{1,2}:\d{2}$/.test(seminar.time || "");
  const start = zonedToDate(seminar.date, hasTime ? seminar.time : "00:00", tz);

  const date = new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...DATE_LONG }).format(start);

  const timeLine = hasTime ? timeLines(start, minutes, tz, !past) : "";

  // optional portrait: any image shape works. "photo_focus" is where the face is (% of the image),
  // "photo_zoom" zooms in around it; the frame is always filled, never left empty.
  const photo = seminar.photo
    ? `<div class="speaker-photo" data-focus="${escapeHtml(seminar.photo_focus || "50% 35%")}" data-zoom="${escapeHtml(seminar.photo_zoom || 1)}"><img src="${escapeHtml(seminar.photo)}" alt="Portrait of ${escapeHtml(seminar.speaker)}" decoding="async"></div>`
    : "";

  // links: whatever the speaker shared, plus the recording and slides when we have them
  const links = [
    ...(past && seminar.recording_url ? [{ label: "Watch the recording", url: seminar.recording_url }] : []),
    ...(past && seminar.slides_url ? [{ label: "Slides", url: seminar.slides_url }] : []),
    ...(seminar.speaker_links || [])
  ].filter(l => l && l.url);

  const speakerLinks = links.length
    ? `<span class="speaker-links">${links.map(l =>
        `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`
      ).join("")}</span>`
    : "";

  const keywords = Array.isArray(seminar.keywords) && seminar.keywords.length
    ? `<p class="keyword-chips">${seminar.keywords.map(k => `<span>${escapeHtml(k)}</span>`).join("")}</p>`
    : "";

  // abstract: blank lines in the JSON text become separate paragraphs
  const abstractBlock = seminar.abstract
    ? `<section class="abstract" aria-label="Abstract">
         <p class="abstract-label">Abstract</p>
         <div class="abstract-body">
           ${String(seminar.abstract).split(/\n\s*\n/).map(t => `<p class="abstract-text">${escapeHtml(t.trim())}</p>`).join("")}
         </div>
       </section>`
    : "";

  const canJoin = !past && seminar.meeting_url && !seminar.meeting_url.startsWith("REPLACE");
  const joinButton = canJoin
    ? `<div class="buttons">
         <a class="button" href="${escapeHtml(seminar.meeting_url)}" target="_blank" rel="noopener noreferrer">Join the seminar →</a>
       </div>`
    : "";

  const note = past
    ? ""
    : `<p class="meeting-note">
         The meeting link changes for each seminar.
         This page always points to the current one.
       </p>`;

  return `
    <p class="muted">${past ? "Past seminar" : "Next seminar"}</p>

    <h3>${escapeHtml(seminar.title)}</h3>

    <div class="event-grid${abstractBlock ? " has-abstract" : ""}">
      <div class="event-main">

        <div class="event-who">
          <div class="speaker${photo ? " has-photo" : ""}">
            ${photo}
            <p class="speaker-info">
              <strong>${escapeHtml(seminar.speaker)}</strong>
              <span>${affiliationLines(seminar.affiliation)}</span>
            </p>
          </div>
          ${speakerLinks}
          ${keywords}
        </div>

        <div class="event-when">
          <p><strong>${escapeHtml(date)}</strong>${timeLine}</p>
          ${joinButton}
          ${note}
        </div>

      </div>

      ${abstractBlock}
    </div>
  `;
}

// portraits: fit to the frame once loaded (and on resize); drop the frame if the file fails to load
function hydratePortraits(root) {
  root.querySelectorAll(".speaker-photo").forEach(frame => {
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
}

// One swipeable strip: past seminars, the next seminar (shown first), upcoming ones, then "Brewing".
function setupDeck(track, home) {
  const bar = document.getElementById("deck-bar");
  const prev = document.getElementById("deck-prev");
  const next = document.getElementById("deck-next");
  const prevLabel = document.getElementById("deck-prev-label");
  const nextLabel = document.getElementById("deck-next-label");
  const status = document.getElementById("deck-status");   // kind ("Next seminar") over the date
  const dots = document.getElementById("deck-dots");
  const slides = [...track.querySelectorAll(".deck-slide")];
  const last = slides.length - 1;
  const start = Math.max(0, slides.indexOf(home));
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const current = () => {
    let best = 0;
    slides.forEach((s, i) => {
      if (Math.abs(s.offsetLeft - track.scrollLeft) < Math.abs(slides[best].offsetLeft - track.scrollLeft)) best = i;
    });
    return best;
  };

  const fitHeight = () => {
    track.style.height = slides[current()].offsetHeight + "px";
  };

  const goTo = (i, smooth = true) => {
    const target = Math.max(0, Math.min(last, i));
    track.scrollTo({ left: slides[target].offsetLeft, behavior: smooth && !calm ? "smooth" : "auto" });
  };

  const update = () => {
    const i = current();
    const { kind = "Next seminar", date = "" } = slides[i].dataset;
    status.innerHTML = `<span class="deck-kind">${escapeHtml(kind)}</span>` +
      (date ? `<span class="deck-date">${escapeHtml(date)}</span>` : "");
    dots.querySelectorAll("button").forEach((d, k) => d.setAttribute("aria-current", k === i ? "true" : "false"));
    prev.disabled = i <= 0;
    next.disabled = i >= last;
    prevLabel.textContent = i === start ? "Past seminars" : "Earlier";
    nextLabel.textContent = i === start ? "Upcoming" : "Later";
    fitHeight();
  };

  if (slides.length > 1) {
    bar.hidden = false;
    track.closest(".seminar-deck").classList.add("has-bar");
    dots.hidden = false;
    dots.innerHTML = slides.map((s, k) =>
      `<button type="button" aria-label="${escapeHtml(s.dataset.kind + (s.dataset.date ? ", " + s.dataset.date : ""))}"></button>`
    ).join("");
    dots.querySelectorAll("button").forEach((d, k) => d.addEventListener("click", () => goTo(k)));
    prev.addEventListener("click", () => goTo(current() - 1));
    next.addEventListener("click", () => goTo(current() + 1));
    track.addEventListener("keydown", event => {
      if (event.key === "ArrowLeft") { goTo(current() - 1); event.preventDefault(); }
      if (event.key === "ArrowRight") { goTo(current() + 1); event.preventDefault(); }
    });
    track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  }

  window.addEventListener("resize", () => {
    track.scrollTo({ left: slides[current()].offsetLeft, behavior: "auto" });
    update();
  });
  if ("ResizeObserver" in window) {
    const watcher = new ResizeObserver(fitHeight);
    slides.forEach(s => watcher.observe(s));
  }

  // start on the next seminar: past ones wait on its left, upcoming ones on its right
  goTo(start, false);
  update();
  requestAnimationFrame(() => {
    goTo(start, false);
    update();
    track.classList.add("ready");
  });
}

// The "Brewing..." card: the next free slot (second Friday at 14:00 Rome) after `after`,
// shown after the last seminar we have announced.
function brewingCard(after, isNext) {
  const planned = plannedDate(after);
  let when = "", label = "";

  if (planned) {
    const start = zonedToDate(planned, "14:00", "Europe/Rome");
    const date = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", ...DATE_LONG }).format(start);
    label = shortDate({ date: planned });
    when = `
      <div class="planned">
        <p class="planned-label">Save the date</p>
        <p><strong>${escapeHtml(date)}</strong>${timeLines(start, 60, "Europe/Rome", true)}</p>
      </div>
    `;
  }

  const html = `
    <p class="muted">${isNext ? "Next seminar" : "Upcoming seminar"}</p>

    <div class="brew">
      <div class="brew-figure">
        <div class="brew-art" aria-hidden="true"></div>
        <p class="brew-caption" aria-hidden="true"></p>
      </div>

      <div class="brew-text">
        <h3 class="brewing">Brewing<span class="brew-dots"><i>.</i><i>.</i><i>.</i></span></h3>
        <p class="brew-lead">${isNext ? "The next talk" : "The talk after that"} is on its way. Speaker and title will be announced here shortly.</p>
        ${when}
      </div>
    </div>

    <p class="muted brew-note">
      Seminars take place on the second Friday of every month
      at 14:00 Europe/Rome Time.
    </p>
  `;
  return { html, label };
}

async function loadSeminars() {
  const nextCard = document.getElementById("next-seminar");
  const track = document.getElementById("deck-track");

  if (!nextCard || !track) return;

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

    const day = seminar => new Date(`${seminar.date}T00:00:00`);

    const upcoming = seminars
      .filter(seminar => day(seminar) >= today)
      .sort((a, b) => day(a) - day(b));
    const [nextSeminar, ...laterSeminars] = upcoming;

    const pastSeminars = seminars
      .filter(seminar => day(seminar) < today)
      .sort((a, b) => day(a) - day(b));          // oldest first, so the latest sits next to "Next"

    // the free slot after the last announced seminar (or after today, if none is announced)
    const lastAnnounced = upcoming.length ? day(upcoming[upcoming.length - 1]) : null;
    const after = lastAnnounced
      ? new Date(lastAnnounced.getFullYear(), lastAnnounced.getMonth(), lastAnnounced.getDate() + 1)
      : today;
    const brewing = brewingCard(after, !nextSeminar);

    const slide = (seminar, kind, past) =>
      `<article class="event deck-slide${past ? " past-slide" : ""}" data-kind="${kind}" data-date="${escapeHtml(shortDate(seminar))}">${seminarCard(seminar, past)}</article>`;

    nextCard.dataset.kind = "Next seminar";
    if (nextSeminar) {
      nextCard.innerHTML = seminarCard(nextSeminar, false);
      nextCard.dataset.date = shortDate(nextSeminar);
      nextCard.insertAdjacentHTML("afterend",
        laterSeminars.map(seminar => slide(seminar, "Upcoming seminar", false)).join("") +
        `<div class="event deck-slide" data-kind="Upcoming seminar" data-date="${escapeHtml(brewing.label)}">${brewing.html}</div>`
      );
    } else {
      nextCard.innerHTML = brewing.html;
      nextCard.dataset.date = brewing.label;
    }

    nextCard.insertAdjacentHTML("beforebegin", pastSeminars.map(seminar => slide(seminar, "Past seminar", true)).join(""));

    hydratePortraits(track);
    window.addEventListener("resize", () =>
      track.querySelectorAll(".speaker-photo").forEach(f => fitPortrait(f, f.querySelector("img")))
    );
    setupDeck(track, nextCard);
    if (window.BrewDoodle) track.querySelectorAll(".brew-art").forEach(art => window.BrewDoodle.mount(art));

  } catch (error) {

    console.error(error);

    nextCard.innerHTML = `
      <p class="muted">
        Seminar information is temporarily unavailable.
      </p>
    `;
  }
}

loadSeminars();
