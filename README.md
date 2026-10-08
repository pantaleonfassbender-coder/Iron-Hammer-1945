# Iron Hammer, 1945

A hypothetical campaign study from the Luftwaffe's own file: Operation Eisenhammer, the planned Mistel attack on thirteen power stations of Moscow and the Upper Volga, January–April 1945.

**Read and play online:** https://iron-hammer-1945.netlify.app

The core is the file itself: two memos of 18 January and 7 February 1945 in the captured German records of the US National Archives (microfilm T-971, roll 22, item 4406/72), given in facsimile, full transcription and English translation. The first proposes the attack; the second, three weeks later, proposes to postpone it. The file also corrects a common story: the "18 Mistel" it names were delivered, not destroyed at Rechlin.

Two ways through eight chapters:

- **Read the study**: the dossier, with the file, the data, the Soviet side and a reflection; at the end the file's own plan of 18 January is computed.
- **Take the staff's seat**: decide on targets, weapon, airfields, fuel, method and, on 7 February, whether to attack at all. A model runs the plan with the file's figures, Soviet figures from the record and named assumptions, and sets the result against both.
- **Extreme what-if** (optional): a handful of He 177 / Fw 190 "Great Mistel", a project that never flew; every figure for it is an assumption.

Plates: public-domain photographs of Mistel combinations taken by the US Army and US Army Air Forces as their troops overran the airfields of central Germany in April and May 1945 (Bernburg, Merseburg, Gardelegen), swastikas masked; a drawing of the Mistel 3C; a West Point map.

## Files

- `data/file.json`: the transcription and translation of the file.
- `data/study.json`: the eight chapters.
- `data/model.json`: targets, airfields, deliveries, assumptions, Soviet figures, the what-if.
- `model.js`: the campaign model (also runs in Node: `node -e "const IH=require('./model.js'); IH.setData(require('./data/model.json')); console.log(IH.monteCarlo({decision:'file',targets:'all',fuel:'full',method:'dawn',mistel:'short'},1000))"`).
- `app.js`, `index.html`, `style.css`, `legal.html`: the site.
- `tools/make-facsimiles.py` (NARA frames → `assets/file/`), `tools/make-plates.py` (Commons, licence check, masking → `assets/plates/`), `tools/make-map.py` (Natural Earth coastline → `data/map.json`; needs shapely).

## Running locally

Any static server, e.g. `python -m http.server 8960`.

Licences: see `LICENSES.md`.
