const SEMINARS_FILE = "data/seminars.json";

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


    const date = new Intl.DateTimeFormat(
      "en-GB",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    ).format(
      new Date(`${nextSeminar.date}T00:00:00`)
    );


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
        <strong>${date}</strong>
        ${nextSeminar.time ? ` · ${nextSeminar.time}` : ""}
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
