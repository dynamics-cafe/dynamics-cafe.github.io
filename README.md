# Dynamics Cafe

Landing page for the Dynamics Cafe online seminar series.

## Adding the next seminar

Edit `data/seminars.json`. The page shows the next upcoming seminar automatically.

| Field | Meaning |
| --- | --- |
| `date`, `time`, `timezone` | e.g. `2026-11-13`, `14:00`, `Europe/Rome`. Daylight saving and each visitor's local time are handled for you. |
| `duration_minutes` | Length of the slot (default 60). |
| `title`, `speaker`, `affiliation` | Shown on the seminar card. |
| `speaker_links` | Optional list of `{ "label": "Google Scholar", "url": "..." }`, one chip per link. |
| `abstract` | Optional. A blank line starts a new paragraph. |
| `meeting_url` | The Google Meet link (only shown on the website). |
| `photo` | Optional path such as `img/speakers/first-last.jpg`. Leave it out if the speaker prefers no photo. |
| `photo_focus` | Optional. Where the face is in the photo, as percentages from the top-left, e.g. `"29% 31%"`. |
| `photo_zoom` | Optional. `1` fills the frame, `1.5` zooms in around the face. |

### Speaker photos

Put the image in `img/speakers/`. Any shape works (landscape, square, portrait): it is cropped to a portrait
frame around `photo_focus`, and the frame never shows empty edges. Use JPG, PNG or WebP at about 800-1200 px on
the long side. iPhone HEIC files are not supported by browsers: export them as JPG first.
