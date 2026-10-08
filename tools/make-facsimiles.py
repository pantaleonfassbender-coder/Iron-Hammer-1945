"""Facsimiles of the Eisenhammer file: NARA RG 242, microfilm T-971 (Von Rohden collection), roll 22,
item 4406/72, catalog images 270-279 (https://catalog.archives.gov/id/316285514). The film holds
negative photostats; the pages are inverted, contrast-stretched, cropped and resized here.

Writes assets/file/<id>.jpg (pages, 1400 px wide) and assets/file/<id>-<detail>.jpg (passages).
Downloads the TIFFs (about 21 MB each) into tools/src/ once.
Run from the repository root:  python tools/make-facsimiles.py
"""
import urllib.request
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "src"
OUT = ROOT / "assets" / "file"
URL = "https://catalog.archives.gov/medialz/dc-metro/rg-242/12004872/T971/T971-0022/T971-0022-{:05d}.tif"

# id, catalog image, negative?, page crop (x0, y0, x1, y1 as fractions of the frame)
PAGES = [
    ("card", 270, False, (0.22, 0.32, 0.78, 0.56)),
    ("a1", 273, True, (0.17, 0.20, 0.97, 0.90)),
    ("a2", 274, True, (0.17, 0.20, 0.97, 0.90)),
    ("a3", 275, True, (0.17, 0.20, 0.97, 0.90)),
    ("b1", 276, True, (0.17, 0.20, 0.97, 0.90)),
    ("b2", 277, True, (0.17, 0.20, 0.97, 0.90)),
    ("b3", 278, True, (0.17, 0.20, 0.97, 0.90)),
    ("b4", 279, True, (0.17, 0.20, 0.97, 0.90)),
]

# detail passages: page id, name, crop as fractions of the PAGE image
DETAILS = [
    ("a1", "head", (0.0, 0.10, 1.0, 0.43)),
    ("a1", "effect", (0.0, 0.25, 1.0, 0.80)),
    ("a3", "proposal", (0.0, 0.44, 1.0, 0.82)),
    ("b1", "targets", (0.0, 0.0, 1.0, 0.86)),
    ("b2", "eighteen", (0.0, 0.0, 1.0, 0.30)),
    ("b2", "jumpoff", (0.0, 0.24, 1.0, 0.72)),
    ("b3", "fuel", (0.0, 0.48, 1.0, 1.0)),
    ("b4", "postpone", (0.0, 0.0, 1.0, 0.80)),
]


def frame(n):
    p = SRC / f"T971-0022-{n:05d}.tif"
    if not p.exists():
        SRC.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(URL.format(n), p)
    return Image.open(p).convert("L")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    pages = {}
    for pid, n, neg, (x0, y0, x1, y1) in PAGES:
        im = frame(n)
        if neg:
            im = ImageOps.invert(im)
        im = ImageOps.autocontrast(im, cutoff=1)
        w, h = im.size
        im = im.crop((int(w * x0), int(h * y0), int(w * x1), int(h * y1)))
        im = im.resize((1400, round(1400 * im.height / im.width)), Image.LANCZOS)
        pages[pid] = im
        im.save(OUT / f"{pid}.jpg", "JPEG", quality=72, optimize=True)
        print(pid, im.size)
    for pid, name, (x0, y0, x1, y1) in DETAILS:
        im = pages[pid]
        w, h = im.size
        im.crop((int(w * x0), int(h * y0), int(w * x1), int(h * y1))).save(OUT / f"{pid}-{name}.jpg", "JPEG", quality=78, optimize=True)
        print(" ", pid, name)


if __name__ == "__main__":
    main()
