# itch.io page for Iron Hammer, 1945 — field by field

Files in this folder: `iron-hammer-1945-itch.zip` (build: `python itch/build-itch.py`; gitignored), `cover-630x500.png` (`python itch/make-cover.py`), `screenshot-1…8.png` (`python itch/make-shots.py`, needs the local server on port 8960), `description.html` (page text with the donation notice), `devlog-1.html` (first devlog). Open the .html files in the browser, mark the text below the yellow box, copy and paste into itch's editor.

| Field | Value |
|---|---|
| Title | Iron Hammer, 1945 |
| Project URL | iron-hammer-1945 |
| Short description or tagline | A hypothetical campaign study from the Luftwaffe's own file: the planned Mistel attack on Moscow's power stations, 1945. Read the dossier or take the staff's seat. |
| Classification | Games |
| Kind of project | HTML |
| Release status | Released (or Prototype) |
| **Pricing** | **$0 or donate** · Suggested donation **$3** (any amount; free download stays possible) |
| **Payment / support** | Under *Pricing*, tick the option that shows a donation prompt (*"Ask for donation when downloading"* / *"Show the donation popup"* where offered). Connect PayPal or Stripe under *Settings → Payment* if not done yet. |
| Uploads | iron-hammer-1945-itch.zip → tick **This file will be played in the browser** |
| Embed options | Embed in page · Viewport **1366 × 850** (or Click to launch in fullscreen) |
| Frame options | ☑ Fullscreen button · ☑ Enable scrollbars · ☐ Mobile friendly · ☐ Automatically start on page load |
| Genre | Simulation (or Educational) |
| Tags | historical, world-war-ii, alternate-history, documentary, simulation, educational, strategy, singleplayer, turn-based, history |
| AI generation disclosure | Yes — code and text. The documents are archival records, the plates public-domain photographs; the cover uses an archival facsimile and a public-domain silhouette, not an AI image. |
| Languages | English |
| Inputs | Mouse |
| Community | Comments |
| Visibility & access | Draft → check the page → Public |
| Cover image | cover-630x500.png |
| Screenshots | 3-decision, 4-file, 2-chapter, 6-accounting, 5-strike, 7-plates (1-start and 8-data in reserve) |

**The donation notice in the study itself:** the itch build sets `window.IH_ITCH = true`; the start page and the accounting then show "This study is free … please support it with a donation: use the Support / donate button on this itch.io page." The Netlify version shows a link to the itch page once `ITCH_URL` in `app.js` is set.

The itch build leaves out `legal.html` (its privacy notice describes the copy on Netlify); the study stores only its decisions in the browser and loads nothing from other servers.

When the page is live, tell me the final URL: `ITCH_URL` in `app.js`, the README and the footer will link it, and the itch profile text gets a new line. The Netlify site can then be connected to the repository.
