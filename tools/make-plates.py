"""Fetch the plates from Wikimedia Commons into assets/plates/ (<id>.jpg, max 1600 px, and <id>_t.jpg)
after checking that each file page carries a public-domain licence template, mask swastikas where the
caption says so, and write data/plates.json.  Run from the repository root:  python tools/make-plates.py
"""
import io
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageStat

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "plates"
UA = {"User-Agent": "IronHammer1945/0.1 (educational; pantaleon fassbender)"}
OK = re.compile(r"\{\{\s*(PD-|Licensed-PD|cc-zero|CC-zero|PD\b)", re.I)
BAD = re.compile(r"cc-by|GFDL", re.I)
MASKED = " The swastika on the tail is masked in this reproduction."

CREDIT = ("Plates: public-domain photographs of the US Army and US Army Air Forces (National Archives, via "
          "Wikimedia Commons), a public-domain drawing and a West Point map; each is named with its original. "
          "Resized; swastikas masked where noted.")

# id, Commons file, title, caption, masks (x0, y0, x1, y1 as fractions)
PLATES = [
    ("bernburg", "Ju 88-Fw 190 Mistel composite aircraft at Bernburg (Saale), Germany, circa in May 1945 (342-FH-3A20006-72492AC).jpg",
     "A Mistel at Bernburg",
     "US soldiers look over a Ju 88 / Fw 190 combination at Bernburg on the Saale, where the Mistel were assembled; the airfield was taken by the US First Army in mid-April 1945. The Ju 88 is a G-series aircraft with BMW 801 radial engines and still has its crew canopy, which marks a training combination. With the lengthened Ju 88 G-10 such combinations were the Mistel 3C and its trainer S3C; model-kit and decal makers identify Ju 88 G-10 Werknummern 460065 and 460066 at Bernburg, but the US caption gives neither variant nor number.",
     [(0.352, 0.585, 0.392, 0.64)]),
    ("bernburg-field", "Mistel composite aircraft at Bernburg (Saale), Germany, circa in May 1945 (342-FH-3A19967-57583AC).jpg",
     "Bernburg airfield, spring 1945",
     "Two combinations on the airfield at Bernburg after its capture, a Ju 88 in the foreground with its fighter removed and the struts still standing. Photographed for the US Army Air Forces, April or May 1945.",
     [(0.272, 0.825, 0.31, 0.89), (0.198, 0.31, 0.228, 0.36)]),
    ("merseburg", "German Mistel composite aircraft at Merseburg airfield, Germany, circa in May 1945 (342-FH-3A19978-58019AC).jpg",
     "Head on, at Merseburg",
     "A Ju 88 / Fw 190 combination at Merseburg after the airfield's capture in April 1945, with a US airman for scale. The radial engines mark a Ju 88 G: a Mistel 2 (G-1) or 3C (G-10). Another combination found at Merseburg carried the Ju 88 G-1 Werknummer 590153, a Mistel 2.",
     []),
    ("gardelegen", "German Mistel composite aircraft at Gardelegen, Germany, circa in May 1945 (204900853).jpg",
     "Hidden in the forest at Gardelegen",
     "A Fw 190 on a radial-engined Ju 88, camouflaged among the trees at Gardelegen and examined by soldiers of the 102nd Infantry Division, US Ninth Army. US troops occupied Gardelegen on 12 April 1945.",
     []),
    ("captured", "Ju 88-Fw 190 Mistel composite aircraft, 4 May 1945 (342-FH-3A16619-75946AC).jpg",
     "A 'piggy back plane', 4 May 1945",
     "A member of the 439th Troop Carrier Group, USAAF, looks over a captured Ju 88 / Fw 190 combination at an air base on 4 May 1945, among wrecks and abandoned equipment.",
     [(0.24, 0.335, 0.285, 0.39), (0.09, 0.525, 0.145, 0.61)]),
    ("inflight", "German Mistel composite aircraft are shot down over Germany on 3 February 1945 (204840840).jpg",
     "Intercepted, 3 February 1945",
     "Two Mistel combinations photographed by USAAF fighters that intercepted them, according to the caption on 3 February 1945; the place given in the caption is disputed.",
     []),
    ("threeview", "Junkers Ju 88 Mistel.jpg",
     "Mistel 3C, three views",
     "Silhouettes of the Mistel 3C: a Ju 88 G-10 with a Fw 190 on struts above it. Drawing by Greg Goebel, released into the public domain.",
     []),
    ("rechlin", "Messerschmitt Me 262 jet fighters at Rechlin-Lärz Airfield in 1944.JPG",
     "Rechlin-Lärz from the air",
     "Allied reconnaissance photograph of the airfield at Rechlin-Lärz, the Luftwaffe's test centre, in 1944. The US Eighth Air Force bombed Rechlin and Lärz on 10 April 1945.",
     []),
    ("oder", "Russian Offensive to the Oder 12 January to 30 March 1945.gif",
     "The Soviet offensive to the Oder",
     "Map of the Department of History, US Military Academy, West Point: the Soviet offensive from the Vistula to the Oder, 12 January – 30 March 1945, which took the jump-off airfields of the Eisenhammer plan one by one.",
     []),
]


def api(params):
    q = urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request("https://commons.wikimedia.org/w/api.php?" + q, headers=UA)
    for wait in (0, 20, 60):
        time.sleep(wait)
        try:
            return json.load(urllib.request.urlopen(req))
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
    raise RuntimeError("rate-limited")


def mask(im, boxes):
    if not boxes:
        return im
    d = ImageDraw.Draw(im)
    w, h = im.size
    for x0, y0, x1, y1 in boxes:
        b = (int(w * x0), int(h * y0), int(w * x1), int(h * y1))
        pad = 6
        ring = im.crop((max(0, b[0] - pad), max(0, b[1] - pad), min(w, b[2] + pad), min(h, b[3] + pad)))
        fill = tuple(int(v) for v in ImageStat.Stat(ring).median)
        d.rectangle(b, fill=fill)
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    plates = []
    for pid, fname, title, caption, boxes in PLATES:
        page = next(iter(api({"action": "query", "titles": "File:" + fname, "prop": "revisions|imageinfo",
                              "rvprop": "content", "rvslots": "main", "iiprop": "url",
                              "iiurlwidth": 1600})["query"]["pages"].values()))
        text = page["revisions"][0]["slots"]["main"]["*"]
        lic = text[text.lower().find("license"):][:600] if "license" in text.lower() else text
        assert OK.search(text) and not BAD.search(lic), f"licence not PD: {fname}"
        ii = page["imageinfo"][0]
        dest = OUT / f"{pid}.jpg"
        raw = urllib.request.urlopen(urllib.request.Request(ii.get("thumburl") or ii["url"], headers=UA)).read()
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        if im.width > 1600:
            im = im.resize((1600, round(im.height * 1600 / im.width)))
        im = mask(im, boxes)
        im.save(dest, "JPEG", quality=82, optimize=True)
        t = im.copy(); t.thumbnail((520, 520)); t.save(OUT / f"{pid}_t.jpg", "JPEG", quality=80)
        plates.append({"id": pid, "titel": title, "caption": caption + (MASKED if boxes else ""),
                       "source": f"Wikimedia Commons, File:{fname} ({ii['descriptionurl']})"})
        print(pid, dest.stat().st_size // 1024, "KB")
        time.sleep(2)
    (ROOT / "data" / "plates.json").write_text(json.dumps({"credit": CREDIT, "plates": plates}, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
