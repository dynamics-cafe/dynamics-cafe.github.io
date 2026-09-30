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

      <p>
        <strong>${nextSeminar.speaker}</strong><br>
        ${nextSeminar.affiliation}
      </p>

      <p>
        <strong>${date}</strong>${timeLine}
      </p>

      ${joinButton}

      <p class="meeting-note">
        The meeting link changes for each seminar.
        This page always points to the current one.
      </p>
    `;

  } catch (error) {

    console.error(error);

    container.innerHTML = `
      <p class="muted">
        Seminar information is temporarily unavailable.
      </p>
    `;
  }
}

async function loadPastSeminars() {
  const container = document.getElementById("past-seminars");

  if (!container) return;

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
      .filter(seminar => {
        const date = new Date(`${seminar.date}T00:00:00`);
        return date < today;
      })
      .sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });

    if (pastSeminars.length === 0) {
      container.innerHTML = `
        <p class="muted">
          No past seminars yet — Dynamics Cafe is just getting started.
        </p>
      `;
      return;
    }

    const list = document.createElement("div");
    list.className = "seminar-list";

    pastSeminars.forEach(seminar => {
      const item = document.createElement("article");
      item.className = "seminar-item";

      const date = new Intl.DateTimeFormat(
        "en-GB",
        {
          day: "numeric",
          month: "long",
          year: "numeric"
        }
      ).format(
        new Date(`${seminar.date}T00:00:00`)
      );

      let keywords = "";

      if (
        Array.isArray(seminar.keywords) &&
        seminar.keywords.length > 0
      ) {
        keywords = `
          <p class="seminar-keywords">
            ${seminar.keywords.join(" · ")}
          </p>
        `;
      }

      item.innerHTML = `
        <p class="muted">${date}</p>

        <h3>${seminar.title}</h3>

        <p class="seminar-speaker">
          <strong>${seminar.speaker}</strong>
          ${seminar.affiliation ? ` · ${seminar.affiliation}` : ""}
        </p>

        ${
          seminar.abstract
            ? `<p class="seminar-abstract">${seminar.abstract}</p>`
            : ""
        }

        ${keywords}
      `;

      list.append(item);
    });

    container.innerHTML = "";
    container.append(list);

  } catch (error) {
    console.error(error);

    container.innerHTML = `
      <p class="muted">
        The seminar archive is temporarily unavailable.
      </p>
    `;
  }
}

loadNextSeminar();
loadPastSeminars();
