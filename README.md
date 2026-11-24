# Dynamics Cafe

Landing page for the Dynamics Cafe online seminar series.

## Adding the next seminar

Edit `data/seminars.json`. The page opens on the next upcoming seminar automatically. Past seminars are on its left; later announced seminars are on its right, followed by a "Brewing…" card with the next free date (second Friday of the month). Its doodle cycles through brewing methods from around the world, drawn in `js/brew.js`. Its doodle cycles through brewing methods from around the world; they are drawn in .

| Field | Meaning |
| --- | --- |
| `date`, `time`, `timezone` | e.g. `2026-11-13`, `14:00`, `Europe/Rome`. Daylight saving and each visitor's local time are handled for you. |
| `duration_minutes` | Length of the slot (default 60). |
| `title`, `speaker` | Shown on the seminar card. |
| `affiliation` | A list of lines, written as on the LinkedIn cards: the unit (if any), the institution with its acronym in brackets, then "City, Country". Example: `["MathLab", "International School for Advanced Studies (SISSA)", "Trieste, Italy"]`. |
| `speaker_links` | Optional list of `{ "label": "Google Scholar", "url": "..." }`, one chip per link. |
| `abstract` | Optional. A blank line starts a new paragraph. |
| `meeting_url` | The Google Meet link (only shown on the website). |
| `photo` | Optional link to the photo in the `speaker-photos` release (see below). Leave it out if the speaker prefers no photo. |
| `photo_focus` | Optional. Where the face is in the photo, as percentages from the top-left, e.g. `"29% 31%"`. |
| `photo_zoom` | Optional. `1` fills the frame, `1.5` zooms in around the face. |

### Speaker photos

**Never commit speaker photos to the repository.** Anything committed stays in the git history, so a
speaker who later asks to be removed could only be erased by rewriting history. Photos live in the
GitHub release called `speaker-photos` instead, which is not part of the history:

1. On GitHub, open Releases, then the `speaker-photos` release, then Edit.
2. Drag the photo in (name it `first-last.webp` or `.jpg`) and click Update release.
3. In `data/seminars.json`, set `photo` to
   `https://github.com/dynamics-cafe/dynamics-cafe.github.io/releases/download/speaker-photos/first-last.webp`.

To remove a photo, delete its file from the release and remove the `photo` line. If the file is missing,
the card simply shows no portrait.

Any shape works (landscape, square, portrait): it is cropped to a portrait
frame around `photo_focus`, and the frame never shows empty edges. Use JPG, PNG or WebP at about 800-1200 px on
the long side. iPhone HEIC files are not supported by browsers: export them as JPG first.

## About this website

This website was built by the Dynamics Cafe organisers with the help of an AI coding assistant
(Claude, by Anthropic). The organisers made the design decisions and chose the content; the code was
written by the assistant. The organisers review and maintain it, and are responsible for what it says.
The footer credit reads: "Human taste, Claude's code, a lot of coffee".

## Link preview and logo files

When the site link is shared (Google Chat, WhatsApp, LinkedIn, email), apps show `img/preview-card.jpg`, a
2400x1260 card (the standard 1.91:1 shape, at double resolution) set in the `og:image` tags of `index.html`. Keep that file small (well under 1 MB):
when a preview image is too large, apps pick a photo from the page instead. After changing it, rename
the file or add `?v=2` to the shared link, since apps cache old previews.

`logo.png` is the full-size original (1.4 MB). The page itself uses the small copies
`img/logo-256.webp` (header) and `img/favicon-192.png` (browser tab icon).
